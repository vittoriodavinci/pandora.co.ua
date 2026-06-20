const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const OPENAI_API_BASE = "https://api.openai.com/v1";
const VECTOR_STORE_NAME = "pandora-public-core-v0-1";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEV_VARS_PATH = path.join(PROJECT_ROOT, ".dev.vars");
const SOURCE_DIR = path.join(PROJECT_ROOT, "data", "pandora-ai", "public-core");
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

if (fs.existsSync(DEV_VARS_PATH)) {
  dotenv.config({ path: DEV_VARS_PATH, override: false });
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function requireApiKey() {
  if (!OPENAI_API_KEY) {
    console.error(
      `Создайте ${DEV_VARS_PATH} на основе .dev.vars.example и добавьте OPENAI_API_KEY`
    );
    return false;
  }

  return true;
}

function getMarkdownFiles() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  const files = fs.readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map(entry => path.join(SOURCE_DIR, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  if (files.length === 0) {
    throw new Error(`No Markdown files found in: ${SOURCE_DIR}`);
  }

  return files;
}

function openAiHeaders(json = true) {
  return {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "OpenAI-Beta": "assistants=v2",
    ...(json ? { "Content-Type": "application/json" } : {})
  };
}

async function readError(response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.error && data.error.message ? data.error.message : text;
  } catch {
    return text;
  }
}

async function openAiJson(pathname, options = {}) {
  const response = await fetch(`${OPENAI_API_BASE}${pathname}`, {
    ...options,
    headers: {
      ...openAiHeaders(true),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`OpenAI API ${response.status}: ${await readError(response)}`);
  }

  return response.json();
}

async function createVectorStore() {
  return openAiJson("/vector_stores", {
    method: "POST",
    body: JSON.stringify({
      name: VECTOR_STORE_NAME,
      metadata: {
        project: "pandora",
        visibility: "public",
        version: "v0-1"
      }
    })
  });
}

async function uploadFile(filePath) {
  const form = new FormData();
  const bytes = fs.readFileSync(filePath);
  form.append("purpose", "assistants");
  form.append("file", new Blob([bytes], { type: "text/markdown" }), path.basename(filePath));

  const response = await fetch(`${OPENAI_API_BASE}/files`, {
    method: "POST",
    headers: openAiHeaders(false),
    body: form
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI file upload failed for ${path.basename(filePath)} (${response.status}): ${await readError(response)}`
    );
  }

  return response.json();
}

async function createFileBatch(vectorStoreId, fileIds) {
  return openAiJson(`/vector_stores/${encodeURIComponent(vectorStoreId)}/file_batches`, {
    method: "POST",
    body: JSON.stringify({ file_ids: fileIds })
  });
}

async function getFileBatch(vectorStoreId, batchId) {
  return openAiJson(
    `/vector_stores/${encodeURIComponent(vectorStoreId)}/file_batches/${encodeURIComponent(batchId)}`
  );
}

async function waitForIndexing(vectorStoreId, batchId, expectedFileCount) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const batch = await getFileBatch(vectorStoreId, batchId);
    const counts = batch.file_counts || {};

    console.log(
      `Indexing: ${counts.completed || 0}/${expectedFileCount} completed, `
      + `${counts.in_progress || 0} in progress, ${counts.failed || 0} failed`
    );

    if (batch.status === "completed") {
      if ((counts.failed || 0) > 0 || (counts.cancelled || 0) > 0) {
        throw new Error("Vector Store indexing completed with failed or cancelled files.");
      }
      return batch;
    }

    if (batch.status === "failed" || batch.status === "cancelled") {
      throw new Error(`Vector Store file batch ended with status: ${batch.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for Vector Store indexing after ${POLL_TIMEOUT_MS / 60000} minutes.`);
}

async function main() {
  if (!requireApiKey()) {
    process.exitCode = 1;
    return;
  }

  const files = getMarkdownFiles();

  console.log(`Creating OpenAI Vector Store: ${VECTOR_STORE_NAME}`);
  console.log(`Markdown files: ${files.length}`);

  const vectorStore = await createVectorStore();
  if (!vectorStore.id || !vectorStore.id.startsWith("vs_")) {
    throw new Error("OpenAI returned an invalid Vector Store ID.");
  }

  console.log(`Vector Store created: ${vectorStore.id}`);

  const uploadedFileIds = [];
  for (const filePath of files) {
    console.log(`Uploading: ${path.basename(filePath)}`);
    const uploaded = await uploadFile(filePath);
    uploadedFileIds.push(uploaded.id);
  }

  const batch = await createFileBatch(vectorStore.id, uploadedFileIds);
  await waitForIndexing(vectorStore.id, batch.id, files.length);

  console.log("Vector Store indexing completed.");
  console.log(`OPENAI_VECTOR_STORE_ID=${vectorStore.id}`);
}

main().catch(error => {
  console.error(`Vector Store creation failed: ${error.message}`);
  process.exitCode = 1;
});
