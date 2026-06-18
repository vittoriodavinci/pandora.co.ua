const ALLOWED_ORIGINS = new Set([
  "https://pandora.co.ua",
  "https://www.pandora.co.ua"
]);

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 500;
const MAX_MESSAGES = 8;
const MAX_CONTENT_LENGTH = 2000;
const MAX_TOTAL_CONTENT_LENGTH = 6000;
const CORE_SOURCE = "pandora_website_bot_public_core_v0_1.md";
const MAX_DIRECT_CORE_CHUNKS = 9;
const MAX_DIRECT_CORE_CHARS = 10000;
const SYSTEM_PROMPT = [
  "You are the official assistant for Pandora / USEN Pandora on pandora.co.ua.",
  "Answer only in the context of the cooperative Pandora / USEN Pandora project when the user asks about this site, Pandora ID, USEN, membership, shares, or the cooperative.",
  "Do not confuse Pandora / USEN Pandora with Pandora Music, Pandora Jewelry, Pandora Alarm, Avatar, or the mythological Pandora.",
  "If the user asks about differences, briefly explain the name overlap and return focus to the cooperative Pandora / USEN Pandora project.",
  "Answer in the same language as the user's latest message. If the user writes in Russian, answer in Russian. If the user writes in Ukrainian, answer in Ukrainian.",
  "Do not add generic support endings like 'Any other questions?', 'Є ще питання?', or similar unless the user directly asks for follow-up options.",
  "Keep answers direct, practical, and concise. Avoid decorative marketing tone."
].join(" ");
const RAG_UNAVAILABLE_MESSAGE = "База знаний Pandora сейчас недоступна. Я не могу отвечать как проектный ассистент без документов.";
const RAG_EMPTY_MESSAGE = "В базе Pandora не найдено достаточно данных по этому вопросу.";

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

function getPublicMatches(matches) {
  if (!Array.isArray(matches)) return [];

  return matches
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => match.metadata && match.metadata.visibility === "public")
    .sort((a, b) => {
      const aCore = a.match.metadata.source_type === "core" ? 1 : 0;
      const bCore = b.match.metadata.source_type === "core" ? 1 : 0;
      if (aCore !== bCore) return bCore - aCore;

      const aPriority = Number(a.match.metadata.priority || 0);
      const bPriority = Number(b.match.metadata.priority || 0);
      if (aPriority !== bPriority) return bPriority - aPriority;

      return a.index - b.index;
    })
    .map(({ match }) => match);
}

function limitDirectCoreChunks(chunks) {
  const limited = [];
  let totalLength = 0;

  for (const chunk of chunks.slice(0, MAX_DIRECT_CORE_CHUNKS)) {
    const contentLength = String(chunk.content || "").length;
    if (limited.length > 0 && totalLength + contentLength > MAX_DIRECT_CORE_CHARS) {
      break;
    }

    limited.push(chunk);
    totalLength += contentLength;
  }

  return limited;
}

function mergeContextChunks(directCoreChunks, vectorChunks) {
  const merged = [];
  const seen = new Set();

  for (const chunk of [...directCoreChunks, ...vectorChunks]) {
    const metadata = chunk.metadata || {};
    const key = `${metadata.source_id || metadata.source || ""}:${metadata.chunk_index ?? ""}`;
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(chunk);
  }

  return merged;
}

function buildRagContext(matches) {
  if (!matches.length) return "";

  const chunks = matches.map(match => {
    const metadata = match.metadata || {};
    const source = metadata.source ? `[${metadata.source}]` : "";
    return `${source}\n${match.content}`;
  }).join("\n\n---\n\n");

  return [
    "",
    "",
    "RELEVANT INFORMATION FROM THE PANDORA KNOWLEDGE BASE:",
    chunks,
    "",
    "Use this knowledge base context for the answer.",
    "If the context is not enough, say that the knowledge base does not contain enough information instead of inventing details.",
    "Remember: Pandora / USEN Pandora on pandora.co.ua is a cooperative socio-economic project, not Pandora Music, Pandora Jewelry, Pandora Alarm, Avatar, or the mythological Pandora."
  ].join("\n");
}

function assistantTextResponse(text) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ]
  };
}

async function fetchDirectCoreChunks(env) {
  const baseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const params = new URLSearchParams({
    select: "content,metadata"
  });
  params.append("metadata->>source", `eq.${CORE_SOURCE}`);
  params.append("metadata->>visibility", "eq.public");
  params.append("metadata->>source_type", "eq.core");

  const res = await fetch(`${baseUrl}/rest/v1/documents?${params.toString()}`, {
    headers: {
      "apikey": env.SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SECRET_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error(`Supabase core read failed: ${res.status}`);
  }

  const rows = await res.json();
  return limitDirectCoreChunks(
    (Array.isArray(rows) ? rows : [])
      .sort((a, b) => Number(a.metadata && a.metadata.chunk_index || 0) - Number(b.metadata && b.metadata.chunk_index || 0))
  );
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
  let ragContext;

  console.log("RAG_START");
  try {
    const directCoreChunks = await fetchDirectCoreChunks(env);

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

    if (!voyageRes.ok) {
      throw new Error(`Voyage request failed: ${voyageRes.status}`);
    }

    const voyageData = await voyageRes.json();
    const queryEmbedding = voyageData.data[0].embedding;

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

    if (!matchRes.ok) {
      throw new Error(`Supabase match failed: ${matchRes.status}`);
    }

    const matches = await matchRes.json();
    const vectorPublicMatches = getPublicMatches(matches);
    const contextChunks = mergeContextChunks(directCoreChunks, vectorPublicMatches);

    if (!contextChunks.length) {
      console.log("RAG_EMPTY");
      return jsonResponse(assistantTextResponse(RAG_EMPTY_MESSAGE), 200, corsHeaders);
    }

    console.log("RAG_CHUNKS_FOUND", {
      count: contextChunks.length,
      sources: [...new Set(contextChunks.map(chunk => chunk.metadata && chunk.metadata.source).filter(Boolean))]
    });
    ragContext = buildRagContext(contextChunks);
  } catch (e) {
    console.error("RAG_ERROR", e instanceof Error ? e.message : String(e));
    return jsonResponse(assistantTextResponse(RAG_UNAVAILABLE_MESSAGE), 200, corsHeaders);
  }

  const systemWithRag = (env.PANDORA_SYSTEM_PROMPT || SYSTEM_PROMPT) + ragContext;

  try {
    console.log("ANTHROPIC_START");
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
      console.error("ANTHROPIC_ERROR", `HTTP ${anthropicRes.status}`);
      return jsonResponse({ error: "Upstream request failed" }, 502, corsHeaders);
    }

    const data = await anthropicRes.json();
    return jsonResponse(data, 200, corsHeaders);
  } catch (e) {
    console.error("ANTHROPIC_ERROR", e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: "Upstream request failed" }, 502, corsHeaders);
  }
}
