const router = require("express").Router();
const multer = require("multer");
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const documentService = require("../services/documentService");
const upload = multer({ storage: multer.memoryStorage() });
router.use(requireAuth, requireTenant);
router.get("/", async (req, res, next) => { try { res.json(await documentService.listByTenant(req.tenantId)); } catch (e) { next(e); } });
router.post("/upload", requireRole("admin", "comptable", "client"), upload.single("file"), async (req, res, next) => {
  try {
    const doc = await documentService.uploadAndProcess({
      tenantId: req.tenantId,
      userId: req.user.id,
      file: req.file,
      documentType: req.body.documentType,
      formData: req.body,
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
});
router.put("/:id/validate", requireRole("admin", "comptable"), async (req, res, next) => {
  try { await documentService.validateDocument({ tenantId: req.tenantId, documentId: Number(req.params.id), userId: req.user.id, correctedData: req.body.correctedData }); res.json({ message: "Document validated" }); } catch (e) { next(e); }
});
module.exports = router;
