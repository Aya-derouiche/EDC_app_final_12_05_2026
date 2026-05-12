// backend/routes/documents.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { minioClient, MINIO_BUCKET } = require("../config/minio");
const { scanDocument } = require("../services/aiScan");
const { dbQuery } = require("../config/db");

// Configuration multer pour stockage en mÃ©moire
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non supportÃ©: ${file.mimetype}`), false);
    }
  },
});

// Helper: Upload vers MinIO
const uploadToMinio = async (file, folder) => {
  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectName = `${folder}/${timestamp}_${safeName}`;
  
  const metaData = {
    'Content-Type': file.mimetype,
    'original-name': file.originalname,
  };

  await minioClient.putObject(MINIO_BUCKET, objectName, file.buffer, file.size, metaData);
  
  // GÃ©nÃ©rer URL prÃ©-signÃ©e (valable 7 jours)
  const url = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, 7 * 24 * 60 * 60);
  
  return {
    objectName,
    url,
    secureUrl: url,
    size: file.size,
    mimetype: file.mimetype,
    originalName: file.originalname,
  };
};

// Helper: Supprimer de MinIO
const deleteFromMinio = async (objectName) => {
  try {
    await minioClient.removeObject(MINIO_BUCKET, objectName);
    return true;
  } catch (err) {
    console.error("MinIO delete error:", err);
    return false;
  }
};

// â”€â”€â”€ POST /api/documents/upload-and-scan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post("/upload-and-scan", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reÃ§u" });
    }

    const {
      code_entreprise = "general",
      code_tiers = null,
      doc_type = "facture",
      entite_liee = null,
      entite_id = null,
      uploaded_by = null,
    } = req.body;

    const folder = `compta_saas/${code_entreprise}/${doc_type}`;
    const minioResult = await uploadToMinio(req.file, folder);

    // Insertion du document avec statut "scanning"
    const insertResult = await dbQuery(
      `INSERT INTO documents
         (minio_object_name, minio_url, minio_secure_url, minio_bucket,
          original_name, mime_type, resource_type, size_bytes,
          code_entreprise, code_tiers, doc_type,
          entite_liee, entite_id, uploaded_by, scan_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        minioResult.objectName,
        minioResult.url,
        minioResult.secureUrl,
        MINIO_BUCKET,
        minioResult.originalName,
        minioResult.mimetype,
        req.file.mimetype.startsWith("image/") ? "image" : "raw",
        minioResult.size,
        code_entreprise,
        code_tiers,
        doc_type,
        entite_liee,
        entite_id ? parseInt(entite_id) : null,
        uploaded_by,
        'scanning',
      ]
    );

    const savedDoc = insertResult[0];

    // LANCER L'AI SCAN
    let scanResult = null;
    try {
      console.log(`[AI Scan] DÃ©marrage du scan pour document ${savedDoc.id}`);
      scanResult = await scanDocument(
        minioResult.secureUrl, 
        req.file.mimetype, 
        doc_type
      );
      
      await dbQuery(
        `UPDATE documents
         SET scan_status = $1,
             scan_result = $2,
             scan_confidence = $3,
             scan_error = $4,
             scanned_at = NOW(),
             updated_at = NOW()
         WHERE id = $5`,
        [
          scanResult.success ? 'done' : 'error',
          scanResult.extractedData ? JSON.stringify(scanResult.extractedData) : null,
          scanResult.confidence_score || 0,
          scanResult.error || null,
          savedDoc.id,
        ]
      );
      
      console.log(`[AI Scan] Scan terminÃ©: ${scanResult.success ? 'SuccÃ¨s' : 'Ã‰chec'}`);
    } catch (scanErr) {
      console.error(`[AI Scan] Erreur:`, scanErr.message);
      await dbQuery(
        `UPDATE documents SET scan_status = 'error', scan_error = $1, updated_at = NOW() WHERE id = $2`,
        [scanErr.message, savedDoc.id]
      );
    }

    const updatedDoc = await dbQuery("SELECT * FROM documents WHERE id = $1", [savedDoc.id]);

    res.status(201).json({
      message: "Fichier uploadÃ© et analysÃ© avec succÃ¨s",
      document: updatedDoc[0],
      scan_success: scanResult?.success || false,
      extractedData: scanResult?.extractedData || null,
      confidence_score: scanResult?.confidence_score || 0,
      scan_error: scanResult?.error || null,
    });
  } catch (err) {
    console.error("Upload+scan error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Autres routes (GET, DELETE, etc.)...

module.exports = router;
