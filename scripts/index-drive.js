const crypto = require("crypto");
require("dotenv").config();
const fetch = require("node-fetch");

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const CORE_FILE = "pandora_website_bot_public_core_v0_1.md";
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const EMBEDDING_BATCH_SIZE = 4;
const EMBEDDING_BATCH_DELAY_MS = 21000;

const SOURCE_FOLDERS = [
  {
    folder: "01_PUBLIC_CORE",
    visibility: "public",
    priority: 100,
    source_type: "core"
  },
  {
    folder: "02_PUBLIC_KNOWLEDGE",
    visibility: "public",
    priority: 50,
    source_type: "knowledge"
  }
];

const ARCHIVE_FOLDERS = new Set(["90_ARCHIVE_DISABLED"]);

const report = {
  added: [],
  updated: [],
  skipped: [],
  errors: [],
  chunksCreated: 0,
  coreFileFound: false
};

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hashContent(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function driveUrl(params) {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("key", GOOGLE_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function driveList(q, fields = "files(id,name,modifiedTime,mimeType)") {
  const res = await fetch(driveUrl({ q, fields }));
  if (!res.ok) {
    throw new Error(`Google Drive list failed: ${res.status}`);
  }
  const data = await res.json();
  return data.files || [];
}

async function getConfiguredFolders(rootFolderId) {
  const folders = await driveList(
    `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );

  for (const folder of folders) {
    if (ARCHIVE_FOLDERS.has(folder.name)) {
      console.log(`Archive folder ignored: ${folder.name}`);
    }
  }

  return SOURCE_FOLDERS.map(config => {
    const driveFolder = folders.find(folder => folder.name === config.folder);
    if (!driveFolder) {
      report.errors.push({
        source: config.folder,
        error: "Configured Google Drive folder not found"
      });
      return null;
    }

    return {
      ...config,
      id: driveFolder.id
    };
  }).filter(Boolean);
}

async function getMarkdownFiles(folderConfig) {
  const files = await driveList(
    `'${folderConfig.id}' in parents and trashed=false`,
    "files(id,name,modifiedTime,mimeType,size)"
  );

  return files
    .filter(file => file.name.toLowerCase().endsWith(".md"))
    .map(file => ({
      ...file,
      folder: folderConfig.folder,
      visibility: folderConfig.visibility,
      priority: folderConfig.priority,
      source_type: folderConfig.source_type
    }));
}

function chunkText(text, metadataBase) {
  const chunks = [];
  const cleaned = text.replace(/\r\n/g, "\n");
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();

    if (chunk.length > 100) {
      chunks.push({
        content: chunk,
        metadata: {
          ...metadataBase,
          chunk_index: chunks.length
        }
      });
    }

    start = end - CHUNK_OVERLAP;
    if (end === cleaned.length) break;
  }

  return chunks;
}

async function getEmbeddings(texts, retryCount = 0) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VOYAGE_API_KEY}`
    },
    body: JSON.stringify({ input: texts, model: "voyage-3-lite" })
  });

  if ((res.status === 429 || res.status === 503) && retryCount < 5) {
    const waitMs = Math.pow(2, retryCount + 1) * 10000;
    console.log(`  Voyage rate limit, waiting ${Math.round(waitMs / 1000)}s...`);
    await sleep(waitMs);
    return getEmbeddings(texts, retryCount + 1);
  }

  if (!res.ok) {
    throw new Error(`Voyage API request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.data.map(item => item.embedding);
}

async function getIndexedMetadata(sourceId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?metadata->>source_id=eq.${encodeURIComponent(sourceId)}&select=metadata&limit=1`,
    {
      headers: {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase lookup failed: ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0].metadata : null;
}

async function deleteIndexedChunks(sourceId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/documents?metadata->>source_id=eq.${encodeURIComponent(sourceId)}`,
    {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": `Bearer ${SUPABASE_SECRET_KEY}`,
        "Prefer": "return=minimal"
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase delete failed: ${res.status}`);
  }
}

async function saveBatch(chunks, embeddings) {
  const rows = chunks.map((chunk, index) => ({
    content: chunk.content,
    embedding: embeddings[index],
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

  if (!res.ok) {
    throw new Error(`Supabase insert failed: ${res.status}`);
  }
}

async function downloadMarkdown(file) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${file.id}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("key", GOOGLE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google Drive download failed: ${res.status}`);
  }

  return res.text();
}

async function indexChunks(chunks) {
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const embeddings = await getEmbeddings(batch.map(chunk => chunk.content));
    await saveBatch(batch, embeddings);

    if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
      await sleep(EMBEDDING_BATCH_DELAY_MS);
    }
  }
}

async function processFile(file) {
  console.log(`\nProcessing: ${file.folder}/${file.name}`);

  if (file.name === CORE_FILE && file.folder === "01_PUBLIC_CORE") {
    report.coreFileFound = true;
  }

  if (file.name === CORE_FILE && file.folder !== "01_PUBLIC_CORE") {
    console.log(`  Warning: core file is outside 01_PUBLIC_CORE and will not receive core priority.`);
  }

  const text = await downloadMarkdown(file);
  const contentHash = hashContent(text);
  const existingMetadata = await getIndexedMetadata(file.id);

  if (existingMetadata && existingMetadata.content_hash === contentHash) {
    report.skipped.push(`${file.folder}/${file.name}`);
    console.log("  Skipped: unchanged");
    return;
  }

  const action = existingMetadata ? "updated" : "added";

  if (existingMetadata) {
    await deleteIndexedChunks(file.id);
  }

  const metadataBase = {
    source: file.name,
    source_id: file.id,
    visibility: file.visibility,
    priority: file.priority,
    folder: file.folder,
    updated_at: file.modifiedTime,
    content_hash: contentHash,
    source_type: file.source_type
  };

  const chunks = chunkText(text, metadataBase);
  await indexChunks(chunks);

  report[action].push(`${file.folder}/${file.name}: ${chunks.length} chunks`);
  report.chunksCreated += chunks.length;
  console.log(`  ${action === "added" ? "Added" : "Updated"}: ${chunks.length} chunks`);
}

function printReport() {
  console.log("\n=== Pandora Knowledge Index Report ===");
  console.log(`Added files: ${report.added.length}`);
  console.log(`Updated files: ${report.updated.length}`);
  console.log(`Skipped files: ${report.skipped.length}`);
  console.log(`Errors: ${report.errors.length}`);
  console.log(`Chunks created: ${report.chunksCreated}`);

  if (!report.coreFileFound) {
    console.log(`Warning: ${CORE_FILE} was not found in 01_PUBLIC_CORE.`);
  }

  const sections = [
    ["Added", report.added],
    ["Updated", report.updated],
    ["Skipped", report.skipped],
    ["Errors", report.errors.map(item => `${item.source}: ${item.error}`)]
  ];

  for (const [title, items] of sections) {
    if (items.length === 0) continue;
    console.log(`\n${title}:`);
    for (const item of items) {
      console.log(`- ${item}`);
    }
  }
}

async function main() {
  requireEnv("VOYAGE_API_KEY", VOYAGE_API_KEY);
  requireEnv("SUPABASE_URL", SUPABASE_URL);
  requireEnv("SUPABASE_SECRET_KEY", SUPABASE_SECRET_KEY);
  requireEnv("GOOGLE_DRIVE_FOLDER_ID", ROOT_FOLDER_ID);
  requireEnv("GOOGLE_API_KEY", GOOGLE_API_KEY);

  console.log("=== Pandora Knowledge Indexer (Markdown only) ===");

  const folders = await getConfiguredFolders(ROOT_FOLDER_ID);
  const filesByFolder = await Promise.all(folders.map(getMarkdownFiles));
  const files = filesByFolder.flat();

  if (files.length === 0) {
    console.log("No Markdown files found in configured public folders.");
    printReport();
    return;
  }

  for (const file of files) {
    try {
      await processFile(file);
    } catch (err) {
      report.errors.push({
        source: `${file.folder}/${file.name}`,
        error: err.message
      });
      console.error(`  Error: ${err.message}`);
    }
  }

  printReport();
}

main().catch(err => {
  console.error("Fatal indexing error:", err.message);
  process.exit(1);
});
