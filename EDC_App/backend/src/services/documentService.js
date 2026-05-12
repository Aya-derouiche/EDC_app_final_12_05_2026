const { query } = require("../config/db");
const { minioClient, bucket } = require("../config/minio");
const { v4: uuidv4 } = require("uuid");

async function uploadAndProcess({ tenantId, userId, file, documentType }) {
  const objectKey = `compta/${tenantId}/${Date.now()}-${uuidv4()}-${file.originalname}`;
  await minioClient.putObject(bucket, objectKey, file.buffer, file.size, {
    "Content-Type": file.mimetype,
  });

  const sql = `
    INSERT INTO documents_comptabilite
      (date, nature, designation, destinataire, document_fichier, priorite, observations, ajoute_par)
    VALUES
      (CURRENT_DATE, $1, $2, $3, $4, 'Normale', NULL, $5)
    RETURNING *
  `;

  const params = [
    documentType || "Document",
    file.originalname,
    String(tenantId),
    objectKey,
    userId,
  ];

  const { rows } = await query(sql, params);
  return rows[0];
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
