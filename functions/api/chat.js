const ALLOWED_ORIGINS = new Set([
  "https://pandora.co.ua",
  "https://www.pandora.co.ua"
]);

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 500;
const MAX_MESSAGES = 8;
const MAX_CONTENT_LENGTH = 2000;
const MAX_TOTAL_CONTENT_LENGTH = 6000;
const SYSTEM_PROMPT = "You are Pandora's helpful assistant. Answer briefly and safely using the provided context when relevant.";

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  if (!ALLOWED_ORIGINS.has(origin)) return null;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(data, status, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null;
  }

  let totalLength = 0;
  const normalized = [];

  for (const message of messages) {
    if (!message || (message.role !== "user" && message.role !== "assistant")) {
      return null;
    }
    if (typeof message.content !== "string" || message.content.length > MAX_CONTENT_LENGTH) {
      return null;
    }

    totalLength += message.content.length;
    if (totalLength > MAX_TOTAL_CONTENT_LENGTH) {
      return null;
    }

    normalized.push({
      role: message.role,
      content: message.content
    });
  }

  const lastUserMessage = [...normalized].reverse().find(message => message.role === "user");
  if (!lastUserMessage || lastUserMessage.content.trim().length === 0) {
    return null;
  }

  return {
    messages: normalized,
    userQuestion: lastUserMessage.content.trim()
  };
}

export async function onRequest(context) {
  const corsHeaders = getCorsHeaders(context.request);
  if (corsHeaders === null) {
    return new Response("Forbidden", { status: 403 });
  }

  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Allow": "POST, OPTIONS",
        ...corsHeaders
      }
    });
  }

  const env = context.env;

  const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;
  const VOYAGE_API_KEY = env.VOYAGE_API_KEY;

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid request" }, 400, corsHeaders);
  }

  const validated = validateMessages(body.messages);
  if (!validated) {
    return jsonResponse({ error: "Invalid messages" }, 400, corsHeaders);
  }

  const { messages, userQuestion } = validated;

  // --- Шаг 1: Получить embedding вопроса через Voyage AI ---
  let ragContext = "";
  try {
    const voyageRes = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOYAGE_API_KEY}`
      },
      body: JSON.stringify({
        input: [userQuestion],
        model: "voyage-3-lite"
      })
    });

    const voyageData = await voyageRes.json();
    const queryEmbedding = voyageData.data[0].embedding;

    // --- Шаг 2: Найти похожие куски в Supabase ---
    const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`
      },
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 4
      })
    });

    const matches = await matchRes.json();

    if (Array.isArray(matches) && matches.length > 0) {
      const chunks = matches.map(m => {
        const source = m.metadata && m.metadata.source ? `[${m.metadata.source}]` : "";
        return `${source}\n${m.content}`;
      }).join("\n\n---\n\n");

      ragContext = `\n\nРЕЛЕВАНТНА ІНФОРМАЦІЯ З БАЗИ ЗНАНЬ:\n${chunks}\n\nВикористовуй цю інформацію для відповіді, якщо вона стосується питання.`;
    }
  } catch (e) {
    console.log("RAG error:", e.message);
  }

  // --- Шаг 3: Отправить в Claude с контекстом ---
  const systemWithRag = (env.PANDORA_SYSTEM_PROMPT || SYSTEM_PROMPT) + ragContext;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemWithRag,
        messages: messages
      })
    });

    if (!anthropicRes.ok) {
      return jsonResponse({ error: "Upstream request failed" }, 502, corsHeaders);
    }

    const data = await anthropicRes.json();

    return jsonResponse(data, 200, corsHeaders);
  } catch (e) {
    console.log("Anthropic error:", e.message);
    return jsonResponse({ error: "Upstream request failed" }, 502, corsHeaders);
  }
}
