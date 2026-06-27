const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const controller = require("../controllers/chatbotController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth, requireTenant);
router.post("/message", controller.sendMessage);
router.get("/conversations", controller.listConversations);
router.get("/messages/:conversationId", controller.listMessages);
router.delete("/conversations/:conversationId", controller.deleteConversation);
router.post("/upload", upload.single("file"), controller.uploadDocument);
router.delete("/documents/:documentId", controller.deleteDocument);
router.get("/documents", controller.listDocuments);

module.exports = router;
