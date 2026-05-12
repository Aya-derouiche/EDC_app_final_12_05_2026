const router = require("express").Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const accountingService = require("../services/accountingService");
router.use(requireAuth, requireTenant, requireRole("admin", "comptable"));
router.post("/documents/:id/entries", async (req, res, next) => {
  try { await accountingService.createEntries({ tenantId: req.tenantId, documentId: Number(req.params.id), userId: req.user.id, lines: req.body.lines || [] }); res.status(201).json({ message: "Accounting entries created" }); } catch (e) { next(e); }
});
module.exports = router;
