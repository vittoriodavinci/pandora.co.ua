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
const KNOWLEDGE_UNAVAILABLE_MESSAGE = "База знаний Pandora временно недоступна. Существуют разные бренды и образы Pandora, но этот сайт относится к кооперативному проекту Pandora / USEN Pandora. Я не буду выдумывать детали без базы знаний.";
const PROJECT_SPECIFIC_PATTERNS = [
  "pandora id",
  "usen",
  "usen pandora",
  "pandora.co.ua",
  "кооператив",
  "пайщик",
  "совладелец",
  "членский взнос",
  "паевой взнос",
  "вступить в пандору",
  "вступить в pandora",
  "кооперативная социально-экономическая сеть"
];
const GENERAL_PANDORA_PATTERNS = [
  "pandora",
  "пандора",
  "pandora music",
  "pandora jewelry",
  "pandora alarm",
  "avatar",
  "мифологическая пандора"
];

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

function isProjectSpecificQuestion(text) {
  const normalized = text.toLowerCase();
  return PROJECT_SPECIFIC_PATTERNS.some(pattern => normalized.includes(pattern));
}

function isGeneralPandoraQuestion(text) {
  const normalized = text.toLowerCase();
  return GENERAL_PANDORA_PATTERNS.some(pattern => normalized.includes(pattern));
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

function createDebug(debugEnabled, debug) {
  if (!debugEnabled) return null;

  return {
    core_direct_ok: debug.core_direct_ok,
    core_direct_count: debug.core_direct_count,
    voyage_ok: debug.voyage_ok,
    vector_raw_count: debug.vector_raw_count,
    vector_public_count: debug.vector_public_count,
    rag_context_length: debug.rag_context_length,
    sources_used: debug.sources_used,
    upstream_stage: debug.upstream_stage,
    upstream_status: debug.upstream_status,
    upstream_error_type: debug.upstream_error_type
  };
}

function anthropicTextResponse(text, debugEnabled, debug) {
  const response = {
    content: [
      {
        type: "text",
        text
      }
    ]
  };

  const safeDebug = createDebug(debugEnabled, debug);
  if (safeDebug) response.debug = safeDebug;

  return response;
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
  const debugEnabled = body.debug === true;
  const debug = {
    core_direct_ok: false,
    core_direct_count: 0,
    voyage_ok: false,
    vector_raw_count: 0,
    vector_public_count: 0,
    rag_context_length: 0,
    sources_used: [],
    upstream_stage: null,
    upstream_status: null,
    upstream_error_type: null
  };
  const requiresPandoraContext = isProjectSpecificQuestion(userQuestion);
  const isPandoraQuestion = requiresPandoraContext || isGeneralPandoraQuestion(userQuestion);

  let directCoreChunks = [];
  if (isPandoraQuestion) {
    try {
      directCoreChunks = await fetchDirectCoreChunks(env);
      debug.core_direct_count = directCoreChunks.length;
      debug.core_direct_ok = directCoreChunks.length > 0;
    } catch (e) {
      console.log("Direct core error:", e.message);
    }
  }

  let ragContext = "";
  let vectorPublicMatches = [];
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

    if (!voyageRes.ok) {
      throw new Error(`Voyage request failed: ${voyageRes.status}`);
    }

    const voyageData = await voyageRes.json();
    const queryEmbedding = voyageData.data[0].embedding;
    debug.voyage_ok = true;

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
    debug.vector_raw_count = Array.isArray(matches) ? matches.length : 0;
    vectorPublicMatches = getPublicMatches(matches);
    debug.vector_public_count = vectorPublicMatches.length;
  } catch (e) {
    console.log("RAG error:", e.message);
  }

  const contextChunks = mergeContextChunks(directCoreChunks, vectorPublicMatches);
  debug.sources_used = [...new Set(contextChunks.map(match => match.metadata && match.metadata.source).filter(Boolean))];
  ragContext = buildRagContext(contextChunks);
  debug.rag_context_length = ragContext.length;

  if (isPandoraQuestion && !directCoreChunks.length && !ragContext) {
    const response = anthropicTextResponse(
      "Pandora Music, Pandora Jewelry, Pandora Alarm, Avatar and the mythological Pandora are different brands or images with the same name. This site is about another project: Pandora / USEN Pandora, a cooperative socio-economic network. The Pandora knowledge base is temporarily unavailable, so I will not invent project details.",
      debugEnabled,
      debug
    );
    return jsonResponse(response, 200, corsHeaders);
  }

  if (requiresPandoraContext && !directCoreChunks.length) {
    const response = { error: KNOWLEDGE_UNAVAILABLE_MESSAGE };
    const safeDebug = createDebug(debugEnabled, debug);
    if (safeDebug) response.debug = safeDebug;
    return jsonResponse(response, 503, corsHeaders);
  }

  const systemWithRag = (env.PANDORA_SYSTEM_PROMPT || SYSTEM_PROMPT) + ragContext;

  try {
    debug.upstream_stage = "anthropic";
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
      debug.upstream_status = anthropicRes.status;
      debug.upstream_error_type = "http_error";
      const response = { error: "Upstream request failed" };
      const safeDebug = createDebug(debugEnabled, debug);
      if (safeDebug) response.debug = safeDebug;
      return jsonResponse(response, 502, corsHeaders);
    }

    const data = await anthropicRes.json();
    const safeDebug = createDebug(debugEnabled, debug);
    if (safeDebug) data.debug = safeDebug;

    return jsonResponse(data, 200, corsHeaders);
  } catch (e) {
    console.log("Anthropic error:", e.message);
    debug.upstream_stage = "anthropic";
    debug.upstream_error_type = "fetch_error";
    const response = { error: "Upstream request failed" };
    const safeDebug = createDebug(debugEnabled, debug);
    if (safeDebug) response.debug = safeDebug;
    return jsonResponse(response, 502, corsHeaders);
  }
}
