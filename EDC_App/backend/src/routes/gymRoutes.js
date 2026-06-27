const router = require("express").Router();
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const bankReturnService = require("../services/bankReturnService");

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(requireAuth, requireTenant);

router.get("/bank-returns", async (req, res, next) => {
  try {
    const items = await bankReturnService.listImports({ tenantId: req.tenantId, limit: req.query.limit || 20 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.get("/bank-returns/rows", async (req, res, next) => {
  try {
    const items = await bankReturnService.listRows({ tenantId: req.tenantId, limit: req.query.limit || 50 });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.post("/bank-returns", async (req, res, next) => {
  try {
    const result = await bankReturnService.recordManualReturn({
      tenantId: req.tenantId,
      userId: req.user?.id,
      body: req.body || {},
    });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/bank-returns/import-excel", uploadMemory.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier Excel n'a été fourni." });
    }

    const result = await bankReturnService.importExcel({
      tenantId: req.tenantId,
      userId: req.user?.id,
      fileBuffer: req.file.buffer,
      filename: req.file.originalname || "bank-return.xlsx",
      sourceBank: req.body?.source_bank || req.body?.bank_name || "bank-return",
      sheetName: req.body?.sheet_name || null,
    });

    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
