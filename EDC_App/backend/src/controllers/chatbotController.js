const { v4: uuidv4 } = require("uuid");
const { minioClient, bucket } = require("../config/minio");
const extractionService = require("../services/extractionService");
const env = require("../config/env");
const repo = require("../repositories/chatbotRepository");
const { generateChatReply } = require("../services/chatbotService");

function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?.sub;
}

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function requireTenantId(req, res) {
  const tenantId = toPositiveInt(req.tenantId);
  if (!tenantId) {
    res.status(400).json({ error: "Invalid tenant" });
    return null;
  }
  return tenantId;
}

async function sendMessage(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const { conversationId, content } = req.body;
    if (!content || !String(content).trim()) return res.status(400).json({ error: "Message is required" });

    let activeConversationId = toPositiveInt(conversationId);
    if (!activeConversationId) {
      const conversation = await repo.createConversation(userId);
      activeConversationId = conversation.id;
    }

    await repo.createMessage(activeConversationId, "user", String(content).trim());
    const history = await repo.getMessages(activeConversationId);
    const ragContext = await repo.getRagContext(tenantId, activeConversationId, content);
    const answer = await generateChatReply(history, ragContext);
    const botMessage = await repo.createMessage(activeConversationId, "assistant", answer);

    return res.json({ conversationId: activeConversationId, reply: botMessage.content, message: botMessage });
  } catch (error) {
    return next(error);
  }
}

async function listConversations(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const conversations = await repo.getConversations(userId);
    return res.json(conversations);
  } catch (error) {
    return next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const conversationId = toPositiveInt(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: "Invalid conversationId" });
    const messages = await repo.getMessages(conversationId);
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
}

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const conversationId = toPositiveInt(req.body.conversationId);
    const objectKey = `chatbot/${tenantId}/${Date.now()}-${uuidv4()}-${req.file.originalname}`;
    await minioClient.putObject(bucket, objectKey, req.file.buffer, req.file.size, { "Content-Type": req.file.mimetype });

    let extractedText = "";
    try {
      const extraction = await extractionService.extract({
        documentType: "chatbot_context",
        objectKey,
        originalName: req.file.originalname,
        apiUrl: env.extraction.apiUrl,
        apiKey: env.extraction.apiKey,
      });
      extractedText = extraction?.rawText || JSON.stringify(extraction?.extractedData || {});
    } catch (_e) {
      extractedText = req.file.mimetype.startsWith("text/") ? req.file.buffer.toString("utf8") : req.file.originalname;
    }

    const doc = await repo.saveChatbotDocument({
      tenantId,
      conversationId,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      storageBucket: bucket,
      storageKey: objectKey,
      extractedText,
    });

    return res.status(201).json(doc);
  } catch (error) {
    return next(error);
  }
}

async function listDocuments(req, res, next) {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const conversationId = req.query.conversationId ? toPositiveInt(req.query.conversationId) : null;
    if (req.query.conversationId && !conversationId) {
      return res.status(400).json({ error: "Invalid conversationId" });
    }

    const docs = await repo.getChatbotDocuments(tenantId, conversationId);
    return res.json(docs);
  } catch (error) {
    return next(error);
  }
}

module.exports = { sendMessage, listConversations, listMessages, uploadDocument, listDocuments };
