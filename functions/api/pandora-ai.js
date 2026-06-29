const ALLOWED_ORIGINS = new Set([
  "https://pandora.co.ua",
  "https://www.pandora.co.ua",
  "https://content-usen-reframe-cabinet.pandora-f2d.pages.dev"
]);

const DEFAULT_MODEL = "gpt-5.5";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONVERSATION_ID_LENGTH = 100;
const RETRY_DELAYS_MS = [1500, 3000];
const FALLBACK_MESSAGE = "Сейчас AI-помощник временно перегружен. Попробуйте ещё раз через минуту.";

const FREE_MODEL_INSTRUCTIONS = `You are Pandora AI Cooperative Assistant.
You are a thoughtful cooperative assistant, not a narrow FAQ bot.
Always answer in the language used by the user.
Use the context below (from the official Pandora knowledge base) for factual claims about Pandora and cooperative materials.
The current user is a guest. Use only public, safe knowledge from the connected public vector store.
Do not expose internal chunks, vector store IDs, raw retrieval output, internal identifiers, or service filenames unless a source name is genuinely needed for a useful citation.
If the available information is insufficient, say so briefly and calmly. Do not invent facts.
Do not promise income, returns, profit, dividends, or financial outcomes.
Do not present drafts or general information as final legal documents or final legal advice.
Do not automatically accept, register, verify, or represent anyone as a cooperative member.
Do not claim to change the website, delete documents, modify records, or perform actions outside this conversation.
Do not make legal assertions without verification. Clearly distinguish general information from verified legal conclusions.
Keep answers clear, practical, respectful, and reasonably concise.

Below is the relevant context from the Pandora knowledge base. Use it to answer the user's question.
If no context is provided, say that you could not find relevant information and invite the user to rephrase.

--- Context from knowledge base ---
`;

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

// ---- OpenAI Vector Store search (stage 1) ----

async function readOpenAiError(response) {
  try {
    const data = await response.json();
    return data && data.error ? data.error : {};
  } catch {
    return {};
  }
}

function shouldRetry(response, error) {
  const type = String(error && error.type || "").toLowerCase();
  const code = String(error && error.code || "").toLowerCase();
  if (type === "insufficient_quota" || code === "insufficient_quota") return false;
  return response.status === 429
    || type.includes("rate_limit")
    || code.includes("rate_limit")
    || type.includes("too_many_requests")
    || code.includes("too_many_requests");
}

async function searchVectorStore(apiKey, vectorStoreId, query) {
  // Use Responses API with file_search for retrieval (proven to work)
  const url = "https://api.openai.com/v1/responses";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: query,
        instructions: "Search the knowledge base and provide the relevant information about Pandora concisely.",
        tools: [{
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          max_num_results: 5
        }],
        max_output_tokens: 300
      })
    });

    if (response.ok) {
      return response;
    }

    const error = await readOpenAiError(response);
    const retryDelay = RETRY_DELAYS_MS[attempt];
    if (retryDelay === undefined || !shouldRetry(response, error)) {
      return null;
    }

    await sleep(retryDelay);
  }

  return null;
}

function extractChunks(responseData) {
  if (!responseData || !Array.isArray(responseData.output)) return [];

  const chunks = [];
  for (const item of responseData.output) {
    if (!item || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content && content.type === "output_text" && typeof content.text === "string") {
        const text = content.text.trim();
        if (text) chunks.push(text);
      }
    }
  }

  return chunks;
}

function extractSourcesFromSearch(responseData) {
  if (!responseData || !Array.isArray(responseData.output)) return [];

  const seen = new Set();
  const sources = [];

  for (const item of responseData.output) {
    if (!item || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      const annotations = Array.isArray(content && content.annotations) ? content.annotations : [];
      for (const annotation of annotations) {
        if (!annotation || annotation.type !== "file_citation") continue;
        const title = typeof annotation.filename === "string" ? annotation.filename.trim() : "";
        const normalized = title.toLowerCase();
        const looksInternal = title.startsWith(".") || title.startsWith("_")
          || /(internal|service|system|prompt|config)/i.test(normalized);
        if (title && !looksInternal && !seen.has(title)) {
          seen.add(title);
          sources.push({ title });
        }
      }
    }
  }

  return sources;
}

// ---- FreeModel generation (stage 2) ----

async function requestFreeModel(apiKey, model, messages) {
  const url = "https://api.freemodel.dev/v1/chat/completions";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 500
      })
    });

    if (response.ok) {
      return response;
    }

    const error = await readOpenAiError(response);
    const retryDelay = RETRY_DELAYS_MS[attempt];
    if (retryDelay === undefined || !shouldRetry(response, error)) {
      return null;
    }

    await sleep(retryDelay);
  }

  return null;
}

function extractFreeModelAnswer(responseData) {
  if (!responseData || !Array.isArray(responseData.choices)) return "";

  const choice = responseData.choices[0];
  if (!choice || !choice.message || typeof choice.message.content !== "string") return "";

  return choice.message.content.trim();
}

// ---- Request logging ----

function requestLog(role, mode, phase, success, error = false) {
  const entry = {
    timestamp: new Date().toISOString(),
    role,
    mode,
    phase,
    success,
    status: success ? "success" : "error"
  };

  if (error) {
    console.error("PANDORA_AI_REQUEST", entry);
  } else {
    console.log("PANDORA_AI_REQUEST", entry);
  }
}

// ---- Request validation ----

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

  return { message, mode, role, conversationId };
}

// ---- Main handler ----

export async function onRequest(context) {
  const corsHeaders = getCorsHeaders(context.request);
  if (corsHeaders === null) {
    return new Response("Forbidden", { status: 403 });
  }

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { "Allow": "POST, OPTIONS", ...corsHeaders }
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

  // ---- Env check ----

  const openAiApiKey = context.env.OPENAI_API_KEY;
  const vectorStoreId = context.env.OPENAI_VECTOR_STORE_ID;
  const freeModelApiKey = context.env.FREEMODEL_API_KEY;
  const freeModelName = context.env.FREEMODEL_MODEL || DEFAULT_MODEL;

  if (!openAiApiKey || !vectorStoreId || !freeModelApiKey) {
    requestLog(role, mode, "env", false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources: []
    }, 503, corsHeaders);
  }

  // ---- Stage 1: OpenAI Vector Store search ----

  requestLog(role, mode, "search", true);

  let searchResponse;
  try {
    searchResponse = await searchVectorStore(openAiApiKey, vectorStoreId, message);
  } catch {
    requestLog(role, mode, "search", false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources: []
    }, 503, corsHeaders);
  }

  if (!searchResponse) {
    requestLog(role, mode, "search", false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources: []
    }, 503, corsHeaders);
  }

  let searchData;
  try {
    searchData = await searchResponse.json();
  } catch {
    requestLog(role, mode, "search_parse", false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources: []
    }, 503, corsHeaders);
  }

  const chunks = extractChunks(searchData);
  const sources = extractSourcesFromSearch(searchData);

  if (chunks.length === 0) {
    requestLog(role, mode, "search", false);
    return jsonResponse({
      ok: false,
      answer: "Я не нашёл подходящей информации в базе знаний Pandora по вашему вопросу. Попробуйте переформулировать запрос.",
      conversation_id: conversationId || null,
      sources: []
    }, 200, corsHeaders);
  }

  // ---- Stage 2: FreeModel generation ----

  requestLog(role, mode, "generate", true);

  const contextText = chunks.join("\n\n---\n\n");
  const systemMessage = FREE_MODEL_INSTRUCTIONS + "\n" + contextText;

  const freeModelMessages = [
    { role: "system", content: systemMessage },
    { role: "user", content: message }
  ];

  let fmResponse;
  try {
    fmResponse = await requestFreeModel(freeModelApiKey, freeModelName, freeModelMessages);
  } catch {
    requestLog(role, mode, "generate", false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources
    }, 503, corsHeaders);
  }

  if (!fmResponse) {
    requestLog(role, mode, "generate", false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources
    }, 503, corsHeaders);
  }

  let fmData;
  try {
    fmData = await fmResponse.json();
  } catch {
    requestLog(role, mode, "generate_parse", false, true);
    return jsonResponse({
      ok: false,
      answer: FALLBACK_MESSAGE,
      conversation_id: conversationId || null,
      sources
    }, 503, corsHeaders);
  }

  const answer = extractFreeModelAnswer(fmData);

  if (!answer) {
    const errMsg = fmData && fmData.error ? JSON.stringify(fmData.error) : "пустой ответ";
    requestLog(role, mode, "generate", false, true);
    return jsonResponse({
      ok: false,
      answer: "FreeModel ошибка: " + errMsg,
      conversation_id: conversationId || null,
      sources
    }, 503, corsHeaders);
  }

  requestLog(role, mode, "complete", true);
  return jsonResponse({
    ok: true,
    answer,
    conversation_id: conversationId || null,
    sources
  }, 200, corsHeaders);
}
