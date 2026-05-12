const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary"); // server/config/cloudinary.js

// Storage config: organise par client et type de document
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Determine folder: documents/{code_entreprise}/{type_document}
    const entreprise = req.body.code_entreprise || req.query.code_entreprise || "general";
    const docType = req.body.doc_type || "autres";

    // Determine resource type
    const isRaw =
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "text/csv";

    return {
      folder: `compta_saas/${entreprise}/${docType}`,
      resource_type: isRaw ? "raw" : "auto",
      // Keep original filename (sanitized)
      public_id: `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      // PDF: keep format for direct viewing
      format: undefined,
    };
  },
});

// File filter: accept PDF, images, Excel, CSV
const fileFilter = (req, file, cb) => {
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
    cb(
      new Error(
        `Type de fichier non supporté: ${file.mimetype}. Acceptés: PDF, Images (JPG/PNG/TIFF), Excel, CSV`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
});

module.exports = upload;
