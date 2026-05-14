export async function onRequestPost(context) {
  const env = context.env;

  const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;
  const VOYAGE_API_KEY = env.VOYAGE_API_KEY;

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { model, max_tokens, system, messages } = body;
  const userQuestion = messages && messages.length > 0
    ? messages[messages.length - 1].content
    : "";

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
  const systemWithRag = (system || "") + ragContext;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: max_tokens || 500,
      system: systemWithRag,
      messages: messages
    })
  });

  const data = await anthropicRes.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}