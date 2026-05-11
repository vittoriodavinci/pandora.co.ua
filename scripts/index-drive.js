const fetch = require("node-fetch");
const pdfParse = require("pdf-parse");

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Размер одного куска текста (в символах)
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

// --- Получить список PDF файлов из публичной папки Google Drive ---
async function getDriveFiles(folderId) {
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/pdf'&key=${GOOGLE_API_KEY}&fields=files(id,name,modifiedTime)`;
  
  const res = await fetch(url);
  
  if (!res.ok) {
    console.log("Google API недоступен, проверь GOOGLE_API_KEY в секретах.");
    return null;
  }
  
  const data = await res.json();
  return data.files || [];
}

// --- Скачать PDF по ID ---
async function downloadPdf(fileId) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось скачать файл ${fileId}`);
  return Buffer.from(await res.arrayBuffer());
}

// --- Нарезать текст на куски ---
function chunkText(text, source) {
  const chunks = [];
  let start = 0;
  
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();
  
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end);
    
    if (chunk.trim().length > 100) {
      chunks.push({
        content: chunk,
        metadata: { source, chunk_index: chunks.length }
      });
    }
    
    start = end - CHUNK_OVERLAP;
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
    body: JSON.stringify({
      input: texts,
      model: "voyage-3-lite"
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage API error: ${err}`);
  }
  
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

// --- Проверить, индексирован ли файл (по имени) ---
async function isAlreadyIndexed(source) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?metadata->>source=eq.${encodeURIComponent(source)}&limit=1`,
    {
      headers: {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`
      }
    }
  );
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

// --- Сохранить куски в Supabase ---
async function saveToSupabase(chunks, embeddings) {
  const rows = chunks.map((chunk, i) => ({
    content: chunk.content,
    embedding: embeddings[i],
    metadata: chunk.metadata
  }));
  
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(batch)
    });
    
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase insert error: ${err}`);
    }
    
    console.log(`  Сохранено ${Math.min(i + batchSize, rows.length)}/${rows.length} кусков`);
  }
}

// --- Главная функция ---
async function main() {
  console.log("=== Pandora Indexer ===");
  console.log(`Папка Google Drive: ${FOLDER_ID}`);
  
  const files = await getDriveFiles(FOLDER_ID);
  
  if (!files) {
    console.error("Не удалось получить список файлов из Google Drive.");
    process.exit(1);
  }
  
  if (files.length === 0) {
    console.log("PDF файлов в папке не найдено.");
    process.exit(0);
  }
  
  console.log(`Найдено файлов: ${files.length}`);
  
  for (const file of files) {
    console.log(`\nОбрабатываю: ${file.name}`);
    
    const indexed = await isAlreadyIndexed(file.name);
    if (indexed) {
      console.log(`  Уже индексирован, пропускаю.`);
      continue;
    }
    
    try {
      console.log(`  Скачиваю PDF...`);
      const pdfBuffer = await downloadPdf(file.id);
      
      console.log(`  Извлекаю текст...`);
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;
      console.log(`  Текст: ${text.length} символов`);
      
      const chunks = chunkText(text, file.name);
      console.log(`  Кусков: ${chunks.length}`);
      
      console.log(`  Получаю embeddings...`);
      const allEmbeddings = [];
      const batchSize = 20;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await getEmbeddings(batch.map(c => c.content));
        allEmbeddings.push(...embeddings);
        console.log(`  Embeddings: ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
        
        if (i + batchSize < chunks.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
      console.log(`  Сохраняю в Supabase...`);
      await saveToSupabase(chunks, allEmbeddings);
      
      console.log(`  ✓ ${file.name} успешно индексирован!`);
      
    } catch (err) {
      console.error(`  ✗ Ошибка при обработке ${file.name}:`, err.message);
    }
  }
  
  console.log("\n=== Индексация завершена ===");
}

main().catch(err => {
  console.error("Критическая ошибка:", err);
  process.exit(1);
});
