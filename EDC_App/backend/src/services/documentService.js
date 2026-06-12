const { query } = require("../config/db");
const { minioClient, bucket } = require("../config/minio");
const { v4: uuidv4 } = require("uuid");
const { scanDocument } = require("../../services/aiScan");

function pickFirstValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function deriveComptaFields({ file, documentType, formData = {}, extractedData = {} }) {
  const nature = pickFirstValue(
    extractedData.type_document,
    extractedData.type_piece,
    documentType,
    formData.nature,
    "Document"
  );

  const designation = pickFirstValue(
    formData.designation,
    extractedData.num_facture,
    extractedData.num_piece,
    extractedData.num_bl,
    extractedData.num_commande,
    extractedData.titre,
    file.originalname
  );

  const destinataire = pickFirstValue(
    formData.destinataire,
    extractedData.client?.nom,
    extractedData.fournisseur?.nom,
    extractedData.destinataire?.nom,
    extractedData.emetteur,
    extractedData.beneficiaire
  );

  const observations = pickFirstValue(
    formData.observations,
    extractedData.observations,
    Array.isArray(extractedData.informations_cles)
      ? extractedData.informations_cles.join(" | ")
      : ""
  );

  const date =
    pickFirstValue(
      formData.date,
      extractedData.date_facture,
      extractedData.date_piece,
      extractedData.date_bl,
      extractedData.date_commande,
      extractedData.date
    ) || null;

  return {
    date,
    nature,
    designation,
    destinataire: destinataire || null,
    priorite: pickFirstValue(formData.priorite, "Normale"),
    observations: observations || null,
  };
}

async function uploadAndProcess({ tenantId, userId, file, documentType, formData = {} }) {
  const objectKey = `compta/${tenantId}/${Date.now()}-${uuidv4()}-${file.originalname}`;
  await minioClient.putObject(bucket, objectKey, file.buffer, file.size, {
    "Content-Type": file.mimetype,
  });

  let scanResult;
  try {
    scanResult = await scanDocument(file.buffer, file.mimetype, documentType || formData.nature);
  } catch (scanError) {
    scanResult = {
      success: false,
      error: scanError.message,
      confidence_score: 0,
      extractedData: null,
    };
  }
  const extractedData = scanResult?.success ? scanResult.extractedData || {} : {};
  const derived = deriveComptaFields({ file, documentType, formData, extractedData });

  const sql = `
    INSERT INTO documents_comptabilite
      (date, nature, designation, destinataire, document_fichier, priorite, observations, ajoute_par)
    VALUES
      (COALESCE($1::date, CURRENT_DATE), $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const params = [
    derived.date,
    derived.nature,
    derived.designation,
    derived.destinataire,
    objectKey,
    derived.priorite,
    derived.observations,
    userId,
  ];

  const { rows } = await query(sql, params);
  return {
    ...rows[0],
    scan_success: !!scanResult?.success,
    scan_error: scanResult?.error || null,
    confidence_score: scanResult?.confidence_score || 0,
    extractedData: scanResult?.extractedData || null,
    minio_object_name: objectKey,
  };
}

async function listByTenant(_tenantId) {
  const sql = `
    SELECT
      d.*,
      COALESCE(u.identite, '—') AS ajoute_par_nom
    FROM documents_comptabilite d
    LEFT JOIN utilisateurs u ON d.ajoute_par = u.id
    ORDER BY d.created_at DESC, d.id DESC
  `;
  const { rows } = await query(sql);
  return rows;
}

async function validateDocument({ documentId, correctedData }) {
  const priorite = correctedData?.priorite || null;
  const observations = correctedData?.observations || null;

  await query(
    `UPDATE documents_comptabilite
     SET priorite = COALESCE($1, priorite), observations = COALESCE($2, observations)
     WHERE id = $3`,
    [priorite, observations, documentId]
  );
}

module.exports = { uploadAndProcess, listByTenant, validateDocument };
