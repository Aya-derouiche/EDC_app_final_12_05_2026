const XLSX = require("xlsx");
const { query } = require("../config/db");

const BANK_TABLES = {
  imports: "gym_bank_return_imports",
  rows: "gym_bank_return_items",
};

const TABLE_CANDIDATES = {
  members: ["members", "membres"],
  subscriptions: ["subscriptions", "abonnements"],
  payments: ["payments", "payements", "paiements"],
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function parseAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toFixed(3));
  const parsed = Number(String(value).replace(/\s+/g, "").replace(/,/g, "."));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(3)) : null;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{8}$/.test(text)) {
    const yyyy = text.slice(0, 4);
    const mm = text.slice(4, 6);
    const dd = text.slice(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  }
  const asDate = new Date(text);
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString();
  return text;
}

function headerKey(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function rowValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
  }
  return "";
}

function enrichBankRows(rows, catalog) {
  const membersById = new Map((catalog?.members || []).map((member) => [String(member.id), member]));
  const subscriptionsById = new Map((catalog?.subscriptions || []).map((subscription) => [String(subscription.id), subscription]));

  return (rows || []).map((row) => {
    const member = membersById.get(String(row.member_id || "")) || null;
    const subscription = subscriptionsById.get(String(row.subscription_id || "")) || null;
    return {
      ...row,
      full_name: member?.full_name || null,
      member_code: member?.member_code || null,
      employee_id: member?.employee_id || null,
      member_bank_account: member?.bank_account || null,
      plan_name: subscription?.plan_name || subscription?.payment_method || null,
      subscription_amount: subscription?.amount ?? null,
    };
  });
}

function scoreMatch({ row, member, subscription }) {
  let score = 0;
  const reasons = [];
  const rib = normalizeDigits(row.rib_payeur);
  const libelle = normalizeText(row.libelle);
  const amount = parseAmount(row.montant);
  const memberName = normalizeText(member.full_name);
  const memberCode = normalizeText(member.member_code);
  const employeeId = normalizeText(member.employee_id);
  const memberRib = normalizeDigits(member.bank_account);
  const subscriptionRib = normalizeDigits(subscription.bank_account);
  const subscriptionAmount = parseAmount(subscription.amount);

  if (rib && (rib === memberRib || rib === subscriptionRib)) {
    score += 70;
    reasons.push("rib");
  }
  if (libelle && memberName && libelle.includes(memberName)) {
    score += 45;
    reasons.push("nom");
  }
  if (libelle && memberCode && libelle.includes(memberCode)) {
    score += 20;
    reasons.push("code");
  }
  if (libelle && employeeId && libelle.includes(employeeId)) {
    score += 18;
    reasons.push("matricule");
  }
  if (amount !== null && subscriptionAmount !== null && Math.abs(amount - subscriptionAmount) < 0.01) {
    score += 15;
    reasons.push("montant");
  }

  return { score, reasons };
}

async function tableExists(tableName) {
  const { rows } = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = ANY (current_schemas(false))
         AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return rows[0]?.exists === true;
}

async function columnsFor(tableName) {
  const { rows } = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = ANY (current_schemas(false))
       AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map((row) => row.column_name));
}

async function resolveTable(candidates) {
  for (const tableName of candidates) {
    if (await tableExists(tableName)) return tableName;
  }
  return null;
}

function selectColumns(columns, candidates, fallback = "NULL") {
  return candidates
    .map((column) => {
      if (columns.has(column)) return `${column} AS ${column}`;
      return `${fallback} AS ${column}`;
    })
    .join(", ");
}

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS ${BANK_TABLES.imports} (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL,
      uploaded_by BIGINT,
      source_bank VARCHAR(120),
      original_filename TEXT NOT NULL,
      sheet_name TEXT,
      import_status VARCHAR(30) NOT NULL DEFAULT 'processed',
      total_rows INTEGER NOT NULL DEFAULT 0,
      matched_rows INTEGER NOT NULL DEFAULT 0,
      rejected_rows INTEGER NOT NULL DEFAULT 0,
      unmatched_rows INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ${BANK_TABLES.rows} (
      id BIGSERIAL PRIMARY KEY,
      import_id BIGINT NOT NULL REFERENCES ${BANK_TABLES.imports}(id) ON DELETE CASCADE,
      tenant_id BIGINT NOT NULL,
      row_number INTEGER NOT NULL,
      emitter_code VARCHAR(80),
      creditor_rib TEXT,
      payer_rib TEXT,
      domicile_ref TEXT,
      libelle TEXT,
      due_date TEXT,
      amount NUMERIC(14,3),
      motif_rejet TEXT,
      normalized_status VARCHAR(30) NOT NULL,
      match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
      match_source VARCHAR(50),
      follow_up_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      member_id BIGINT,
      subscription_id BIGINT,
      payment_id BIGINT,
      bank_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const alterStatements = [
    `ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30)`,
    `ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS bank_return_status VARCHAR(30)`,
    `ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS bank_return_reason TEXT`,
    `ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS bank_returned_at TIMESTAMPTZ`,
    `ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS last_bank_import_id BIGINT`,
    `ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS last_bank_match_score NUMERIC(5,2)`,
    `ALTER TABLE IF EXISTS subscriptions ADD COLUMN IF NOT EXISTS last_bank_match_source VARCHAR(50)`,
    `ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30)`,
    `ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS bank_return_status VARCHAR(30)`,
    `ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS bank_return_reason TEXT`,
    `ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS bank_returned_at TIMESTAMPTZ`,
    `ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS last_bank_import_id BIGINT`,
    `ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS last_bank_match_score NUMERIC(5,2)`,
    `ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS last_bank_match_source VARCHAR(50)`,
  ];

  for (const statement of alterStatements) {
    await query(statement);
  }
}

function normalizeSheetRows(rows) {
  return rows
    .map((raw) => {
      const normalized = {};
      for (const [key, value] of Object.entries(raw || {})) {
        normalized[headerKey(key)] = value;
      }
      return normalized;
    })
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
}

async function loadGymCatalog() {
  const memberTable = await resolveTable(TABLE_CANDIDATES.members);
  const subscriptionTable = await resolveTable(TABLE_CANDIDATES.subscriptions);
  const paymentTable = await resolveTable(TABLE_CANDIDATES.payments);

  const members = [];
  const subscriptions = [];
  const payments = [];

  if (memberTable) {
    const memberColumns = await columnsFor(memberTable);
    const select = selectColumns(memberColumns, [
      "id",
      "full_name",
      "member_code",
      "employee_id",
      "cin",
      "phone",
      "email",
      "bank_account",
      "status",
      "branch_id",
    ]);
    const { rows } = await query(`SELECT ${select} FROM ${memberTable}`);
    members.push(...rows);
  }

  if (subscriptionTable) {
    const subscriptionColumns = await columnsFor(subscriptionTable);
    const select = selectColumns(subscriptionColumns, [
      "id",
      "member_id",
      "plan_name",
      "amount",
      "payment_method",
      "bank_account",
      "status",
      "workflow_status",
      "validation_status",
      "payment_status",
      "due_day",
      "start_date",
      "end_date",
      "last_bank_import_id",
      "last_bank_match_score",
      "last_bank_match_source",
      "bank_return_status",
      "bank_return_reason",
      "bank_returned_at",
    ]);
    const { rows } = await query(`SELECT ${select} FROM ${subscriptionTable}`);
    subscriptions.push(...rows);
  }

  if (paymentTable) {
    const paymentColumns = await columnsFor(paymentTable);
    const select = selectColumns(paymentColumns, [
      "id",
      "member_id",
      "subscription_id",
      "amount",
      "status",
      "payment_status",
      "month_ref",
      "due_date",
      "bank_return_status",
      "bank_return_reason",
      "bank_returned_at",
      "last_bank_import_id",
      "last_bank_match_score",
      "last_bank_match_source",
    ]);
    const { rows } = await query(`SELECT ${select} FROM ${paymentTable}`);
    payments.push(...rows);
  }

  return { memberTable, subscriptionTable, paymentTable, members, subscriptions, payments };
}

function rowHasRejection(row) {
  const motif = normalizeText(row.motif_rejet);
  return Boolean(motif);
}

function statusFromRow(row) {
  return rowHasRejection(row) ? "rejected" : "paid";
}

async function updateBusinessRecord({ tableName, id, status, reason, importId, score, source }) {
  if (!tableName || !id) return;
  const columns = await columnsFor(tableName);
  const sets = [];
  const params = [];
  let i = 1;

  const push = (column, value) => {
    if (!columns.has(column)) return;
    sets.push(`${column} = $${i++}`);
    params.push(value);
  };

  push("bank_return_status", status);
  push("payment_status", status);
  push("bank_return_reason", reason || null);
  push("bank_returned_at", new Date());
  push("last_bank_import_id", importId);
  push("last_bank_match_score", score);
  push("last_bank_match_source", source);
  if (/subscription/i.test(String(tableName))) {
    push("workflow_status", status === "paid" ? "active" : "rejected");
  }
  if (/payment|payement|paiement/i.test(String(tableName))) {
    push("status", status);
  }

  if (!sets.length) return;
  params.push(id);
  await query(`UPDATE ${tableName} SET ${sets.join(", ")} WHERE id = $${i}`, params);
}

async function tryMatchRow(row, catalog) {
  const amount = parseAmount(row.montant);
  const rib = normalizeDigits(row.rib_payeur);
  const libelle = normalizeText(row.libelle);

  const candidates = [];

  for (const member of catalog.members) {
    const subscriptions = catalog.subscriptions.filter((subscription) => String(subscription.member_id || "") === String(member.id));
    if (!subscriptions.length) continue;

    for (const subscription of subscriptions) {
      const { score, reasons } = scoreMatch({ row, member, subscription });
      if (score < 15) continue;
      const payment = (catalog.payments || []).find((candidate) => {
        if (String(candidate.subscription_id || "") && String(candidate.subscription_id) !== String(subscription.id)) return false;
        if (String(candidate.member_id || "") && String(candidate.member_id) !== String(member.id)) return false;
        const candidateAmount = parseAmount(candidate.amount);
        if (amount !== null && candidateAmount !== null && Math.abs(amount - candidateAmount) >= 0.01) return false;
        return true;
      }) || null;

      candidates.push({
        member,
        subscription,
        payment,
        score,
        reasons,
        amount,
        rib,
        libelle,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

async function createImportRecord({ tenantId, userId, filename, sheetName, sourceBank, totalRows, matchedRows, rejectedRows, unmatchedRows }) {
  const { rows } = await query(
    `INSERT INTO ${BANK_TABLES.imports}
      (tenant_id, uploaded_by, source_bank, original_filename, sheet_name, import_status, total_rows, matched_rows, rejected_rows, unmatched_rows)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [tenantId, userId || null, sourceBank || null, filename, sheetName || null, "processed", totalRows, matchedRows, rejectedRows, unmatchedRows]
  );
  return rows[0];
}

async function insertRowRecord({ importId, tenantId, rowNumber, row, match, status, followUpStatus, reason }) {
  const { rows } = await query(
    `INSERT INTO ${BANK_TABLES.rows}
      (import_id, tenant_id, row_number, emitter_code, creditor_rib, payer_rib, domicile_ref, libelle, due_date, amount, motif_rejet, normalized_status, match_score, match_source, follow_up_status, member_id, subscription_id, payment_id, bank_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      importId,
      tenantId,
      rowNumber,
      row.emetteur || null,
      row.rib_creancier || null,
      row.rib_payeur || null,
      row.ref_domiciliation || null,
      row.libelle || null,
      row.date_echeance || null,
      row.montant ?? null,
      row.motif_rejet || null,
      status,
      match?.score || 0,
      match?.reasons?.join(", ") || null,
      followUpStatus,
      match?.member?.id || null,
      match?.subscription?.id || null,
      match?.payment?.id || null,
      { raw: row, status, reason, match: match ? { score: match.score, reasons: match.reasons } : null },
    ]
  );
  return rows[0];
}

async function importExcel({ tenantId, userId, fileBuffer, filename, sourceBank, sheetName }) {
  await ensureSchema();

  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const selectedSheetName = sheetName && workbook.SheetNames.includes(sheetName) ? sheetName : workbook.SheetNames[0];
  if (!selectedSheetName) {
    throw new Error("Le fichier Excel ne contient aucune feuille exploitable.");
  }

  const sheet = workbook.Sheets[selectedSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const normalizedRows = normalizeSheetRows(rawRows);

  const catalog = await loadGymCatalog();
  const detailedRows = [];
  let matchedRows = 0;
  let rejectedRows = 0;
  let unmatchedRows = 0;

  const importRecord = await createImportRecord({
    tenantId,
    userId,
    filename,
    sheetName: selectedSheetName,
    sourceBank: sourceBank || "bank-return",
    totalRows: 0,
    matchedRows: 0,
    rejectedRows: 0,
    unmatchedRows: 0,
  });

  for (let index = 0; index < normalizedRows.length; index += 1) {
    const raw = normalizedRows[index];
    const row = {
      emetteur: rowValue(raw, ["emetteur"]),
      rib_creancier: rowValue(raw, ["ribcreancier", "ribcreancier", "rib crediteur", "ribcreditor"]),
      rib_payeur: rowValue(raw, ["ribpayeur", "ribpayeur", "rib du payeur", "ribpayeuridentifiant"]),
      ref_domiciliation: rowValue(raw, ["refdomiciliation", "referencedomiciliation", "ref domiciliation"]),
      libelle: rowValue(raw, ["libelle"]),
      date_echeance: parseDate(rowValue(raw, ["dateecheance", "date echeance", "echeance"])),
      montant: parseAmount(rowValue(raw, ["montant", "amount"])),
      motif_rejet: rowValue(raw, ["motifrejet", "motif rejet", "motif"]),
    };

    const status = statusFromRow(row);
    const match = status === "paid" ? await tryMatchRow(row, catalog) : await tryMatchRow(row, catalog);
    const isMatched = Boolean(match);
    const followUpStatus = status === "rejected" ? "pending" : isMatched ? "resolved" : "review";
    const reason = row.motif_rejet || (isMatched ? null : "Aucun rapprochement automatique");

    if (status === "rejected") {
      rejectedRows += 1;
    } else if (isMatched) {
      matchedRows += 1;
    } else {
      unmatchedRows += 1;
    }

    const record = await insertRowRecord({
      importId: importRecord.id,
      tenantId,
      rowNumber: index + 1,
      row,
      match,
      status: status === "rejected" ? "rejected" : isMatched ? "paid" : "unmatched",
      followUpStatus,
      reason,
    });
    detailedRows.push(record);
  }

  await query(
    `UPDATE ${BANK_TABLES.imports}
     SET total_rows = $1,
         matched_rows = $2,
         rejected_rows = $3,
         unmatched_rows = $4
     WHERE id = $5`,
    [normalizedRows.length, matchedRows, rejectedRows, unmatchedRows, importRecord.id]
  );

  importRecord.total_rows = normalizedRows.length;
  importRecord.matched_rows = matchedRows;
  importRecord.rejected_rows = rejectedRows;
  importRecord.unmatched_rows = unmatchedRows;

  for (const record of detailedRows) {
    if (record.member_id && record.subscription_id && record.normalized_status === "paid") {
      await updateBusinessRecord({
        tableName: catalog.subscriptionTable,
        id: record.subscription_id,
        status: "paid",
        reason: null,
        importId: importRecord.id,
        score: Number(record.match_score || 0),
        source: record.match_source || "auto",
      });
      await updateBusinessRecord({
        tableName: catalog.paymentTable,
        id: record.payment_id || record.subscription_id,
        status: "paid",
        reason: null,
        importId: importRecord.id,
        score: Number(record.match_score || 0),
        source: record.match_source || "auto",
      }).catch(() => {});
    }

    if (record.normalized_status === "rejected") {
      await updateBusinessRecord({
        tableName: catalog.subscriptionTable,
        id: record.subscription_id,
        status: "rejected",
        reason: record.motif_rejet || "Retour bancaire rejeté",
        importId: importRecord.id,
        score: Number(record.match_score || 0),
        source: record.match_source || "auto",
      }).catch(() => {});
      await updateBusinessRecord({
        tableName: catalog.paymentTable,
        id: record.payment_id || record.subscription_id,
        status: "rejected",
        reason: record.motif_rejet || "Retour bancaire rejeté",
        importId: importRecord.id,
        score: Number(record.match_score || 0),
        source: record.match_source || "auto",
      }).catch(() => {});
    }
  }

  return {
    import: importRecord,
    summary: {
      totalRows: normalizedRows.length,
      matchedRows,
      rejectedRows,
      unmatchedRows,
    },
    rows: enrichBankRows(detailedRows, catalog),
  };
}

async function listImports({ tenantId, limit = 20 }) {
  await ensureSchema();
  const { rows } = await query(
    `SELECT *
     FROM ${BANK_TABLES.imports}
     WHERE tenant_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [tenantId, Math.min(Math.max(Number(limit) || 20, 1), 100)]
  );
  return rows;
}

async function listRows({ tenantId, limit = 50 }) {
  await ensureSchema();
  const catalog = await loadGymCatalog();
  const { rows } = await query(
    `SELECT r.*, i.original_filename, i.source_bank, i.sheet_name, i.created_at AS import_created_at
     FROM ${BANK_TABLES.rows} r
     INNER JOIN ${BANK_TABLES.imports} i ON i.id = r.import_id
     WHERE r.tenant_id = $1
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT $2`,
    [tenantId, Math.min(Math.max(Number(limit) || 50, 1), 200)]
  );
  return enrichBankRows(rows, catalog);
}

async function recordManualReturn({ tenantId, userId, body }) {
  await ensureSchema();
  const rawStatus = normalizeText(body.result_status);
  const normalizedStatus = ["success", "paid", "ok"].includes(rawStatus) ? "paid" : "rejected";
  const reason = body.failure_reason || (normalizedStatus === "rejected" ? "Retour bancaire saisi manuellement" : null);
  const sourceBank = body.bank_name || "manual";
  const paymentId = body.payment_id ? Number(body.payment_id) : null;

  const importRecord = await createImportRecord({
    tenantId,
    userId,
    filename: `manual-${Date.now()}.json`,
    sheetName: null,
    sourceBank,
    totalRows: 1,
    matchedRows: normalizedStatus === "paid" ? 1 : 0,
    rejectedRows: normalizedStatus === "rejected" ? 1 : 0,
    unmatchedRows: 0,
  });

  const row = await query(
    `INSERT INTO ${BANK_TABLES.rows}
     (import_id, tenant_id, row_number, emitter_code, creditor_rib, payer_rib, domicile_ref, libelle, due_date, amount, motif_rejet, normalized_status, match_score, match_source, follow_up_status, member_id, subscription_id, payment_id, bank_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      importRecord.id,
      tenantId,
      1,
      null,
      null,
      null,
      null,
      body.libelle || "Retour bancaire manuel",
      null,
      null,
      reason,
      normalizedStatus,
      100,
      "manual",
      normalizedStatus === "rejected" ? "pending" : "resolved",
      null,
      null,
      paymentId,
      { manual: true, body },
    ]
  );

  if (paymentId) {
    await updateBusinessRecord({
      tableName: await resolveTable(TABLE_CANDIDATES.payments),
      id: paymentId,
      status: normalizedStatus,
      reason,
      importId: importRecord.id,
      score: 100,
      source: "manual",
    }).catch(() => {});
  }

  return { import: importRecord, row: row.rows?.[0] || row };
}

module.exports = {
  ensureSchema,
  importExcel,
  listImports,
  listRows,
  recordManualReturn,
};
