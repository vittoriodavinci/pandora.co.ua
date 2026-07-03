const ALLOWED_ORIGINS = new Set([
  "https://pandora.co.ua",
  "https://www.pandora.co.ua",
  "https://content-usen-reframe-cabinet.pandora-f2d.pages.dev"
]);

const DEFAULT_MODEL = "gpt-5.5";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONVERSATION_ID_LENGTH = 100;
const OPENAI_RETRY_DELAYS_MS = [1500, 3000];
const FREEMODEL_RETRY_DELAYS_MS = [1200];
const FREEMODEL_TIMEOUT_MS = 25000;
const FALLBACK_MESSAGE = "AI-помощник временно не смог ответить. Повторите запрос через несколько секунд.";

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

Behavioral style layer:
- You may answer broad life questions, but do not leave them as neutral generic advice.
- First give a short, human, practical answer to the user's actual question.
- Then, when honest and relevant, connect the answer to Pandora as a practical life environment: cooperation, trust, family, mutual help, lower costs, non-political participation, shared infrastructure, and member agency.
- Do not promise guaranteed income, relationships, family, happiness, health, legal outcomes, or personal success.
- Do not provide manipulative, harmful, coercive, sexual-pressure, exploitative, illegal, or unsafe instructions.
- For relationship questions, answer through consent, respect, trust, dignity, and healthy social environments — never through seduction at any cost.
- For money questions, answer through cooperative saving, participation, shared infrastructure, and realistic contribution — never through guaranteed profit or investment promises.
- Pandora should appear as a grounded practical context, not as propaganda, magic, ideology, or a solution to every personal problem.

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

  for (let attempt = 0; attempt <= OPENAI_RETRY_DELAYS_MS.length; attempt++) {
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
      return { response, status: response.status, attempts: attempt + 1 };
    }

    const error = await readOpenAiError(response);
    const retryDelay = OPENAI_RETRY_DELAYS_MS[attempt];
    if (retryDelay === undefined || !shouldRetry(response, error)) {
      return {
        response: null,
        status: response.status,
        attempts: attempt + 1,
        error_type: "openai_file_search_error"
      };
    }

    await sleep(retryDelay);
  }

  return { response: null, status: 0, attempts: OPENAI_RETRY_DELAYS_MS.length + 1, error_type: "openai_file_search_error" };
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

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestFreeModel(apiKey, model, messages) {
  const url = "https://api.freemodel.dev/v1/chat/completions";

  for (let attempt = 0; attempt <= FREEMODEL_RETRY_DELAYS_MS.length; attempt++) {
    let response;
    try {
      response = await fetchWithTimeout(url, {
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
      }, FREEMODEL_TIMEOUT_MS);
    } catch (error) {
      const isTimeout = error && error.name === "AbortError";
      const retryDelay = FREEMODEL_RETRY_DELAYS_MS[attempt];
      if (!isTimeout || retryDelay === undefined) {
        return {
          response: null,
          status: 0,
          attempts: attempt + 1,
          error_type: isTimeout ? "freemodel_timeout" : "freemodel_fetch_error"
        };
      }
      await sleep(retryDelay);
      continue;
    }

    if (response.ok) {
      return { response, status: response.status, attempts: attempt + 1 };
    }

    const retryDelay = FREEMODEL_RETRY_DELAYS_MS[attempt];
    const shouldRetryFreeModel = response.status === 503;
    if (!shouldRetryFreeModel || retryDelay === undefined) {
      return {
        response: null,
        status: response.status,
        attempts: attempt + 1,
        error_type: response.status === 503 ? "freemodel_503" : "freemodel_error"
      };
    }

    await sleep(retryDelay);
  }

  return { response: null, status: 0, attempts: FREEMODEL_RETRY_DELAYS_MS.length + 1, error_type: "freemodel_error" };
}

function extractFreeModelAnswer(responseData) {
  if (!responseData || !Array.isArray(responseData.choices)) return "";

  const choice = responseData.choices[0];
  if (!choice || !choice.message || typeof choice.message.content !== "string") return "";

  return choice.message.content.trim();
}

function getDirectBehavioralAnswer(message) {
  const normalized = String(message || "").toLowerCase();
  const looksLikeManipulativeRelationshipRequest = /(соблазн|соблазнить|соблазню|пикап|развести\s+на|продавить\s+девуш|уговорить\s+девуш)/i.test(normalized);
  if (looksLikeManipulativeRelationshipRequest) {
    return "Лучше думать не о манипуляции, а о взаимном интересе, уважении и доверии. Если человек не хочет общения или близости — это нужно принять.\n\nЗдоровый путь — нормально познакомиться, быть честным, слушать границы другого человека и не давить. Близкие отношения строятся не на приёмах, а на согласии, достоинстве и взаимности.\n\nВ логике Pandora семья, дружба и близкие связи важны как часть устойчивой жизни: меньше одиночества, меньше хаоса, больше круга людей, совместных проектов и взаимопомощи. Pandora не гарантирует отношения или личное счастье, но стремится создавать среду, где людям проще строить человеческие связи без давления и манипуляций.";
  }

  const looksLikeFriendshipRequest = /(найти\s+друз|найти\s+друга|друзей|дружб|одинок|одиночеств)/i.test(normalized);
  if (looksLikeFriendshipRequest) {
    return "Друзей проще находить не через разовый разговор, а через регулярную среду: общие дела, интересы, помощь, встречи, обучение, спорт, волонтёрство или совместные проекты.\n\nНачните с малого: выберите место или сообщество, куда можно приходить регулярно, общайтесь без давления, предлагайте помощь и смотрите на взаимность. Настоящая дружба строится на уважении, доверии и повторяющемся контакте.\n\nВ этом смысле Pandora важна не как гарантия дружбы, а как практичная среда: кооперация, общие задачи, взаимопомощь, совместные проекты и круг людей, которые не просто потребляют, а участвуют. В такой среде людям легче знакомиться естественно — через дело, доверие и общую пользу.";
  }

  const looksLikePandoraDefinitionRequest = /(что\s+такое\s+pandora|что\s+такое\s+пандора|расскажи\s+про\s+pandora|расскажи\s+про\s+пандор)/i.test(normalized);
  if (looksLikePandoraDefinitionRequest) {
    return "Pandora — это кооперативная социально-экономическая среда, где человек должен быть не только клиентом, а участником, пайщиком и со-владельцем общей инфраструктуры.\n\nПрактический смысл Pandora — кооперация, доверие, взаимопомощь, снижение расходов, участие людей в общих проектах и создание сервисов, которые работают на своих участников. Это не политическая партия, не финансовая пирамида и не обещание гарантированного дохода.\n\nЕсли коротко: Pandora — это попытка строить более устойчивую среду для жизни через кооператив, общую инфраструктуру и участие людей, а не через пассивное ожидание помощи сверху или одиночную борьбу каждого за себя.";
  }

  return "";
}

// ---- Request logging ----

function createRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function createTelemetry(requestId, startedAt, questionLength) {
  return {
    request_id: requestId,
    status: "started",
    latency_ms: 0,
    question_length: questionLength,
    sources_count: 0,
    file_search_used: false,
    freemodel_called: false,
    error_type: "none"
  };
}

function finalizeTelemetry(telemetry, status, errorType = "none") {
  telemetry.status = status;
  telemetry.error_type = errorType;
  telemetry.latency_ms = Date.now() - telemetry.started_at;
  delete telemetry.started_at;
  const isError = errorType !== "none" && errorType !== "empty_context";
  if (isError) {
    console.error("PANDORA_AI_REQUEST", telemetry);
  } else {
    console.log("PANDORA_AI_REQUEST", telemetry);
  }
}

function jsonError(answer, status, corsHeaders, telemetry, errorType, conversationId, sources = []) {
  telemetry.sources_count = sources.length;
  finalizeTelemetry(telemetry, status, errorType);
  return jsonResponse({
    ok: false,
    answer,
    conversation_id: conversationId || null,
    sources,
    request_id: telemetry.request_id
  }, status, corsHeaders);
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
  const requestId = typeof body.request_id === "string"
    ? body.request_id.trim()
    : "";

  if (!message || message.length > MAX_MESSAGE_LENGTH) return null;
  if (mode !== "ai" || role !== "member") return null;
  if (conversationId.length > MAX_CONVERSATION_ID_LENGTH) return null;
  if (conversationId && !/^resp_[A-Za-z0-9_-]+$/.test(conversationId)) return null;
  if (requestId && !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) return null;

  return { message, mode, role, conversationId, requestId };
}

// ---- Main handler ----

export async function onRequest(context) {
  let requestId = createRequestId();
  const startedAt = Date.now();
  let telemetry = createTelemetry(requestId, startedAt, 0);
  telemetry.started_at = startedAt;

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
    finalizeTelemetry(telemetry, 400, "json_parse_error");
    return jsonResponse({ ok: false, error: "Invalid request", request_id: requestId }, 400, corsHeaders);
  }

  const requestData = normalizeRequest(body);
  if (!requestData) {
    finalizeTelemetry(telemetry, 400, "invalid_request");
    return jsonResponse({ ok: false, error: "Invalid request", request_id: requestId }, 400, corsHeaders);
  }

  const { message, mode, role, conversationId, requestId: incomingRequestId } = requestData;
  if (incomingRequestId) {
    requestId = incomingRequestId;
    telemetry.request_id = incomingRequestId;
  }
  telemetry.question_length = message.length;

  const directBehavioralAnswer = getDirectBehavioralAnswer(message);
  if (directBehavioralAnswer) {
    finalizeTelemetry(telemetry, 200, "none");
    return jsonResponse({
      ok: true,
      answer: directBehavioralAnswer,
      conversation_id: conversationId || null,
      sources: [],
      request_id: requestId
    }, 200, corsHeaders);
  }

  // ---- Env check ----

  const openAiApiKey = context.env.OPENAI_API_KEY;
  const vectorStoreId = context.env.OPENAI_VECTOR_STORE_ID;
  const freeModelApiKey = context.env.FREEMODEL_API_KEY;
  const freeModelName = context.env.FREEMODEL_MODEL || DEFAULT_MODEL;

  if (!openAiApiKey || !vectorStoreId || !freeModelApiKey) {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, "env_missing", conversationId);
  }

  // ---- Stage 1: OpenAI Vector Store search ----

  telemetry.file_search_used = true;

  let searchResult;
  try {
    searchResult = await searchVectorStore(openAiApiKey, vectorStoreId, message);
  } catch {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, "openai_file_search_error", conversationId);
  }

  if (!searchResult || !searchResult.response) {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, searchResult && searchResult.error_type || "openai_file_search_error", conversationId);
  }

  let searchData;
  try {
    searchData = await searchResult.response.json();
  } catch {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, "json_parse_error", conversationId);
  }

  const chunks = extractChunks(searchData);
  const sources = extractSourcesFromSearch(searchData);

  telemetry.sources_count = sources.length;

  if (chunks.length === 0) {
    return jsonError("Я не нашёл подходящей информации в базе знаний Pandora по вашему вопросу. Попробуйте переформулировать запрос.", 200, corsHeaders, telemetry, "empty_context", conversationId);
  }

  // ---- Stage 2: FreeModel generation ----

  telemetry.freemodel_called = true;

  const contextText = chunks.join("\n\n---\n\n");
  const systemMessage = FREE_MODEL_INSTRUCTIONS + "\n" + contextText;

  const freeModelMessages = [
    { role: "system", content: systemMessage },
    { role: "user", content: message }
  ];

  let fmResult;
  try {
    fmResult = await requestFreeModel(freeModelApiKey, freeModelName, freeModelMessages);
  } catch {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, "freemodel_fetch_error", conversationId, sources);
  }

  if (!fmResult || !fmResult.response) {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, fmResult && fmResult.error_type || "freemodel_error", conversationId, sources);
  }

  let fmData;
  try {
    fmData = await fmResult.response.json();
  } catch {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, "json_parse_error", conversationId, sources);
  }

  const answer = extractFreeModelAnswer(fmData);

  if (!answer) {
    return jsonError(FALLBACK_MESSAGE, 503, corsHeaders, telemetry, "freemodel_empty_answer", conversationId, sources);
  }

  telemetry.sources_count = sources.length;
  finalizeTelemetry(telemetry, 200, "none");
  return jsonResponse({
    ok: true,
    answer,
    conversation_id: conversationId || null,
    sources,
    request_id: requestId
  }, 200, corsHeaders);
}
