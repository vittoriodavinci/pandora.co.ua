const ALLOWED_ORIGINS = new Set([
  "https://pandora.co.ua",
  "https://www.pandora.co.ua"
]);

const DEFAULT_MODEL = "gpt-5.5";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONVERSATION_ID_LENGTH = 100;
const OPENAI_RETRY_DELAYS_MS = [1500, 3000];
const FALLBACK_MESSAGE = "Сейчас AI-помощник временно перегружен. Попробуйте ещё раз через минуту.";
const INSTRUCTIONS = [
  "You are Pandora AI Cooperative Assistant.",
  "You are a thoughtful cooperative assistant, not a narrow FAQ bot.",
  "Always answer in the language used by the user.",
  "Use the connected file search knowledge base for factual claims about Pandora and cooperative materials.",
  "The current user is a guest. Use only public, safe knowledge from the connected public vector store.",
  "Do not expose internal chunks, vector store IDs, raw retrieval output, internal identifiers, or service filenames unless a source name is genuinely needed for a useful citation.",
  "If the available information is insufficient, say so briefly and calmly. Do not invent facts.",
  "Do not promise income, returns, profit, dividends, or financial outcomes.",
  "Do not present drafts or general information as final legal documents or final legal advice.",
  "Do not automatically accept, register, verify, or represent anyone as a cooperative member.",
  "Do not claim to change the website, delete documents, modify records, or perform actions outside this conversation.",
  "Do not make legal assertions without verification. Clearly distinguish general information from verified legal conclusions.",
  "Keep answers clear, practical, respectful, and reasonably concise."
].join("\n");

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
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readOpenAiError(response) {
  try {
    const data = await response.json();
    return data && data.error ? data.error : {};
  } catch {
    return {};
  }
}

function shouldRetryOpenAi(response, error) {
  const type = String(error && error.type || "").toLowerCase();
  const code = String(error && error.code || "").toLowerCase();

  if (type === "insufficient_quota" || code === "insufficient_quota") {
    return false;
  }

  return response.status === 429
    || type.includes("rate_limit")
    || code.includes("rate_limit")
    || type.includes("too_many_requests")
    || code.includes("too_many_requests");
}

async function requestOpenAi(apiKey, requestBody) {
  for (let attempt = 0; attempt <= OPENAI_RETRY_DELAYS_MS.length; attempt++) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      return response;
    }

    const error = await readOpenAiError(response);
    const retryDelay = OPENAI_RETRY_DELAYS_MS[attempt];
    if (retryDelay === undefined || !shouldRetryOpenAi(response, error)) {
      return null;
    }

    await sleep(retryDelay);
  }

  return null;
}

function requestLog(role, mode, success, error = false) {
  const entry = {
    timestamp: new Date().toISOString(),
    role,
    mode,
    success,
    status: success ? "success" : "error"
  };

  if (error) {
    console.error("PANDORA_AI_REQUEST", entry);
  } else {
    console.log("PANDORA_AI_REQUEST", entry);
  }
}

function normalizeRequest(body) {
  if (!body || typeof body !== "object") return null;

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const mode = typeof body.mode === "string" ? body.mode : "ai";
  const role = typeof body.role === "string" ? body.role : "guest";
  const conversationId = typeof body.conversation_id === "string"
    ? body.conversation_id.trim()
    : "";

  if (!message || message.length > MAX_MESSAGE_LENGTH) return null;
  if (mode !== "ai" || role !== "guest") return null;
  if (conversationId.length > MAX_CONVERSATION_ID_LENGTH) return null;
  if (conversationId && !/^resp_[A-Za-z0-9_-]+$/.test(conversationId)) return null;

  return {
    message,
    mode,
    role,
    conversationId
  };
}

function extractAnswer(responseData) {
  if (typeof responseData.output_text === "string" && responseData.output_text.trim()) {
    return responseData.output_text.trim();
  }

  const output = Array.isArray(responseData.output) ? responseData.output : [];
  const parts = [];

  for (const item of output) {
    if (item && item.type === "message" && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (content && content.type === "output_text" && typeof content.text === "string") {
          parts.push(content.text);
        }
      }
    }
  }

  return parts.join("\n").trim();
}

function extractSources(responseData) {
  const output = Array.isArray(responseData.output) ? responseData.output : [];
  const seen = new Set();
  const sources = [];

  for (const item of output) {
    if (!item || item.type !== "message" || !Array.isArray(item.content)) continue;

    for (const content of item.content) {
      const annotations = Array.isArray(content && content.annotations)
        ? content.annotations
        : [];

      for (const annotation of annotations) {
        if (!annotation || annotation.type !== "file_citation") continue;
        const title = typeof annotation.filename === "string"
          ? annotation.filename.trim()
          : "";
        const normalizedTitle = title.toLowerCase();
        const looksInternal = title.startsWith(".")
          || title.startsWith("_")
          || /(internal|service|system|prompt|config)/i.test(normalizedTitle);
        if (!title || looksInternal || seen.has(title)) continue;

        seen.add(title);
        sources.push({ title });
      }
    }
  }

  return sources;
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

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request" }, 400, corsHeaders);
  }

  const requestData = normalizeRequest(body);
  if (!requestData) {
    return jsonResponse({ ok: false, error: "Invalid request" }, 400, corsHeaders);
  }

  const { message, mode, role, conversationId } = requestData;
  const apiKey = context.env.OPENAI_API_KEY;
  const vectorStoreId = context.env.OPENAI_VECTOR_STORE_ID;
  const model = context.env.PANDORA_AI_MODEL || DEFAULT_MODEL;

  if (!apiKey || !vectorStoreId) {
    requestLog(role, mode, false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources: []
    }, 503, corsHeaders);
  }

  const openAiRequest = {
    model,
    instructions: INSTRUCTIONS,
    input: message,
    tools: [
      {
        type: "file_search",
        vector_store_ids: [vectorStoreId],
        max_num_results: 8
      }
    ],
    text: {
      verbosity: "low"
    },
    max_output_tokens: 700,
    store: true
  };

  if (conversationId) {
    openAiRequest.previous_response_id = conversationId;
  }

  try {
    const openAiResponse = await requestOpenAi(apiKey, openAiRequest);
    if (!openAiResponse) {
      requestLog(role, mode, false, true);
      return jsonResponse({
        ok: false,
        answer: FALLBACK_MESSAGE,
        conversation_id: conversationId || null,
        sources: []
      }, 503, corsHeaders);
    }

    const responseData = await openAiResponse.json();
    const answer = extractAnswer(responseData);

    if (!answer) {
      requestLog(role, mode, false, true);
      return jsonResponse({
        ok: false,
        answer: FALLBACK_MESSAGE,
        conversation_id: conversationId || null,
        sources: []
      }, 503, corsHeaders);
    }

    requestLog(role, mode, true);
    return jsonResponse({
      ok: true,
      answer,
      conversation_id: responseData.id || conversationId || null,
      sources: extractSources(responseData)
    }, 200, corsHeaders);
  } catch {
    requestLog(role, mode, false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources: []
    }, 503, corsHeaders);
  }
}
