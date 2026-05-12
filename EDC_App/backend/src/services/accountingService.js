const { query } = require("../config/db");
async function createEntries({ tenantId, documentId, userId, lines }) {
  for (const line of lines) {
    await query(`INSERT INTO ecritures_comptables (document_id, entreprise_id, account_number, label, debit, credit, entry_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [documentId, tenantId, line.accountNumber, line.label, line.debit || 0, line.credit || 0, line.entryDate, userId]);
  }
  await query(`UPDATE documents SET status='accounted' WHERE id=$1 AND entreprise_id=$2 AND status='validated'`, [documentId, tenantId]);
}
module.exports = { createEntries };
