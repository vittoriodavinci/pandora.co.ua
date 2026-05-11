const fetch = require("node-fetch");

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

// --- Получить список MD файлов из папки Google Drive ---
async function getDriveFiles(folderId) {
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${GOOGLE_API_KEY}&fields=files(id,name,modifiedTime,mimeType)`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log("Google API недоступен, проверь GOOGLE_API_KEY в секретах.");
    return null;
  }
  const data = await res.json();
  // Только .md файлы, PDF игнорируем
  return (data.files || []).filter(f => f.name.endsWith(".md"));
}

// --- Скачать MD файл как текст ---
async function downloadMd(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось скачать файл ${fileId}: ${res.status}`);
  return await res.text();
}

// --- Нарезать текст на куски (с уважением к заголовкам MD) ---
function chunkText(text, source) {
  const chunks = [];
  const cleaned = text.replace(/\r\n/g, "\n").trim();

  // Разбиваем по заголовкам ## как естественным смысловым границам
  const sections = cleaned.split(/(?=\n## )/);

  for (const section of sections) {
    if (section.trim().length < 50) continue;

    if (section.length <= CHUNK_SIZE) {
      chunks.push({ content: section.trim(), metadata: { source, chunk_index: chunks.length } });
      continue;
    }

    let start = 0;
    while (start < section.length) {
      const end = Math.min(start + CHUNK_SIZE, section.length);
      const chunk = section.slice(start, end).trim();
      if (chunk.length > 100) {
        chunks.push({ content: chunk, metadata: { source, chunk_index: chunks.length } });
      }
      start = end - CHUNK_OVERLAP;
    }
  }

  return chunks;
}

// --- Получить embeddings через Voyage AI ---
async function getEmbeddings(texts) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VOYAGE_API_KEY}`
    },
    body: JSON.stringify({ input: texts, model: "voyage-3-lite" })
  });
  if (!res.ok) throw new Error(`Voyage API error: ${await res.text()}`);
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

// --- Проверить, индексирован ли файл ---
async function isAlreadyIndexed(source) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?metadata->>source=eq.${encodeURIComponent(source)}&limit=1`,
    { headers: { "apikey": SUPABASE_SECRET_KEY, "Authorization": `Bearer ${SUPABASE_SECRET_KEY}` } }
  );
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

// --- Сохранить батч в Supabase ---
async function saveBatch(chunks, embeddings) {
  const rows = chunks.map((chunk, i) => ({
    content: chunk.content,
    embedding: embeddings[i],
    metadata: chunk.metadata
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) throw new Error(`Supabase insert error: ${await res.text()}`);
}

// --- Обработать один файл ---
async function processFile(file) {
  console.log(`\nОбрабатываю: ${file.name}`);

  if (await isAlreadyIndexed(file.name)) {
    console.log(`  Уже индексирован, пропускаю.`);
    return;
  }

  console.log(`  Скачиваю...`);
  const text = await downloadMd(file.id);
  console.log(`  Текст: ${text.length} символов`);

  const chunks = chunkText(text, file.name);
  console.log(`  Кусков: ${chunks.length}`);

  const BATCH = 10;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await getEmbeddings(batch.map(c => c.content));
    await saveBatch(batch, embeddings);
    console.log(`  Прогресс: ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`  ГОТОВО: ${file.name}`);
}

// --- Главная функция ---
async function main() {
  console.log("=== Pandora Indexer (MD) ===");
  console.log(`Папка Google Drive: ${FOLDER_ID}`);

  const files = await getDriveFiles(FOLDER_ID);
  if (!files) { console.error("Не удалось получить список файлов."); process.exit(1); }
  if (files.length === 0) { console.log("MD файлов не найдено."); process.exit(0); }

  console.log(`Найдено MD файлов: ${files.length}`);

  for (const file of files) {
    try {
      await processFile(file);
    } catch (err) {
      console.error(`  ОШИБКА ${file.name}:`, err.message);
    }
  }

  console.log("\n=== Индексация завершена ===");
}

main().catch(err => { console.error("Критическая ошибка:", err); process.exit(1); });
