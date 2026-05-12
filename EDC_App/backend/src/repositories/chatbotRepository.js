const { query } = require("../config/db");

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function assertTenantId(tenantId) {
  const id = toPositiveInt(tenantId);
  if (!id) {
    const e = new Error("Invalid tenantId");
    e.status = 400;
    throw e;
  }
  return id;
}

async function createConversation(userId, title = "Nouvelle conversation") {
  const sql = `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title, created_at, updated_at`;
  const { rows } = await query(sql, [userId, title]);
  return rows[0];
}

async function getConversations(userId) {
  const sql = `SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC`;
  const { rows } = await query(sql, [userId]);
  return rows;
}

async function createMessage(conversationId, role, content) {
  const sql = `INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, conversation_id, role, content, created_at`;
  const { rows } = await query(sql, [conversationId, role, content]);
  await query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);
  return rows[0];
}

async function getMessages(conversationId) {
  const sql = `SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`;
  const { rows } = await query(sql, [conversationId]);
  return rows;
}

async function saveChatbotDocument({ tenantId, conversationId, originalFilename, mimeType, fileSize, storageBucket, storageKey, extractedText }) {
  const validTenantId = assertTenantId(tenantId);
  const validConversationId = toPositiveInt(conversationId);
  const sql = `
    INSERT INTO chatbot_documents (tenant_id, conversation_id, original_filename, mime_type, file_size, storage_bucket, storage_key, extracted_text)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id, tenant_id, conversation_id, original_filename, created_at
  `;
  const { rows } = await query(sql, [validTenantId, validConversationId, originalFilename, mimeType, fileSize, storageBucket, storageKey, extractedText || null]);
  return rows[0];
}

async function getChatbotDocuments(tenantId, conversationId) {
  const validTenantId = assertTenantId(tenantId);
  const validConversationId = toPositiveInt(conversationId);

  const params = [validTenantId];
  let where = "tenant_id = $1";
  if (validConversationId) {
    params.push(validConversationId);
    where += " AND (conversation_id = $2 OR conversation_id IS NULL)";
  }
  const sql = `SELECT id, original_filename, created_at FROM chatbot_documents WHERE ${where} ORDER BY created_at DESC LIMIT 20`;
  const { rows } = await query(sql, params);
  return rows;
}

async function getRagContext(tenantId, conversationId, userText) {
  const tokens = String(userText || "").toLowerCase().split(/\W+/).filter((t) => t.length > 2).slice(0, 15);
  const docs = await getChatbotDocuments(tenantId, conversationId);
  if (!docs.length) return [];

  const ids = docs.map((d) => d.id);
  const { rows } = await query(
    `SELECT id, original_filename, extracted_text FROM chatbot_documents WHERE id = ANY($1::int[]) AND extracted_text IS NOT NULL`,
    [ids]
  );

  const scored = rows
    .map((r) => {
      const txt = String(r.extracted_text || "").toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (txt.includes(t) ? 1 : 0), 0);
      return { id: r.id, original_filename: r.original_filename, extracted_text: r.extracted_text, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => ({ source: r.original_filename, text: String(r.extracted_text).slice(0, 1800) }));

  return scored;
}

module.exports = {
  createConversation,
  getConversations,
  createMessage,
  getMessages,
  saveChatbotDocument,
  getChatbotDocuments,
  getRagContext,
};
