const router = require("express").Router();
const multer = require("multer");
const { query } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const config = require("../config");
const { uploadGymFile, uploadGymBuffer, objectStream, presignedUrl, removeObject, isMinioUnavailableError, bucket: minioBucket } = require("../storage/minio");
const {
  CONTRACT_TYPES,
  clauseRecommendations,
  ensureIdentityBlock,
  generateContractDraft,
  normalizeLanguage,
  normalizeType,
  stripHtml,
} = require("../services/contractAiService");
const { generatePdf } = require("../services/pdfGenerator");
const { generatePdfFromHtml } = require("../services/htmlPdfGenerator");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("fr-FR");
}

function blank(value, fallback = "..............................................................") {
  return value ? escapeHtml(value) : fallback;
}

function formatMonthYear(value) {
  if (!value) return "........................";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(String(value).slice(0, 10));
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatAmount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
}

function normalizeMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function fixedWidth(value, length, { pad = " ", align = "left" } = {}) {
  const text = String(value ?? "");
  const clipped = text.length > length ? text.slice(0, length) : text;
  if (align === "right") {
    return clipped.padStart(length, pad);
  }
  return clipped.padEnd(length, pad);
}

function fixedDigits(value, length, { align = "right" } = {}) {
  return fixedWidth(digitsOnly(value), length, { pad: "0", align });
}

function formatYmd(value) {
  if (!value) return "";
  const text = String(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}${match[2]}${match[3]}`;
  const compact = digitsOnly(value);
  return compact.length >= 8 ? compact.slice(0, 8) : compact.padEnd(8, "0");
}

function formatYymmdd(value) {
  const ymd = formatYmd(value);
  return ymd.length === 8 ? ymd.slice(2) : fixedDigits(ymd, 6);
}

function stripDigits(value) {
  return String(value || "").replace(/\s+/g, "");
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function dueDateForMonth(monthRef, dueDay) {
  const normalizedMonth = String(monthRef || "").slice(0, 7);
  const match = normalizedMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return normalizedMonth ? `${normalizedMonth}-01` : "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const safeDay = Math.max(1, Math.min(Number(dueDay || 5), 31));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(safeDay, lastDay);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function parsePagination(req, defaults = {}) {
  const defaultLimit = Number(defaults.defaultLimit || 50);
  const maxLimit = Number(defaults.maxLimit || 200);
  const page = parsePositiveInt(req.query?.page, 1);
  const limitRaw = req.query?.limit !== undefined ? parsePositiveInt(req.query.limit, defaultLimit) : defaultLimit;
  const limit = Math.max(1, Math.min(limitRaw, maxLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset, paginated: req.query?.page !== undefined || req.query?.limit !== undefined };
}

function maybePaginatedResponse(rows, total, pagination) {
  if (!pagination.paginated) return rows;
  return {
    items: rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      total_pages: total > 0 ? Math.ceil(total / pagination.limit) : 0,
    },
  };
}

const responseCache = new Map();
function getCachedValue(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedValue(key, value, ttlMs = 30000) {
  responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function fetchListWithPagination({ dataSql, countSql, params, pagination }) {
  if (!pagination.paginated) {
    const out = await query(dataSql, params);
    return { rows: out.rows, total: out.rows.length };
  }

  const dataOut = await query(`${dataSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pagination.limit, pagination.offset]);
  const totalOut = await query(countSql, params);
  return { rows: dataOut.rows, total: Number(totalOut.rows[0]?.total || 0) };
}

function userDisplayName(user) {
  return user?.full_name || user?.name || user?.username || user?.email || String(user?.id || "unknown");
}

function buildFixedLine(...segments) {
  return segments.join("");
}

async function logGenerationOperation({ req, tenantCode, branchId = null, operationType, entityType = null, entityId = null, fileName = null, mimeType = null, status = "success", details = {} }) {
  try {
    await query(
      `INSERT INTO gym_generation_logs
       (tenant_code, branch_id, operation_type, entity_type, entity_id, file_name, mime_type, status, generated_by, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        tenantCode,
        branchId,
        operationType,
        entityType,
        entityId,
        fileName,
        mimeType,
        status,
        req.user?.id || null,
        JSON.stringify({
          ...details,
          generated_by_label: userDisplayName(req.user),
          generated_at: new Date().toISOString(),
        }),
      ]
    );
  } catch (error) {
    console.warn("[gym generation log skipped]", error?.message || error);
  }
}

function buildBankXml({ tenantCode, monthRef, generatedAt, generatedBy, rows }) {
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const bankCode = String(process.env.GYM_BANK_CODE || "2500").trim() || "2500";
  const bankCentralCode = String(process.env.GYM_BANK_CENTRAL_CODE || "0127").trim() || "0127";
  const issuerCode = String(process.env.GYM_BANK_ISSUER_CODE || "25016").trim() || "25016";
  const authBankCode = String(process.env.GYM_AUTH_BANK_CODE || "2508").trim() || "2508";
  const authBranchCode = String(process.env.GYM_AUTH_BRANCH_CODE || "500000").trim() || "500000";
  const creditorName = String(process.env.GYM_CREDITOR_NAME || "La Sté Olympe Gym").trim() || "La Sté Olympe Gym";
  const supportDigits = digitsOnly(`${tenantCode}${monthRef || generatedAt}`).padEnd(14, "0").slice(0, 14);
  const supportReference = `P${supportDigits}`.slice(0, 15);
  const dueDate = dueDateForMonth(monthRef, 5);
  const dueDateYymmdd = formatYymmdd(dueDate);
  const generatedByName = userDisplayName(generatedBy);
  const totalCents = Math.round(Number(totalAmount || 0) * 100);

  const header = buildFixedLine(
    fixedWidth("09", 2),
    fixedDigits(bankCode, 4),
    fixedDigits(bankCentralCode, 4),
    fixedDigits(issuerCode, 5),
    "0",
    fixedWidth(`${supportDigits}20`, 16),
    fixedWidth(`${dueDateYymmdd}${supportReference.slice(0, 10)}`, 16),
    fixedWidth(`${fixedDigits(rows.length, 10)}000000`, 16),
    fixedWidth(`${fixedDigits(totalCents, 12)}0000`, 16),
    fixedWidth(`${fixedDigits(rows.length, 4)}${" ".repeat(12)}`, 16),
    fixedWidth("", 64)
  );

  const detailLines = rows.map((row, index) => {
    const memberCode = digitsOnly(row.member_code || row.employee_id || row.subscription_id || String(index + 1));
    const accountDigits = digitsOnly(row.bank_account || "");
    const firstNameChunk = fixedWidth(row.full_name || "", 10);
    const secondNameChunk = fixedWidth((row.full_name || "").slice(10), 16);
    const amountCents = Math.round(Number(row.amount || 0) * 100);
    const referenceTail = `${memberCode || String(index + 1).padStart(8, "0")}`.slice(-2);
    return buildFixedLine(
      fixedWidth("02", 2),
      fixedDigits(bankCode, 4),
      fixedDigits(bankCentralCode, 4),
      fixedDigits(issuerCode, 5),
      "0",
      fixedWidth(supportDigits.slice(0, 14) + referenceTail, 16),
      fixedWidth(`${accountDigits.slice(0, 8).padEnd(8, "0")}${memberCode.padStart(8, "0").slice(-8)}`, 16),
      fixedWidth(`${accountDigits.slice(8, 16).padEnd(8, "0")}${digitsOnly(row.cin || "").slice(-8).padStart(8, "0")}`, 16),
      fixedWidth(`${memberCode.padStart(6, "0").slice(-6)}${firstNameChunk}`, 16),
      fixedWidth(secondNameChunk, 16),
      fixedWidth("", 16),
      fixedWidth("".padStart(8, " "), 8),
      fixedDigits(amountCents, 8),
      fixedDigits(amountCents % 100, 2),
      fixedWidth("", 30)
    );
  }).join("\r");

  const authLines = rows.map((row, index) => {
    const accountDigits = digitsOnly(row.bank_account || "");
    const memberCode = digitsOnly(row.member_code || row.employee_id || row.subscription_id || String(index + 1));
    const amountCents = Math.round(Number(row.amount || 0) * 100);
    const startDate = formatYmd(row.start_date) || formatYmd(dueDate);
    const endDate = formatYmd(row.end_date) || formatYmd(row.start_date) || formatYmd(dueDate);
    const authRef = `${memberCode || String(index + 1).padStart(8, "0")}`.padStart(8, "0").slice(-8);
    return buildFixedLine(
      fixedWidth("01", 2),
      fixedDigits(authBankCode, 4),
      fixedDigits(authBranchCode, 6),
      fixedDigits(authRef, 8),
      fixedWidth(`${accountDigits.slice(0, 8).padEnd(8, "0")}${accountDigits.slice(8, 12).padEnd(8, "0")}`, 16),
      fixedDigits(amountCents, 12),
      "1A",
      fixedWidth(startDate || dueDate, 8),
      fixedWidth(endDate || dueDate, 8),
      fixedWidth("", 94)
    );
  }).join("\r");

  return [header, detailLines, authLines].filter(Boolean).join("\r");
}

function normalizeBankExportRow(row, index) {
  return {
    index: index + 1,
    payment_id: row.payment_id || row.id || row.paymentId || row.subscription_id || index + 1,
    subscription_id: row.subscription_id,
    member_code: String(row.member_code || row.employee_id || row.subscription_id || index + 1),
    full_name: String(row.full_name || ""),
    employee_id: String(row.employee_id || ""),
    cin: String(row.cin || ""),
    bank_account: String(row.bank_account || ""),
    plan_name: String(row.plan_name || "Standard"),
    amount: Number(row.amount || 0),
    due_date: row.due_date || "",
    start_date: row.start_date || "",
    end_date: row.end_date || "",
    payment_status: row.payment_status || "",
    workflow_status: row.workflow_status || "",
    subscription_status: row.subscription_status || "",
    contract_number: row.contract_number || `SD-${row.subscription_id || index + 1}`,
    authorization_reference: row.authorization_reference || row.deduction_doc_ref || `AUTH-SALARY-${row.subscription_id || index + 1}`,
    branch_name: row.branch_name || "",
    validation_status: row.validation_status || "",
  };
}

function buildSalaryDeductionBatchData({ tenantCode, monthRef, generatedAt, generatedBy, rows }) {
  const normalizedRows = rows.map((row, index) => normalizeBankExportRow(row, index));
  const totalAmount = normalizedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return {
    tenantCode,
    monthRef,
    generatedAt,
    generatedBy,
    rows: normalizedRows,
    totalAmount,
    totalCents: Math.round(Number(totalAmount || 0) * 100),
    bankCode: String(process.env.GYM_BANK_CODE || "2500").trim() || "2500",
    bankCentralCode: String(process.env.GYM_BANK_CENTRAL_CODE || "0127").trim() || "0127",
    issuerCode: String(process.env.GYM_BANK_ISSUER_CODE || "25016").trim() || "25016",
    authBankCode: String(process.env.GYM_AUTH_BANK_CODE || "2508").trim() || "2508",
    authBranchCode: String(process.env.GYM_AUTH_BRANCH_CODE || "500000").trim() || "500000",
    creditorName: String(process.env.GYM_CREDITOR_NAME || "La Sté Olympe Gym").trim() || "La Sté Olympe Gym",
    supportDigits: digitsOnly(`${tenantCode}${monthRef || generatedAt}`).padEnd(14, "0").slice(0, 14),
  };
}

function buildSalaryDeductionTxt(batch) {
  const { tenantCode, monthRef, generatedAt, generatedBy, rows, totalCents, bankCode, bankCentralCode, issuerCode, authBankCode, authBranchCode, creditorName, supportDigits } = batch;
  const supportReference = `P${supportDigits}`.slice(0, 15);
  const dueDate = dueDateForMonth(monthRef, 5);
  const dueDateYymmdd = formatYmd(dueDate).slice(2);
  const generatedByName = userDisplayName(generatedBy);

  const header = buildFixedLine(
    fixedWidth("09", 2),
    fixedDigits(bankCode, 4),
    fixedDigits(bankCentralCode, 4),
    fixedDigits(issuerCode, 5),
    "0",
    fixedWidth(`${supportDigits}20`, 16),
    fixedWidth(`${dueDateYymmdd}${supportReference.slice(0, 10)}`, 16),
    fixedWidth(`${fixedDigits(rows.length, 10)}000000`, 16),
    fixedWidth(`${fixedDigits(totalCents, 12)}0000`, 16),
    fixedWidth(`${fixedDigits(rows.length, 4)}${" ".repeat(12)}`, 16),
    fixedWidth("", 64)
  );

  const detailLines = rows.map((row) => {
    const accountDigits = digitsOnly(row.bank_account || "");
    const firstNameChunk = fixedWidth(row.full_name || "", 10);
    const secondNameChunk = fixedWidth((row.full_name || "").slice(10), 16);
    const amountCents = Math.round(Number(row.amount || 0) * 100);
    const referenceTail = `${row.member_code || row.index}`.slice(-2);
    return buildFixedLine(
      fixedWidth("02", 2),
      fixedDigits(bankCode, 4),
      fixedDigits(bankCentralCode, 4),
      fixedDigits(issuerCode, 5),
      "0",
      fixedWidth(supportDigits.slice(0, 14) + referenceTail, 16),
      fixedWidth(`${accountDigits.slice(0, 8).padEnd(8, "0")}${String(row.member_code || row.index).padStart(8, "0").slice(-8)}`, 16),
      fixedWidth(`${accountDigits.slice(8, 16).padEnd(8, "0")}${digitsOnly(row.cin || "").slice(-8).padStart(8, "0")}`, 16),
      fixedWidth(`${String(row.member_code || row.index).padStart(6, "0").slice(-6)}${firstNameChunk}`, 16),
      fixedWidth(secondNameChunk, 16),
      fixedWidth("", 16),
      fixedWidth("".padStart(8, " "), 8),
      fixedDigits(amountCents, 8),
      fixedDigits(amountCents % 100, 2),
      fixedWidth("", 30)
    );
  }).join("\r");

  const footer = buildFixedLine(
    fixedWidth("99", 2),
    fixedDigits(bankCode, 4),
    fixedDigits(bankCentralCode, 4),
    fixedDigits(issuerCode, 5),
    "0",
    fixedWidth(supportDigits.slice(0, 14), 16),
    fixedWidth("", 16),
    fixedWidth(`${fixedDigits(rows.length, 10)}000000`, 16),
    fixedWidth(`${fixedDigits(totalCents, 12)}0000`, 16),
    fixedWidth("", 80)
  );

  return [
    header,
    detailLines,
    footer,
  ].filter(Boolean).join("\r\n");
}

function buildSalaryDeductionXml(batch) {
  const { tenantCode, monthRef, generatedAt, rows } = batch;
  const formatDueDateLabel = (value) => {
    const raw = String(value || "").slice(0, 10);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return escapeXml(raw);
    return parsed.toDateString().slice(0, 10);
  };
  const body = rows.map((row) => `  <Deduction>
    <PaymentId>${escapeXml(String(row.payment_id || ""))}</PaymentId>
    <SubscriptionId>${escapeXml(String(row.subscription_id || ""))}</SubscriptionId>
    <EmployeeId>${escapeXml(row.employee_id || row.member_code || "")}</EmployeeId>
    <MemberName>${escapeXml(row.full_name || "")}</MemberName>
    <CIN>${escapeXml(row.cin || "")}</CIN>
    <BankAccount>${escapeXml(row.bank_account || "")}</BankAccount>
    <Plan>${escapeXml(row.plan_name || "Standard")}</Plan>
    <Amount currency="DT">${Number(row.amount || 0).toFixed(3)}</Amount>
    <DueDate>${formatDueDateLabel(row.due_date || monthRef || generatedAt)}</DueDate>
    <Status>${escapeXml(row.payment_status || row.subscription_status || row.workflow_status || "pending")}</Status>
  </Deduction>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<SalaryDeductions tenant="${escapeXml(tenantCode)}" month="${escapeXml(monthRef)}" generatedAt="${escapeXml(generatedAt)}">
${body}
</SalaryDeductions>`;
}

function buildSalaryDeductionAuthorizationHtml(row) {
  const today = new Date();
  const companyName = row.company_name || row.branch_company_name || "La Sté Olympe Gym";
  const branchName = row.branch_name || "Gym";
  const contractNumber = row.contract_number || `SUB-${row.id}`;
  const city = row.branch_city || "Sousse";
  const deductionDay = Number(row.deduction_day || 5);
  const authorizationReference = row.authorization_reference || row.deduction_doc_ref || `AUTH-SALARY-${row.id}`;
  const rib = stripDigits(row.bank_account || "");
  const ribChars = (rib || "").split("");
  const ribBoxes = Array.from({ length: Math.max(20, ribChars.length || 20) }, (_, i) => `<span>${escapeHtml(ribChars[i] || "")}</span>`).join("");
  return `
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; }
      .page { border: 1px solid #cbd5e1; background: #fff; }
      .header { background: #163252; color: #fff; padding: 14px 18px 16px; }
      .header-grid { display: grid; gap: 12px; grid-template-columns: 1.35fr 0.85fr; align-items: start; }
      .org-name { font-size: 17px; font-weight: 800; letter-spacing: 0.2px; }
      .org-sub { font-size: 11px; margin-top: 4px; opacity: 0.92; }
      .header-meta { border-left: 1px solid rgba(255,255,255,0.35); padding-left: 14px; font-size: 11px; line-height: 1.8; }
      .header-meta strong { display: inline-block; min-width: 78px; }
      .title-wrap { padding: 14px 18px 10px; text-align: center; }
      .title { border: 2px solid #163252; color: #163252; display: inline-block; font-size: 20px; font-weight: 800; padding: 10px 20px; min-width: 520px; }
      .body { padding: 0 18px 16px; font-size: 12px; line-height: 1.45; }
      .block { border: 1px solid #d7dee8; margin-bottom: 10px; padding: 10px 12px; }
      .block-title { color: #163252; font-size: 12px; font-weight: 800; letter-spacing: 0.02em; margin: 0 0 8px; text-transform: uppercase; }
      table.info { width: 100%; border-collapse: collapse; }
      table.info td { border: 1px solid #b9c4d1; padding: 8px 10px; vertical-align: top; }
      table.info td.label { background: #edf3f8; font-weight: 700; width: 30%; }
      .two-col { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
      .line { border-bottom: 1px solid #94a3b8; display: inline-block; min-width: 160px; padding: 0 4px 2px; }
      .statement { font-size: 12px; line-height: 1.6; text-align: justify; }
      .amount-line { border-bottom: 2px solid #163252; color: #163252; display: inline-block; font-weight: 800; min-width: 90px; text-align: center; }
      .rib-row { align-items: start; display: grid; gap: 10px; grid-template-columns: 145px 1fr; }
      .rib-label { font-weight: 700; padding-top: 6px; }
      .rib-grid { display: flex; flex-wrap: wrap; gap: 0; }
      .rib-grid span { align-items: center; border: 1px solid #163252; display: inline-flex; font-size: 15px; height: 28px; justify-content: center; min-width: 26px; }
      .choice-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
      .choice { border: 1px solid #7a8798; border-radius: 999px; padding: 5px 10px; display: inline-flex; align-items: center; gap: 8px; }
      .choice .box { border: 1px solid #163252; display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; font-weight: 700; }
      .signature-row { display: grid; gap: 18px; grid-template-columns: 1fr 1fr; margin-top: 12px; }
      .signature-box { border: 1px solid #b9c4d1; min-height: 126px; padding: 10px 12px; }
      .signature-title { font-weight: 800; margin-bottom: 6px; text-align: center; }
      .footer { border-top: 1px solid #d7dee8; color: #374151; font-size: 11px; margin-top: 10px; padding-top: 8px; }
      .conditions p { margin: 6px 0; }
      .conditions .indent { margin-left: 16px; }
    </style>
    <section class="page">
      <div class="header">
        <div class="header-grid">
          <div>
            <div class="org-name">${escapeHtml(companyName)}</div>
            <div class="org-sub">Autorisation de prélèvement sur salaire</div>
          </div>
          <div class="header-meta">
            <div><strong>Contrat N°</strong> ${escapeHtml(contractNumber)}</div>
            <div><strong>Agence</strong> ${escapeHtml(branchName)}</div>
            <div><strong>Référence</strong> ${escapeHtml(authorizationReference)}</div>
          </div>
        </div>
      </div>

      <div class="title-wrap">
        <div class="title">Autorisation de prélèvement automatique</div>
      </div>

      <div class="body">
        <div class="block">
          <div class="block-title">Informations du titulaire</div>
          <table class="info">
            <tr><td class="label">Nom et prénom</td><td>${blank(row.full_name, "")}</td></tr>
            <tr><td class="label">CIN</td><td>${blank(row.cin, "")}</td></tr>
            <tr><td class="label">Matricule / Employé</td><td>${blank(row.employee_id, "")}</td></tr>
            <tr><td class="label">Téléphone</td><td>${blank(row.phone, "")}</td></tr>
          </table>
        </div>

        <div class="block">
          <div class="block-title">Coordonnées bancaires</div>
          <div class="rib-row">
            <div class="rib-label">RIB / Compte bancaire</div>
            <div>
              <div style="margin-bottom: 8px;"><span class="line">${blank(row.bank_account, "")}</span></div>
              <div class="rib-grid">${ribBoxes}</div>
            </div>
          </div>
        </div>

        <div class="block">
          <div class="block-title">Autorisation</div>
          <div class="statement">
            Je soussigné(e), <strong></strong>, autorise <strong>${escapeHtml(companyName)}</strong> à prélever
            chaque mois sur mon compte bancaire le montant de <span class="amount-line">${escapeHtml(normalizeMoney(row.amount))}</span> DT,
            à compter du <strong>${escapeHtml(formatMonthYear(row.start_date))}</strong> jusqu'au <strong>${escapeHtml(formatMonthYear(row.end_date))}</strong>.
          </div>
          <div class="choice-row">
            <div class="choice"><span class="box">${deductionDay === 5 ? "X" : ""}</span> le 05 de chaque mois</div>
            <div class="choice"><span class="box">${deductionDay === 26 ? "X" : ""}</span> le 26 de chaque mois</div>
          </div>
        </div>

        <div class="two-col">
          <div class="block">
            <div class="block-title">Détails bancaires</div>
            <p><strong>Contrat N° :</strong> ${escapeHtml(contractNumber)}</p>
            <p><strong>Référence d'autorisation :</strong> ${escapeHtml(authorizationReference)}</p>
            <p><strong>Ville :</strong> ${escapeHtml(city)}</p>
            <p><strong>Date :</strong> ${escapeHtml(formatDate(today))}</p>
          </div>
          <div class="block">
            <div class="block-title">Montant</div>
            <p><strong>Mensualité :</strong> ${escapeHtml(normalizeMoney(row.amount))} DT</p>
            <p><strong>Signature :</strong> à apposer ci-dessous</p>
            <p><strong>Statut :</strong> prêt pour impression et dépôt</p>
          </div>
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <div class="signature-title">Signature du titulaire du compte</div>
            <p>(Lu et approuvé)</p>
            <p style="margin-top: 38px;">Nom: <span class="line">${blank(row.full_name, "")}</span></p>
          </div>
          <div class="signature-box">
            <div class="signature-title">Accord de la banque</div>
            <p style="text-align:center;">Visa et cachet du chef d'agence</p>
            <p style="margin-top: 38px;">Cachet: ____________________</p>
          </div>
        </div>

        <div class="block conditions" style="margin-top: 12px;">
          <div class="block-title">Conditions particulières</div>
          <p><strong>1 - Changement des coordonnées bancaires :</strong></p>
          <p class="indent">En cas de changement des coordonnées bancaires, l'abonné doit refaire l'autorisation et la déposer à la salle concernée.</p>
          <p><strong>2 - Modalités de résiliation de l'abonnement :</strong></p>
          <p class="indent"><strong><u>L'abonnement ne peut pas être résilié ni remboursé pendant la durée minimale de 12 mois.</u></strong></p>
          <p class="indent">L'abonnement est conclu pour une durée minimale de 12 mois. <strong><u>Cette durée est incompressible.</u></strong></p>
          <p class="indent">Les montants des prélèvements peuvent être révisés après la période minimale d'engagement.</p>
          <p class="indent">En cas d'impayé, l'abonnement peut être bloqué jusqu'à régularisation.</p>
        </div>

        <div class="footer">
          Fait à ${escapeHtml(city)}, le ${escapeHtml(formatDate(today))}. Référence dossier ${escapeHtml(contractNumber)}.
        </div>
      </div>
    </section>
  `;
}

function buildSalaryDeductionAuthorizationHtmlPaper(row) {
  const today = new Date();
  const companyName = row.company_name || row.branch_company_name || "La Sté Olympe Gym";
  const branchName = row.branch_name || "Gym";
  const contractNumber = row.contract_number || `SUB-${row.id}`;
  const city = row.branch_city || "Sousse";
  const deductionDay = Number(row.deduction_day || 5);
  const authorizationReference = row.authorization_reference || row.deduction_doc_ref || `AUTH-SALARY-${row.id}`;
  const rib = stripDigits(row.bank_account || "");
  const ribChars = (rib || "").split("");
  const ribBoxes = Array.from({ length: Math.max(24, ribChars.length || 24) }, (_, i) => `<span>${escapeHtml(ribChars[i] || "")}</span>`).join("");
  const hand = (value) => `<span class="hand">${escapeHtml(value || "")}</span>`;
  const line = (value, min = 180) => `<span class="line" style="min-width:${min}px">${escapeHtml(value || "")}</span>`;
  return `
    <style>
      @page { size: A4; margin: 7mm; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #fff; color: #404854; font-family: Arial, Helvetica, sans-serif; }
      .sheet { min-height: 279mm; border: 1px solid #e5e7eb; padding: 14px 16px 12px; }
      .top-meta { display: grid; grid-template-columns: 1fr 245px; gap: 12px; margin-bottom: 6px; }
      .meta { font-size: 10.8px; line-height: 1.9; color: #4b5563; }
      .meta-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
      .meta-label { min-width: 70px; text-align: right; }
      .meta-value { display: inline-block; border-bottom: 1px solid #c6ccd6; min-width: 130px; padding: 0 4px 1px; color: #111827; }
      .title {
        width: 66%;
        margin: 2px auto 12px;
        border: 2px solid #808896;
        padding: 9px 16px;
        text-align: center;
        font-size: 18px;
        font-weight: 700;
        color: #4b5563;
      }
      .hand {
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
        font-size: 12.5px;
        line-height: 1.3;
        white-space: nowrap;
      }
      .line {
        display: inline-block;
        border-bottom: 1px solid #b9c2ce;
        min-height: 18px;
        padding: 0 5px 1px;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
      }
      .body { font-size: 11.1px; line-height: 1.72; }
      .row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: center; margin: 5px 0; }
      .row .label { font-weight: 700; color: #374151; }
      .subtle { color: #6b7280; font-size: 10px; }
      .rib-row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: start; margin: 6px 0 8px; }
      .rib-grid { display: flex; flex-wrap: wrap; gap: 0; }
      .rib-grid span {
        width: 24px;
        height: 27px;
        border: 1px solid #7c8a99;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
        font-size: 13px;
      }
      .paragraph { margin: 6px 0; }
      .choice-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 8px 0 10px; }
      .check-box {
        width: 31px;
        height: 22px;
        border: 1px solid #8c96a5;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        background: #fff;
        color: #111827;
      }
      .check-box.active { background: #c3f48f; border-color: #77aa48; }
      .amount-line {
        display: inline-block;
        min-width: 60px;
        text-align: center;
        border-bottom: 1px solid #b9c2ce;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
        font-size: 12.5px;
        padding: 0 4px;
      }
      .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 14px; }
      .signature-box { min-height: 120px; position: relative; }
      .sig-title { font-size: 10.8px; color: #4b5563; font-weight: 700; margin-bottom: 8px; }
      .stamp {
        position: absolute;
        right: 6px;
        bottom: -10px;
        width: 118px;
        height: 118px;
        border: 2px solid rgba(85, 114, 224, 0.5);
        border-radius: 50%;
        color: rgba(85, 114, 224, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(-14deg);
        font-size: 10px;
      }
      .conditions { margin-top: 14px; font-size: 10.1px; line-height: 1.7; color: #4b5563; }
      .conditions h4 { margin: 0 0 6px; font-size: 11px; color: #374151; }
      .conditions .section { margin-top: 8px; }
      .conditions .indent { margin-left: 12px; }
      .footer { margin-top: 10px; font-size: 10.8px; text-align: center; color: #4b5563; }
    </style>
    <section class="sheet">
      <div class="top-meta">
        <div></div>
        <div class="meta">
          <div class="meta-row"><span class="meta-label">contrat N°</span><span class="meta-value">${escapeHtml(contractNumber)}</span></div>
          <div class="meta-row"><span class="meta-label">Salle</span><span class="meta-value">${escapeHtml(branchName)}</span></div>
          <div class="meta-row"><span class="meta-label">commercial</span><span class="meta-value"></span></div>
        </div>
      </div>

      <div class="title">Autorisation de prélèvement automatique</div>

      <div class="body">
        <div class="row">
          <div class="label">Je soussigné(e)</div>
          <div>${hand(row.full_name || "")}</div>
        </div>
        <div class="row">
          <div class="label">Nom et Prénom</div>
          <div>${line(row.full_name || "", 270)} <span class="subtle">( contrat au nom de )</span></div>
        </div>
        <div class="row">
          <div class="label">C.I.N N°</div>
          <div>${hand(row.cin || "")} <span class="subtle">délivrée le</span> ${line(row.cin_issued_at || "", 100)} <span class="subtle">à</span> ${line(row.cin_issued_place || "", 90)}</div>
        </div>
        <div class="row">
          <div class="label">N° téléphone</div>
          <div>${hand(row.phone || "")}</div>
        </div>

        <div class="rib-row">
          <div class="label">RIB Bancaire</div>
          <div class="rib-grid">${ribBoxes}</div>
        </div>

        <div class="paragraph">
          autorise <strong>${escapeHtml(companyName)}</strong> à exécuter les ordres de prélèvements automatiques, fermes et irrévocables sur mon compte
          une fois par mois à partir du mois de ${hand(formatMonthYear(row.start_date) || "")} et jusqu'au mois ${hand(formatMonthYear(row.end_date) || "")}.
        </div>

        <div class="choice-row">
          <span>et ce ou bien le 05 de chaque mois</span>
          <span class="check-box ${deductionDay === 5 ? "active" : ""}">5</span>
          <span>ou bien le 26 de chaque mois</span>
          <span class="check-box ${deductionDay === 26 ? "active" : ""}">26</span>
          <span class="subtle">( à mettre une croix )</span>
        </div>

        <div class="paragraph">
          d'un montant de <span class="amount-line">${escapeHtml(normalizeMoney(row.amount))}</span> dt,000, au profit de <strong>${escapeHtml(companyName)}</strong>
        </div>

        <div class="paragraph">
          MF : 1271307F A/V/0000 - adresse : Immeuble Badr Bloc 8 4ème étage - khezama 47-sousse.
        </div>
        <div class="paragraph">
          et ce sur le compte n° <strong>${escapeHtml(rib || "")}</strong> ouvert à <strong>Banque Zitouna</strong> - agence monastir.
        </div>
        <div class="paragraph">
          * Code de la sté olympe gym au niveau de La Banque Centrale : 0127
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <div class="sig-title">Fait à ${escapeHtml(city)}, le ${escapeHtml(formatDate(today))}</div>
            <div style="margin-top: 28px; font-size: 10.1px;">Signature du Titulaire du compte</div>
            <div style="font-size: 10.1px;">( Lu et approuvé )</div>
            <div style="margin-top: 18px; font-size: 10px;">Nom : <span class="line" style="min-width: 150px;"></span></div>
          </div>
          <div class="signature-box">
            <div class="sig-title">Fait à ${escapeHtml(branchName)}, le ${escapeHtml(formatDate(today))}</div>
            <div style="margin-top: 28px; font-size: 10.1px; text-align: center;">Accord de la Banque</div>
            <div style="font-size: 10.1px; text-align: center;">(Visa et cachet du chef d'agence )</div>
            <div class="stamp">CACHET</div>
          </div>
        </div>

        <div class="conditions">
          <h4>Conditions particulières exigées :</h4>
          <div class="section">
            <strong>1 - Changement des coordonnées bancaires :</strong>
            <div class="indent">En cas de changement des coordonnées bancaires, l'abonné est tenu de refaire l'autorisation et de la déposer dans la salle de sport concernée.</div>
          </div>
          <div class="section">
            <strong>2 - Modalités de résiliation de l'abonnement :</strong>
            <div class="indent">L'abonnement ne peut être résilié ni remboursé pendant la durée minimale, soit 12 mois.</div>
            <div class="indent">L'abonnement est conclu pour une durée minimale de 12 mois. Cette durée est incompressible.</div>
            <div class="indent">Les montants des prélèvements sont garantis pendant la période minimale de l'abonnement.</div>
            <div class="indent">Les montants des prélèvements peuvent être révisés à la hausse après la période minimale d'engagement.</div>
            <div class="indent">En cas d'impayés d'une échéance, la société Olympe Gym bloquera systématiquement l'abonnement.</div>
            <div class="indent">L'adhérent est tenu de régulariser le montant dû pour réactiver son abonnement.</div>
          </div>
          <div class="footer">Fait à ${escapeHtml(city)}, le ${escapeHtml(formatDate(today))}. Référence dossier ${escapeHtml(contractNumber)}.</div>
        </div>
      </div>
    </section>
  `;
}

function tenantCode(req) {
  const code =
    req.user?.code_entreprise ||
    req.user?.codeEntreprise ||
    req.user?.entrepriseId ||
    req.user?.entreprise_id ||
    req.headers["x-tenant-code"] ||
    req.query?.code_entreprise ||
    null;

  return code || config.defaultTenantCode || null;
}

function userTenantCode(req) {
  return req.user?.code_entreprise ||
    req.user?.codeEntreprise ||
    req.user?.entrepriseId ||
    req.user?.entreprise_id ||
    null;
}

const hqRoles = new Set(["admin", "super_admin", "superadmin", "hq_admin", "hqadmin", "siege", "siège", "gym_manager"]);

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isHqUser(req) {
  const role = normalizeRole(req.user?.role);
  if (hqRoles.has(role)) return true;

  // A gym_manager with a branch_id is scoped to that branch. Without one,
  // the account is the central gym manager and must be able to manage branches.
  return role === "gym_manager" && !userBranchId(req);
}

function requireHqAccess(req, res) {
  if (isHqUser(req)) return true;
  res.status(403).json({
    error: "Forbidden",
    detail: "This operation is reserved for HQ-level users.",
  });
  return false;
}

function userBranchId(req) {
  return req.user?.gym_branch_id ||
    req.user?.branch_id ||
    req.user?.branchId ||
    req.user?.gymBranchId ||
    null;
}

function requestedBranchId(req) {
  return req.query?.branch_id || req.headers["x-branch-id"] || null;
}

function accessScope(req) {
  const hq = isHqUser(req);
  const code = String((hq ? tenantCode(req) : userTenantCode(req)) || "");
  const branchId = hq ? requestedBranchId(req) : userBranchId(req);
  return {
    code,
    isHq: hq,
    branchId: branchId ? Number(branchId) : null,
  };
}

function requireBranchScope(req, res) {
  const scope = accessScope(req);
  if (!scope.code) {
    res.status(400).json({ error: "Tenant missing" });
    return null;
  }
  if (!scope.isHq && !scope.branchId) {
    res.status(403).json({
      error: "Forbidden",
      detail: "Branch users must be attached to one gym branch.",
    });
    return null;
  }
  return scope;
}

function scopedBranchId(scope, bodyBranchId = null) {
  return scope.isHq ? (bodyBranchId || scope.branchId || null) : scope.branchId;
}

function addBranchCondition(parts, params, scope, alias = "", column = "branch_id") {
  if (!scope.branchId) return;
  params.push(scope.branchId);
  parts.push(`${alias ? `${alias}.` : ""}${column}=$${params.length}`);
}

const notificationTemplates = {
  subscription_created: {
    category: "subscription",
    severity: "success",
    title: "Nouvel abonnement cree",
    message: "New membership subscription created successfully.",
    audience: "gym_manager,hq_admin",
  },
  subscription_expiring: {
    category: "subscription",
    severity: "warning",
    title: "Abonnement bientot expire",
    message: "Your membership will expire in 3 days.",
    audience: "gym_manager,member",
  },
  subscription_expired: {
    category: "subscription",
    severity: "danger",
    title: "Abonnement expire",
    message: "Your membership has expired.",
    audience: "gym_manager,member",
  },
  payment_success: {
    category: "payment",
    severity: "success",
    title: "Paiement reussi",
    message: "Your monthly payment has been processed successfully.",
    audience: "gym_manager,member",
  },
  payment_failed: {
    category: "payment",
    severity: "warning",
    title: "Echec de paiement",
    message: "Payment attempt failed due to insufficient balance. A second attempt will be scheduled automatically.",
    audience: "gym_manager,hq_admin,member",
  },
  payment_retry_scheduled: {
    category: "payment",
    severity: "warning",
    title: "Deuxieme tentative programmee",
    message: "A second payment attempt is scheduled for tomorrow.",
    audience: "gym_manager,hq_admin,member",
  },
  payment_final_failed: {
    category: "payment",
    severity: "danger",
    title: "Echec definitif du paiement",
    message: "Your subscription payment could not be completed. Please contact the gym administration.",
    audience: "gym_manager,hq_admin,member",
  },
  hq_request_created: {
    category: "hq",
    severity: "info",
    title: "Nouvelle demande siege",
    message: "A new salary deduction request is awaiting validation.",
    audience: "gym_manager,hq_admin",
  },
  authorization_form_generated: {
    category: "hq",
    severity: "success",
    title: "Imprime genere",
    message: "Salary deduction authorization form generated successfully.",
    audience: "gym_manager,hq_admin",
  },
  bank_xml_generated: {
    category: "bank",
    severity: "success",
    title: "Fichier XML genere",
    message: "Bank XML batch file generated successfully.",
    audience: "gym_manager,hq_admin,comptable",
  },
  bank_xml_failed: {
    category: "bank",
    severity: "danger",
    title: "Erreur fichier bancaire",
    message: "Bank XML file generation failed.",
    audience: "gym_manager,hq_admin,comptable",
  },
  gym_class_added: {
    category: "operations",
    severity: "info",
    title: "Nouveau cours ajoute",
    message: "A new fitness class has been scheduled.",
    audience: "gym_manager,member",
  },
  trainer_assigned: {
    category: "operations",
    severity: "info",
    title: "Coach assigne",
    message: "A trainer has been assigned to your session.",
    audience: "gym_manager,member",
  },
  member_checkin: {
    category: "operations",
    severity: "success",
    title: "Check-in membre",
    message: "Member checked in successfully.",
    audience: "gym_manager",
  },
  occupancy_limit_reached: {
    category: "operations",
    severity: "warning",
    title: "Salle surchargee",
    message: "Gym occupancy limit reached.",
    audience: "gym_manager,hq_admin",
  },
  revenue_target_achieved: {
    category: "finance",
    severity: "success",
    title: "Objectif atteint",
    message: "Monthly revenue target achieved.",
    audience: "gym_manager,hq_admin",
  },
  subscriptions_decreased: {
    category: "finance",
    severity: "warning",
    title: "Baisse des abonnements",
    message: "Membership subscriptions decreased by 20% this month.",
    audience: "gym_manager,hq_admin",
  },
  suspicious_login: {
    category: "security",
    severity: "danger",
    title: "Connexion suspecte",
    message: "Suspicious login detected.",
    audience: "gym_manager,admin,hq_admin",
  },
  employee_account_created: {
    category: "security",
    severity: "info",
    title: "Nouveau compte cree",
    message: "A new employee account has been created.",
    audience: "gym_manager,admin,hq_admin",
  },
};

async function createNotification(input) {
  const tpl = notificationTemplates[input.type] || {};
  const channel = input.channel || "in_app";
  const title = input.title || tpl.title || "Notification";
  const message = input.message || tpl.message || "";

  const result = await query(
    `INSERT INTO gym_notifications
     (tenant_code, branch_id, type, category, channel, audience, title, message, severity, entity_type, entity_id, recipient_user_id, recipient_email, recipient_phone, scheduled_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      input.tenant_code,
      input.branch_id || null,
      input.type,
      input.category || tpl.category || "general",
      channel,
      input.audience || tpl.audience || "gym_manager",
      title,
      message,
      input.severity || tpl.severity || "info",
      input.entity_type || null,
      input.entity_id || null,
      input.recipient_user_id || null,
      input.recipient_email || null,
      input.recipient_phone || null,
      input.scheduled_at || null,
    ]
  );

  return result.rows[0];
}

async function safeCreateNotification(input) {
  try {
    return await createNotification(input);
  } catch (e) {
    console.warn("[gym notification skipped]", e?.message || e);
    return null;
  }
}

async function trySaveGymGeneratedFile(args) {
  try {
    return await saveGymGeneratedFile(args);
  } catch (error) {
    if (isMinioUnavailableError(error)) {
      console.warn("[gym storage skipped]", error?.message || error);
      return null;
    }
    throw error;
  }
}

async function saveGymGeneratedFile({ req, tenantCode, branchId = null, entityType = "general", entityId = null, category = "document", filename, mimeType, buffer }) {
  const stored = await uploadGymBuffer({
    tenantCode,
    category,
    entityType,
    entityId,
    filename,
    buffer,
    mimeType,
  });

  const out = await query(
    `INSERT INTO gym_files
     (tenant_code, branch_id, entity_type, entity_id, file_category, original_filename, mime_type, file_size, minio_bucket, minio_object_key, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      tenantCode,
      branchId,
      entityType,
      entityId,
      category,
      filename,
      mimeType,
      buffer.length,
      stored.bucket,
      stored.objectKey,
      req.user?.id || null,
    ]
  );

  return out.rows[0];
}

let schemaReady = false;
let schemaPromise = null;

async function runEnsureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS gym_branches (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      branch_code VARCHAR(80) NOT NULL,
      branch_name VARCHAR(255) NOT NULL,
      city VARCHAR(120),
      hotel_spa_integrated BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (code_entreprise, branch_code)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_members (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      member_code VARCHAR(80) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      employee_id VARCHAR(120),
      cin VARCHAR(120),
      email VARCHAR(255),
      phone VARCHAR(80),
      bank_account VARCHAR(120),
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (code_entreprise, member_code)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      member_id BIGINT NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      plan_name VARCHAR(120) NOT NULL,
      amount NUMERIC(14,3) NOT NULL,
      payment_method VARCHAR(40) NOT NULL CHECK (payment_method IN ('direct','salary_deduction')),
      workflow_status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (workflow_status IN ('pending','printed','sent_hq','processed')),
      status VARCHAR(30) NOT NULL DEFAULT 'pending_validation' CHECK (status IN ('pending_validation','active','suspended','cancelled')),
      due_day INT NOT NULL DEFAULT 5,
      start_date DATE NOT NULL,
      end_date DATE,
      deduction_doc_ref TEXT,
      created_by BIGINT,
      validated_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_payments (
      id BIGSERIAL PRIMARY KEY,
      subscription_id BIGINT NOT NULL REFERENCES gym_subscriptions(id) ON DELETE CASCADE,
      month_ref DATE NOT NULL,
      due_date DATE NOT NULL,
      amount NUMERIC(14,3) NOT NULL,
      attempt_count INT NOT NULL DEFAULT 0,
      status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','insufficient_funds','retry_scheduled')),
      paid_at TIMESTAMP,
      failure_reason TEXT,
      reference VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (subscription_id, month_ref)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payment_attempts (
      id BIGSERIAL PRIMARY KEY,
      payment_id BIGINT NOT NULL REFERENCES gym_payments(id) ON DELETE CASCADE,
      attempt_no INT NOT NULL,
      result_status VARCHAR(40) NOT NULL CHECK (result_status IN ('success','failed','insufficient_funds','retry_scheduled')),
      failure_reason TEXT,
      attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (payment_id, attempt_no)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_contracts (
      id BIGSERIAL PRIMARY KEY,
      subscription_id BIGINT NOT NULL REFERENCES gym_subscriptions(id) ON DELETE CASCADE,
      tenant_code VARCHAR(80) NOT NULL,
      contract_number VARCHAR(80),
      authorization_reference VARCHAR(120),
      contract_pdf_path TEXT,
      mandate_pdf_path TEXT,
      authorization_pdf_path TEXT,
      validation_status VARCHAR(40) NOT NULL DEFAULT 'pending_hq'
        CHECK (validation_status IN ('pending_hq','approved','rejected','needs_update')),
      hq_comment TEXT,
      validated_by BIGINT,
      validated_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hq_validation_queue (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      subscription_id BIGINT NOT NULL REFERENCES gym_subscriptions(id) ON DELETE CASCADE,
      status VARCHAR(40) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','needs_update')),
      reviewer_id BIGINT,
      reviewer_comment TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_code, subscription_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_batch_jobs (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      month_ref DATE NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed')),
      created_by BIGINT,
      processed_by BIGINT,
      processed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_salary_deduction_exports (
      id BIGSERIAL PRIMARY KEY,
      batch_job_id BIGINT NOT NULL REFERENCES gym_batch_jobs(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_format VARCHAR(10) NOT NULL DEFAULT 'xml' CHECK (file_format IN ('xml','txt')),
      xml_content TEXT NOT NULL,
      minio_bucket VARCHAR(120),
      minio_object_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_generation_logs (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      operation_type VARCHAR(80) NOT NULL,
      entity_type VARCHAR(80),
      entity_id BIGINT,
      file_name VARCHAR(255),
      mime_type VARCHAR(160),
      status VARCHAR(30) NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed')),
      generated_by BIGINT,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      generated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_notifications (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      type VARCHAR(80) NOT NULL,
      category VARCHAR(60) NOT NULL DEFAULT 'general',
      channel VARCHAR(30) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms')),
      audience VARCHAR(120) NOT NULL DEFAULT 'gym_manager',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      severity VARCHAR(30) NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','danger')),
      status VARCHAR(30) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','queued','sent','failed')),
      entity_type VARCHAR(80),
      entity_id BIGINT,
      recipient_user_id BIGINT,
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(80),
      scheduled_at TIMESTAMP,
      sent_at TIMESTAMP,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_files (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      entity_type VARCHAR(80) NOT NULL DEFAULT 'general',
      entity_id BIGINT,
      file_category VARCHAR(80) NOT NULL DEFAULT 'document',
      original_filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(160),
      file_size BIGINT,
      minio_bucket VARCHAR(120) NOT NULL,
      minio_object_key TEXT NOT NULL,
      uploaded_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_coaches (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      full_name VARCHAR(255) NOT NULL,
      specialty VARCHAR(160),
      phone VARCHAR(80),
      email VARCHAR(255),
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_classes (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      coach_id BIGINT REFERENCES gym_coaches(id) ON DELETE SET NULL,
      class_name VARCHAR(180) NOT NULL,
      class_type VARCHAR(120),
      capacity INT NOT NULL DEFAULT 20,
      starts_at TIMESTAMP NOT NULL,
      ends_at TIMESTAMP,
      status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_attendance (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
      class_id BIGINT REFERENCES gym_classes(id) ON DELETE SET NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      checkin_type VARCHAR(40) NOT NULL DEFAULT 'gym',
      checked_in_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_cash_transactions (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
      subscription_id BIGINT REFERENCES gym_subscriptions(id) ON DELETE SET NULL,
      amount NUMERIC(14,3) NOT NULL,
      direction VARCHAR(20) NOT NULL DEFAULT 'in' CHECK (direction IN ('in','out')),
      payment_method VARCHAR(40) NOT NULL DEFAULT 'cash',
      label VARCHAR(255) NOT NULL,
      reference VARCHAR(120),
      created_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_bank_returns (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      payment_id BIGINT REFERENCES gym_payments(id) ON DELETE SET NULL,
      batch_job_id BIGINT REFERENCES gym_batch_jobs(id) ON DELETE SET NULL,
      bank_name VARCHAR(120),
      result_status VARCHAR(40) NOT NULL CHECK (result_status IN ('success','failed','insufficient_funds','account_blocked')),
      failure_reason TEXT,
      raw_payload TEXT,
      imported_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_settings (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) UNIQUE NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'DT',
      default_due_day INT NOT NULL DEFAULT 5,
      occupancy_limit INT NOT NULL DEFAULT 80,
      renewal_warning_days INT NOT NULL DEFAULT 3,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gym_access_events (
      id BIGSERIAL PRIMARY KEY,
      code_entreprise VARCHAR(80) NOT NULL,
      member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      event_type VARCHAR(40) NOT NULL DEFAULT 'checkin',
      access_status VARCHAR(40) NOT NULL DEFAULT 'granted',
      reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      contract_type VARCHAR(80) NOT NULL,
      language VARCHAR(10) NOT NULL DEFAULT 'fr',
      name VARCHAR(180) NOT NULL,
      description TEXT,
      content_skeleton TEXT,
      mandatory_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_code, contract_type, language, name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS contracts (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      contract_number VARCHAR(80) NOT NULL,
      contract_type VARCHAR(80) NOT NULL,
      language VARCHAR(10) NOT NULL DEFAULT 'fr',
      status VARCHAR(40) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','review','approved','ready_to_print')),
      member_id BIGINT REFERENCES gym_members(id) ON DELETE SET NULL,
      subscription_id BIGINT REFERENCES gym_subscriptions(id) ON DELETE SET NULL,
      branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL,
      template_id BIGINT REFERENCES contract_templates(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      content_html TEXT NOT NULL,
      content_text TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      ai_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
      validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_by BIGINT,
      approved_by BIGINT,
      approved_at TIMESTAMP,
      ready_to_print_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_code, contract_number)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS contract_versions (
      id BIGSERIAL PRIMARY KEY,
      contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      version_no INT NOT NULL,
      status VARCHAR(40) NOT NULL,
      content_html TEXT NOT NULL,
      content_text TEXT,
      ai_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
      validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (contract_id, version_no)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS contract_clauses (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      contract_type VARCHAR(80) NOT NULL,
      language VARCHAR(10) NOT NULL DEFAULT 'fr',
      clause_key VARCHAR(120) NOT NULL,
      title VARCHAR(180) NOT NULL,
      body TEXT NOT NULL,
      category VARCHAR(60) NOT NULL DEFAULT 'legal',
      is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 100,
      created_by BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_code, contract_type, language, clause_key)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ai_generation_logs (
      id BIGSERIAL PRIMARY KEY,
      tenant_code VARCHAR(80) NOT NULL,
      contract_id BIGINT REFERENCES contracts(id) ON DELETE SET NULL,
      provider VARCHAR(60) NOT NULL,
      model VARCHAR(120),
      prompt JSONB,
      response JSONB,
      status VARCHAR(40) NOT NULL DEFAULT 'success',
      error_message TEXT,
      tokens_used INT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const migrations = [
    `ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL`,
    `ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS employee_id VARCHAR(120)`,
    `ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS cin VARCHAR(120)`,
    `ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
    `ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS phone VARCHAR(80)`,
    `ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS bank_account VARCHAR(120)`,
    `ALTER TABLE gym_members ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active'`,
    `ALTER TABLE gym_subscriptions ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL`,
    `ALTER TABLE gym_coaches ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL`,
    `ALTER TABLE gym_subscriptions ADD COLUMN IF NOT EXISTS end_date DATE`,
    `ALTER TABLE gym_subscriptions ADD COLUMN IF NOT EXISTS deduction_doc_ref TEXT`,
    `ALTER TABLE gym_subscriptions ADD COLUMN IF NOT EXISTS validated_by BIGINT`,
    `ALTER TABLE gym_subscriptions ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending_validation'`,
    `ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`,
    `ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS failure_reason TEXT`,
    `ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS reference VARCHAR(120)`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS contract_number VARCHAR(80)`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS authorization_reference VARCHAR(120)`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS contract_pdf_path TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS mandate_pdf_path TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS authorization_pdf_path TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS hq_comment TEXT`,
    `ALTER TABLE gym_notifications ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL`,
    `ALTER TABLE gym_salary_deduction_exports ADD COLUMN IF NOT EXISTS file_format VARCHAR(10) NOT NULL DEFAULT 'xml'`,
    `ALTER TABLE gym_salary_deduction_exports ADD COLUMN IF NOT EXISTS minio_bucket VARCHAR(120)`,
    `ALTER TABLE gym_salary_deduction_exports ADD COLUMN IF NOT EXISTS minio_object_key TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS validated_by BIGINT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP`,
    `CREATE INDEX IF NOT EXISTS idx_gym_members_tenant_branch ON gym_members(code_entreprise, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_subscriptions_tenant_branch ON gym_subscriptions(code_entreprise, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_subscriptions_tenant_payment_status ON gym_subscriptions(code_entreprise, payment_method, status, workflow_status)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_coaches_tenant_branch ON gym_coaches(code_entreprise, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_payments_month_status ON gym_payments(month_ref, status)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_payments_subscription_due ON gym_payments(subscription_id, due_date)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_contracts_tenant_validation ON gym_contracts(tenant_code, validation_status)`,
    `CREATE INDEX IF NOT EXISTS idx_hq_validation_queue_tenant_status ON hq_validation_queue(tenant_code, status)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_notifications_tenant_status ON gym_notifications(tenant_code, status)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_notifications_tenant_branch ON gym_notifications(tenant_code, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_files_tenant_branch ON gym_files(tenant_code, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_generation_logs_tenant_type_date ON gym_generation_logs(tenant_code, operation_type, generated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_attendance_tenant_date ON gym_attendance(code_entreprise, checked_in_at)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_access_events_tenant_date ON gym_access_events(code_entreprise, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status ON contracts(tenant_code, status)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_contract_templates_lookup ON contract_templates(tenant_code, contract_type, language, name)`,
    `CREATE INDEX IF NOT EXISTS idx_contracts_member_subscription ON contracts(member_id, subscription_id)`,
    `CREATE INDEX IF NOT EXISTS idx_contract_versions_contract ON contract_versions(contract_id, version_no)`,
    `CREATE INDEX IF NOT EXISTS idx_contract_clauses_lookup ON contract_clauses(tenant_code, contract_type, language)`,
    `CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_contract ON ai_generation_logs(contract_id, created_at)`,
  ];

  for (const sql of migrations) {
    try {
      await query(sql);
    } catch (e) {
      if (e?.code === "42501") {
        console.warn("[gym schema migration skipped: insufficient privilege]", sql);
      } else {
        throw e;
      }
    }
  }
}

async function ensureSchema() {
  if (schemaReady) return;
  if (!schemaPromise) {
    schemaPromise = runEnsureSchema()
      .then(() => {
        schemaReady = true;
      })
      .catch((e) => {
        schemaPromise = null;
        throw e;
      });
  }
  await schemaPromise;
}

async function seedContractDefaults(code, userId = null) {
  const templates = Object.entries(CONTRACT_TYPES).map(([contractType, label]) => ({
    contractType,
    name: label,
    description: `AI-ready template for ${label}`,
    skeleton: `<h1>${label}</h1><p>{{intro}}</p><h2>Contract Data</h2><p>{{context}}</p><h2>Clauses</h2><p>{{clauses}}</p><h2>Signatures</h2><p>{{signatures}}</p>`,
  }));

  for (const tpl of templates) {
    await query(
      `INSERT INTO contract_templates
       (tenant_code, contract_type, language, name, description, content_skeleton, mandatory_fields, created_by)
       VALUES ($1,$2,'fr',$3,$4,$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [code, tpl.contractType, tpl.name, tpl.description, tpl.skeleton, JSON.stringify([]), userId]
    );
  }

  const defaults = [
    ["payment_terms", "Conditions de paiement", "Le paiement doit etre effectue selon le mode convenu et les echeances indiquees.", "payment", true],
    ["access_rules", "Regles d'acces", "L'acces a la salle est personnel, non cessible et soumis au statut actif du contrat.", "access", true],
    ["cancellation", "Resiliation", "La resiliation doit etre demandee par ecrit conformement aux conditions du contrat.", "legal", false],
    ["data_privacy", "Protection des donnees", "Les donnees personnelles sont utilisees pour la gestion du contrat, des paiements et des acces.", "legal", true],
    ["signature", "Signature", "Le contrat prend effet apres signature des parties ou validation electronique autorisee.", "legal", true],
  ];

  for (const [key, title, body, category, mandatory] of defaults) {
    for (const contractType of Object.keys(CONTRACT_TYPES)) {
      await query(
        `INSERT INTO contract_clauses
         (tenant_code, contract_type, language, clause_key, title, body, category, is_mandatory, created_by)
         VALUES ($1,$2,'fr',$3,$4,$5,$6,$7,$8)
         ON CONFLICT (tenant_code, contract_type, language, clause_key) DO NOTHING`,
        [code, contractType, key, title, body, category, mandatory, userId]
      );
    }
  }
}

async function collectContractContext(code, body = {}) {
  const memberId = body.member_id || null;
  const subscriptionId = body.subscription_id || null;
  let member = null;
  let subscription = null;
  let branch = null;

  if (subscriptionId) {
    const sub = await query(
      `SELECT s.*, m.full_name, m.member_code, m.employee_id, m.cin, m.email, m.phone, m.bank_account,
              m.branch_id AS member_branch_id,
              b.branch_name, b.branch_code, b.city
       FROM gym_subscriptions s
       LEFT JOIN gym_members m ON m.id=s.member_id
       LEFT JOIN gym_branches b ON b.id=s.branch_id
       WHERE s.id=$1 AND s.code_entreprise=$2`,
      [subscriptionId, code]
    );
    if (sub.rows[0]) {
      const row = sub.rows[0];
      subscription = {
        id: row.id,
        plan_name: row.plan_name,
        amount: row.amount,
        payment_method: row.payment_method,
        workflow_status: row.workflow_status,
        due_day: row.due_day,
        start_date: row.start_date,
        end_date: row.end_date,
      };
      member = {
        id: row.member_id,
        full_name: row.full_name,
        member_code: row.member_code,
        employee_id: row.employee_id,
        cin: row.cin,
        email: row.email,
        phone: row.phone,
        bank_account: row.bank_account,
      };
      branch = {
        id: row.branch_id,
        branch_name: row.branch_name,
        branch_code: row.branch_code,
        city: row.city,
      };
      if (!branch.branch_name && row.member_branch_id) {
        const memberBranch = await query(`SELECT * FROM gym_branches WHERE id=$1 AND code_entreprise=$2`, [row.member_branch_id, code]);
        if (memberBranch.rows[0]) {
          branch = {
            id: memberBranch.rows[0].id,
            branch_name: memberBranch.rows[0].branch_name,
            branch_code: memberBranch.rows[0].branch_code,
            city: memberBranch.rows[0].city,
          };
        }
      }
    }
  }

  if (!member && memberId) {
    const out = await query(
      `SELECT m.*, b.branch_name, b.branch_code, b.city
       FROM gym_members m
       LEFT JOIN gym_branches b ON b.id=m.branch_id
       WHERE m.id=$1 AND m.code_entreprise=$2`,
      [memberId, code]
    );
    if (out.rows[0]) {
      const row = out.rows[0];
      member = row;
      branch = branch || {
        id: row.branch_id,
        branch_name: row.branch_name,
        branch_code: row.branch_code,
        city: row.city,
      };
    }
  }

  if (!branch && body.branch_id) {
    const out = await query(`SELECT * FROM gym_branches WHERE id=$1 AND code_entreprise=$2`, [body.branch_id, code]);
    branch = out.rows[0] || null;
  }

  return {
    member: member || {},
    subscription: subscription || {},
    branch: branch || {},
    payment_method: subscription?.payment_method || body.payment_method || null,
    duration: {
      start_date: subscription?.start_date || body.start_date || null,
      end_date: subscription?.end_date || body.end_date || null,
    },
    currency: "DT",
  };
}

async function createContractVersion(contractId, userId = null) {
  const cur = await query(`SELECT * FROM contracts WHERE id=$1`, [contractId]);
  const contract = cur.rows[0];
  if (!contract) return null;
  const nextVersion = await query(
    `SELECT COALESCE(MAX(version_no),0)+1 AS version_no FROM contract_versions WHERE contract_id=$1`,
    [contractId]
  );
  const versionNo = Number(nextVersion.rows[0]?.version_no || 1);
  const out = await query(
    `INSERT INTO contract_versions
     (contract_id, version_no, status, content_html, content_text, ai_suggestions, validation_warnings, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      contractId,
      versionNo,
      contract.status,
      contract.content_html,
      contract.content_text,
      JSON.stringify(contract.ai_suggestions || []),
      JSON.stringify(contract.validation_warnings || []),
      userId,
    ]
  );
  return out.rows[0];
}

router.warmup = ensureSchema;

router.use(requireAuth);

router.get("/health", (_req, res) => res.json({ ok: true, module: "gym-management" }));

async function listGymFiles(req, res, next) {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    let where = "tenant_code=$1";
    if (scope.branchId) {
      params.push(scope.branchId);
      where += ` AND branch_id=$${params.length}`;
    }

    if (req.query.entity_type) {
      params.push(String(req.query.entity_type));
      where += ` AND entity_type=$${params.length}`;
    }
    if (req.query.entity_id) {
      params.push(Number(req.query.entity_id));
      where += ` AND entity_id=$${params.length}`;
    }
    if (req.query.file_category) {
      params.push(String(req.query.file_category));
      where += ` AND file_category=$${params.length}`;
    }

    const out = await query(
      `SELECT *
       FROM gym_files
       WHERE ${where}
       ORDER BY id DESC
       LIMIT 100`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
}

router.get(["/files", "/files/"], listGymFiles);

router.post(
  "/files/upload",
  requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      await ensureSchema();
      if (!req.file) return res.status(400).json({ error: "File is required" });

      const scope = requireBranchScope(req, res);
      if (!scope) return;
      const entityType = String(req.body?.entity_type || "general");
      const entityId = req.body?.entity_id ? Number(req.body.entity_id) : null;
      const fileCategory = String(req.body?.file_category || "document");
      const branchId = scopedBranchId(scope, req.body?.branch_id || null);

      const stored = await uploadGymFile({
        tenantCode: scope.code,
        category: fileCategory,
        entityType,
        entityId,
        file: req.file,
      });

      const out = await query(
        `INSERT INTO gym_files
         (tenant_code, branch_id, entity_type, entity_id, file_category, original_filename, mime_type, file_size, minio_bucket, minio_object_key, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          scope.code,
          branchId,
          entityType,
          entityId,
          fileCategory,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          stored.bucket,
          stored.objectKey,
          req.user?.id || null,
        ]
      );

      await safeCreateNotification({
        tenant_code: scope.code,
        branch_id: branchId,
        type: "authorization_form_generated",
        title: "Fichier Gym enregistré",
        message: `${req.file.originalname} saved in MinIO successfully.`,
        severity: "success",
        entity_type: entityType,
        entity_id: entityId,
      });

      res.status(201).json(out.rows[0]);
    } catch (e) { next(e); }
  }
);

router.get("/files/:id/url", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "tenant_code=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(
      `SELECT * FROM gym_files WHERE ${where.join(" AND ")}`,
      params
    );
    if (!out.rows[0]) return res.status(404).json({ error: "File not found" });

    const url = await presignedUrl(out.rows[0].minio_object_key);
    res.json({ ...out.rows[0], url });
  } catch (e) { next(e); }
});

router.delete("/files/:id", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "tenant_code=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(`SELECT * FROM gym_files WHERE ${where.join(" AND ")}`, params);
    if (!out.rows[0]) return res.status(404).json({ error: "File not found" });
    if (out.rows[0].minio_object_key) {
      try {
        await removeObject(out.rows[0].minio_object_key);
      } catch (storageError) {
        console.warn("[gym file delete skipped]", storageError?.message || storageError);
      }
    }
    await query(`DELETE FROM gym_files WHERE id=$1 AND tenant_code=$2`, [req.params.id, scope.code]);
    res.json({ message: "File deleted", id: req.params.id });
  } catch (e) { next(e); }
});

router.get("/notifications", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const status = req.query.status ? String(req.query.status) : null;
    const limit = Math.min(Number(req.query.limit || 30), 100);

    const params = [scope.code];
    let where = "tenant_code=$1";
    if (scope.branchId) {
      params.push(scope.branchId);
      where += ` AND (branch_id=$${params.length} OR branch_id IS NULL)`;
    }
    if (status) {
      params.push(status);
      where += ` AND status=$${params.length}`;
    }
    params.push(limit);

    const out = await query(
      `SELECT *
       FROM gym_notifications
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${params.length}`,
      params
    );

    res.json(out.rows);
  } catch (e) { next(e); }
});

router.patch("/notifications/:id/read", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "tenant_code=$2"];
    if (scope.branchId) {
      params.push(scope.branchId);
      where.push(`(branch_id=$${params.length} OR branch_id IS NULL)`);
    }
    const out = await query(
      `UPDATE gym_notifications
       SET status='read', read_at=NOW()
       WHERE ${where.join(" AND ")}
       RETURNING *`,
      params
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Notification not found" });
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.post("/notifications", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const item = await createNotification({
      tenant_code: scope.code,
      branch_id: scopedBranchId(scope, req.body?.branch_id || null),
      type: req.body?.type || "gym_class_added",
      channel: req.body?.channel || "in_app",
      title: req.body?.title,
      message: req.body?.message,
      severity: req.body?.severity,
      entity_type: req.body?.entity_type,
      entity_id: req.body?.entity_id,
      recipient_email: req.body?.recipient_email,
      recipient_phone: req.body?.recipient_phone,
      scheduled_at: req.body?.scheduled_at,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.post("/notifications/scan-expirations", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const branchSql = scope.branchId ? " AND branch_id=$2" : "";
    if (scope.branchId) params.push(scope.branchId);
    const soon = await query(
      `SELECT id FROM gym_subscriptions
       WHERE code_entreprise=$1
         ${branchSql}
         AND end_date IS NOT NULL
         AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`,
      params
    );
    const expired = await query(
      `SELECT id FROM gym_subscriptions
       WHERE code_entreprise=$1
         ${branchSql}
         AND end_date IS NOT NULL
         AND end_date < CURRENT_DATE`,
      params
    );

    for (const row of soon.rows) {
      await createNotification({
        tenant_code: scope.code,
        branch_id: scope.branchId,
        type: "subscription_expiring",
        entity_type: "subscription",
        entity_id: row.id,
      });
    }
    for (const row of expired.rows) {
      await createNotification({
        tenant_code: scope.code,
        branch_id: scope.branchId,
        type: "subscription_expired",
        entity_type: "subscription",
        entity_id: row.id,
      });
    }

    res.json({ expiring_count: soon.rows.length, expired_count: expired.rows.length });
  } catch (e) { next(e); }
});

router.post("/bootstrap", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (_req, res, next) => {
  try {
    await ensureSchema();
    res.json({ message: "Gym schema ready" });
  } catch (e) { next(e); }
});

router.get("/contract-ai/types", async (_req, res) => {
  res.json(CONTRACT_TYPES);
});

router.get("/contract-ai/templates", async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    await seedContractDefaults(code, req.user?.id || null);
    const out = await query(
      `SELECT * FROM contract_templates
       WHERE tenant_code=$1
       ORDER BY is_active DESC, contract_type, name`,
      [code]
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.post("/contract-ai/templates", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const b = req.body || {};
    const out = await query(
      `INSERT INTO contract_templates
       (tenant_code, contract_type, language, name, description, content_skeleton, mandatory_fields, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        code,
        normalizeType(b.contract_type),
        normalizeLanguage(b.language),
        b.name,
        b.description || null,
        b.content_skeleton || null,
        JSON.stringify(Array.isArray(b.mandatory_fields) ? b.mandatory_fields : []),
        b.is_active !== false,
        req.user?.id || null,
      ]
    );
    res.status(201).json(out.rows[0]);
  } catch (e) { next(e); }
});

router.put("/contract-ai/templates/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const b = req.body || {};
    const out = await query(
      `UPDATE contract_templates
       SET contract_type=$1, language=$2, name=$3, description=$4, content_skeleton=$5,
           mandatory_fields=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8 AND tenant_code=$9
       RETURNING *`,
      [
        normalizeType(b.contract_type),
        normalizeLanguage(b.language),
        b.name,
        b.description || null,
        b.content_skeleton || null,
        JSON.stringify(Array.isArray(b.mandatory_fields) ? b.mandatory_fields : []),
        b.is_active !== false,
        req.params.id,
        code,
      ]
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Template not found" });
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.delete("/contract-ai/templates/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const out = await query(`DELETE FROM contract_templates WHERE id=$1 AND tenant_code=$2 RETURNING *`, [req.params.id, code]);
    if (!out.rows[0]) return res.status(404).json({ error: "Template not found" });
    res.json({ message: "Template deleted", id: out.rows[0].id });
  } catch (e) { next(e); }
});

router.get("/contract-ai/clauses", async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const contractType = normalizeType(String(req.query.contract_type || "gym_membership"));
    const language = normalizeLanguage(String(req.query.language || "fr"));
    await seedContractDefaults(code, req.user?.id || null);
    const out = await query(
      `SELECT * FROM contract_clauses
       WHERE tenant_code=$1 AND contract_type=$2 AND language=$3
       ORDER BY is_mandatory DESC, sort_order, title`,
      [code, contractType, language]
    );
    res.json(clauseRecommendations(contractType, language, out.rows));
  } catch (e) { next(e); }
});

router.post("/contract-ai/generate", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const code = scope.code;
    const b = req.body || {};
    b.branch_id = scopedBranchId(scope, b.branch_id || null);
    const contractType = normalizeType(b.contract_type);
    const language = normalizeLanguage(b.language);
    await seedContractDefaults(code, req.user?.id || null);

    const context = await collectContractContext(code, b);
    if (scope.branchId) {
      const contextBranchId = context.subscription?.branch_id || context.member?.branch_id || context.branch?.id || b.branch_id;
      if (contextBranchId && Number(contextBranchId) !== Number(scope.branchId)) {
        return res.status(404).json({ error: "Contract context not found in this branch" });
      }
    }
    const dbClauses = await query(
      `SELECT * FROM contract_clauses
       WHERE tenant_code=$1 AND contract_type=$2 AND language=$3
       ORDER BY is_mandatory DESC, sort_order, title`,
      [code, contractType, language]
    );

    const generated = await generateContractDraft({
      type: contractType,
      language,
      context,
      dbClauses: dbClauses.rows,
      customInstructions: b.custom_instructions || "",
    });

    const number = `CTR-${Date.now()}`;
    const created = await query(
      `INSERT INTO contracts
       (tenant_code, contract_number, contract_type, language, status, member_id, subscription_id, branch_id,
        template_id, title, content_html, content_text, metadata, ai_suggestions, validation_warnings, created_by)
       VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        code,
        number,
        contractType,
        language,
        b.member_id || context.member?.id || null,
        b.subscription_id || context.subscription?.id || null,
        scopedBranchId(scope, b.branch_id || context.branch?.id || null),
        b.template_id || null,
        generated.title,
        generated.content_html,
        generated.content_text,
        JSON.stringify({ context, provider: generated.provider, model: generated.model }),
        JSON.stringify(generated.suggestions || []),
        JSON.stringify(generated.warnings || []),
        req.user?.id || null,
      ]
    );

    await createContractVersion(created.rows[0].id, req.user?.id || null);

    await query(
      `INSERT INTO ai_generation_logs
       (tenant_code, contract_id, provider, model, prompt, response, status, tokens_used)
       VALUES ($1,$2,$3,$4,$5,$6,'success',$7)`,
      [
        code,
        created.rows[0].id,
        generated.provider,
        generated.model,
        JSON.stringify({ contract_type: contractType, language, context }),
        JSON.stringify({ suggestions: generated.suggestions, warnings: generated.warnings, raw_response: generated.raw_response }),
        generated.usage?.total_tokens || null,
      ]
    );

    res.status(201).json({
      contract: created.rows[0],
      clauses: generated.clauses,
      suggestions: generated.suggestions,
      warnings: generated.warnings,
    });
  } catch (e) {
    try {
      await query(
        `INSERT INTO ai_generation_logs (tenant_code, provider, model, prompt, response, status, error_message)
         VALUES ($1,$2,$3,$4,$5,'failed',$6)`,
        [
          String(tenantCode(req) || config.defaultTenantCode),
          config.ai.provider,
          config.ai.groqModel,
          JSON.stringify(req.body || {}),
          JSON.stringify({}),
          e.message,
        ]
      );
    } catch (_ignored) {}
    next(e);
  }
});

router.get("/contract-ai/contracts", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["c.tenant_code=$1"];
    addBranchCondition(where, params, scope, "c");
    const out = await query(
      `SELECT c.*, m.full_name, m.member_code, s.plan_name, b.branch_name
       FROM contracts c
       LEFT JOIN gym_members m ON m.id=c.member_id
       LEFT JOIN gym_subscriptions s ON s.id=c.subscription_id
       LEFT JOIN gym_branches b ON b.id=c.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY c.updated_at DESC, c.id DESC`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.get("/contract-ai/contracts/:id", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "tenant_code=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(`SELECT * FROM contracts WHERE ${where.join(" AND ")}`, params);
    if (!out.rows[0]) return res.status(404).json({ error: "Contract not found" });
    const versions = await query(
      `SELECT id, version_no, status, created_at, created_by
       FROM contract_versions
       WHERE contract_id=$1
       ORDER BY version_no DESC`,
      [req.params.id]
    );
    res.json({ contract: out.rows[0], versions: versions.rows });
  } catch (e) { next(e); }
});

router.post("/contract-ai/contracts/:id/draft", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const params = [
      b.title || null,
      b.content_html || "",
      stripHtml(b.content_html || ""),
      JSON.stringify(Array.isArray(b.ai_suggestions) ? b.ai_suggestions : []),
      JSON.stringify(Array.isArray(b.validation_warnings) ? b.validation_warnings : []),
      req.params.id,
      scope.code,
    ];
    const where = ["id=$6", "tenant_code=$7"];
    addBranchCondition(where, params, scope);
    const out = await query(
      `UPDATE contracts
       SET title=COALESCE($1,title), content_html=$2, content_text=$3,
           ai_suggestions=$4, validation_warnings=$5, status='draft', updated_at=NOW()
       WHERE ${where.join(" AND ")}
       RETURNING *`,
      params
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Contract not found" });
    await createContractVersion(out.rows[0].id, req.user?.id || null);
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.post("/contract-ai/contracts/:id/review", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "tenant_code=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(
      `UPDATE contracts SET status='review', updated_at=NOW()
       WHERE ${where.join(" AND ")} RETURNING *`,
      params
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Contract not found" });
    await createContractVersion(out.rows[0].id, req.user?.id || null);
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.post("/contract-ai/contracts/:id/approve", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.user?.id || null, req.params.id, scope.code];
    const where = ["id=$2", "tenant_code=$3"];
    addBranchCondition(where, params, scope);
    const out = await query(
      `UPDATE contracts
       SET status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW()
       WHERE ${where.join(" AND ")}
       RETURNING *`,
      params
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Contract not found" });
    await createContractVersion(out.rows[0].id, req.user?.id || null);
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.post("/contract-ai/contracts/:id/ready-to-print", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "tenant_code=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(
      `UPDATE contracts
       SET status='ready_to_print', ready_to_print_at=NOW(), updated_at=NOW()
       WHERE ${where.join(" AND ")}
       RETURNING *`,
      params
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Contract not found" });
    await createContractVersion(out.rows[0].id, req.user?.id || null);
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.get("/contract-ai/contracts/:id/pdf", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "tenant_code=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(`SELECT * FROM contracts WHERE ${where.join(" AND ")}`, params);
    if (!out.rows[0]) return res.status(404).json({ error: "Contract not found" });
    const contract = out.rows[0];
    const context = await collectContractContext(scope.code, {
      member_id: contract.member_id,
      subscription_id: contract.subscription_id,
      branch_id: contract.branch_id,
    });
    const html = ensureIdentityBlock(contract.content_html, context, contract.language);
    let pdf = await generatePdfFromHtml({
      title: contract.title,
      html,
      language: contract.language,
    });

    if (!pdf) {
      pdf = generatePdf({
        title: contract.title,
        html,
        text: stripHtml(html),
      });
    }
    const fileName = `${contract.contract_number || `contract-${contract.id}`}.pdf`;
    await trySaveGymGeneratedFile({
      req,
      tenantCode: scope.code,
      branchId: contract.branch_id || null,
      entityType: "contract",
      entityId: contract.id,
      category: "contract_pdf",
      filename: fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from(pdf),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdf);
  } catch (e) { next(e); }
});

router.post("/branches", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const r = await query(
      `INSERT INTO gym_branches (code_entreprise, branch_code, branch_name, city, hotel_spa_integrated)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [scope.code, b.branch_code, b.branch_name, b.city || null, Boolean(b.hotel_spa_integrated)]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

router.get("/branches", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["code_entreprise=$1"];
    addBranchCondition(where, params, scope, "", "id");
    const r = await query(`SELECT * FROM gym_branches WHERE ${where.join(" AND ")} ORDER BY id DESC`, params);
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.put("/branches/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const out = await query(
      `UPDATE gym_branches
       SET branch_code=$1, branch_name=$2, city=$3, hotel_spa_integrated=$4
       WHERE id=$5 AND code_entreprise=$6
       RETURNING *`,
      [b.branch_code, b.branch_name, b.city || null, Boolean(b.hotel_spa_integrated), req.params.id, scope.code]
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Branch not found" });
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.delete("/branches/:id", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "code_entreprise=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(`DELETE FROM gym_branches WHERE ${where.join(" AND ")} RETURNING *`, params);
    if (!out.rows[0]) return res.status(404).json({ error: "Branch not found" });
    res.json({ message: "Branch deleted", id: out.rows[0].id });
  } catch (e) { next(e); }
});

router.post("/members", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const r = await query(
      `INSERT INTO gym_members (code_entreprise, branch_id, member_code, full_name, employee_id, cin, email, phone, bank_account, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [scope.code, branchId, b.member_code, b.full_name, b.employee_id || null, b.cin || null, b.email || null, b.phone || null, b.bank_account || null, b.status || "active"]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

router.get("/members", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["m.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "m");
    const pagination = parsePagination(req, { defaultLimit: 40, maxLimit: 200 });
    const { rows, total } = await fetchListWithPagination({
      dataSql: `SELECT m.*, b.branch_name
                FROM gym_members m
                LEFT JOIN gym_branches b ON b.id=m.branch_id
                WHERE ${where.join(" AND ")}
                ORDER BY m.id DESC`,
      countSql: `SELECT COUNT(*)::int AS total
                 FROM gym_members m
                 WHERE ${where.join(" AND ")}`,
      params,
      pagination,
    });
    res.json(maybePaginatedResponse(rows, total, pagination));
  } catch (e) { next(e); }
});

router.put("/members/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const params = [branchId, b.full_name, b.employee_id || null, b.cin || null, b.email || null, b.phone || null, b.bank_account || null, b.status || "active", req.params.id, scope.code];
    const where = ["id=$9", "code_entreprise=$10"];
    addBranchCondition(where, params, scope);
    const r = await query(
      `UPDATE gym_members
       SET branch_id=$1, full_name=$2, employee_id=$3, cin=$4, email=$5, phone=$6, bank_account=$7, status=$8
       WHERE ${where.join(" AND ")}
       RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Member not found" });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.delete("/members/:id", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "code_entreprise=$2"];
    addBranchCondition(where, params, scope);
    const r = await query(`DELETE FROM gym_members WHERE ${where.join(" AND ")} RETURNING id`, params);
    if (!r.rows[0]) return res.status(404).json({ error: "Member not found" });
    res.json({ message: "Member deleted", id: r.rows[0].id });
  } catch (e) { next(e); }
});

router.post("/subscriptions", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const memberId = Number(b.member_id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return res.status(400).json({ error: "Invalid member_id" });
    }
    const paymentMethod = String(b.payment_method || "direct");
    const workflow = paymentMethod === "salary_deduction" ? "printed" : (b.workflow_status || "processed");
    const subscriptionStatus = paymentMethod === "salary_deduction" ? "pending_validation" : "active";
    const selectedBranchId = b.branch_id !== undefined && b.branch_id !== null && b.branch_id !== "" ? Number(b.branch_id) : null;
    let branchId = scopedBranchId(scope, selectedBranchId);
    if (selectedBranchId !== null && !Number.isInteger(selectedBranchId)) {
      return res.status(400).json({ error: "Invalid branch_id" });
    }

    const memberCheck = await query(
      `SELECT id, branch_id
       FROM gym_members
       WHERE id=$1 AND code_entreprise=$2`,
      [memberId, scope.code]
    );
    const member = memberCheck.rows[0];
    if (!member) return res.status(404).json({ error: "Member not found" });

    const memberBranchId = member.branch_id !== null && member.branch_id !== undefined ? Number(member.branch_id) : null;
    if (selectedBranchId !== null && memberBranchId !== null && selectedBranchId !== memberBranchId) {
      return res.status(400).json({
        error: "Member belongs to a different branch",
        detail: "Choose the matching branch for this member.",
      });
    }
    if (!branchId) branchId = memberBranchId;

    const r = await query(
      `INSERT INTO gym_subscriptions
      (code_entreprise, branch_id, member_id, plan_name, amount, payment_method, workflow_status, status, due_day, start_date, end_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,5),$10,$11,$12)
      RETURNING *`,
      [scope.code, branchId, b.member_id, b.plan_name, b.amount, paymentMethod, workflow, subscriptionStatus, b.due_day || 5, b.start_date, b.end_date || null, req.user?.id || null]
    );

    const created = r.rows[0];

    await safeCreateNotification({
      tenant_code: scope.code,
      type: "subscription_created",
      entity_type: "subscription",
      entity_id: created.id,
    });

    if (paymentMethod === "salary_deduction") {
      await query(
        `INSERT INTO gym_contracts (subscription_id, tenant_code, contract_number, authorization_reference, validation_status, authorization_pdf_path)
         VALUES ($1,$2,$3,$4,'pending_hq',$5)`,
        [
          created.id,
          scope.code,
          `SD-${created.id}`,
          `AUTH-SALARY-${created.id}`,
          `/api/v1/gym/subscriptions/${created.id}/authorization-form.pdf`,
        ]
      );

      await query(
        `INSERT INTO hq_validation_queue (tenant_code, subscription_id, status)
         SELECT $1::varchar,$2::bigint,'pending'
         WHERE NOT EXISTS (
           SELECT 1 FROM hq_validation_queue WHERE tenant_code=$1 AND subscription_id=$2
         )`,
        [scope.code, created.id]
      );

      await safeCreateNotification({
        tenant_code: scope.code,
        type: "authorization_form_generated",
        entity_type: "subscription",
        entity_id: created.id,
        message: "Authorization PDF generated automatically. Print it, collect the member signature, then send it to HQ.",
      });

      await safeCreateNotification({
        tenant_code: scope.code,
        type: "hq_request_created",
        entity_type: "subscription",
        entity_id: created.id,
      });
    }

    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.patch("/subscriptions/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const current = await query(`SELECT * FROM gym_subscriptions WHERE id=$1 AND code_entreprise=$2`, [req.params.id, scope.code]);
    if (!current.rows[0]) return res.status(404).json({ error: "Subscription not found" });

    const rawMemberId = b.member_id !== undefined && b.member_id !== null && b.member_id !== "" ? Number(b.member_id) : current.rows[0].member_id;
    const rawBranchId = b.branch_id !== undefined && b.branch_id !== null && b.branch_id !== "" ? Number(b.branch_id) : current.rows[0].branch_id;
    const memberId = Number.isInteger(rawMemberId) && rawMemberId > 0 ? rawMemberId : current.rows[0].member_id;
    const branchCandidate = b.branch_id !== undefined && b.branch_id !== null && b.branch_id !== "" ? Number(b.branch_id) : null;
    if (branchCandidate !== null && !Number.isInteger(branchCandidate)) {
      return res.status(400).json({ error: "Invalid branch_id" });
    }

    let branchId = scopedBranchId(scope, branchCandidate !== null ? branchCandidate : rawBranchId);
    if (memberId) {
      const member = await query(`SELECT id, branch_id FROM gym_members WHERE id=$1 AND code_entreprise=$2`, [memberId, scope.code]);
      if (!member.rows[0]) return res.status(404).json({ error: "Member not found" });
      const memberBranchId = member.rows[0].branch_id !== null && member.rows[0].branch_id !== undefined ? Number(member.rows[0].branch_id) : null;
      if (branchCandidate !== null && memberBranchId !== null && branchCandidate !== memberBranchId) {
        return res.status(400).json({ error: "Member belongs to a different branch" });
      }
      if (!branchId) branchId = memberBranchId;
    }

    const out = await query(
      `UPDATE gym_subscriptions
       SET branch_id=$1,
           member_id=$2,
           plan_name=COALESCE($3, plan_name),
           amount=COALESCE($4, amount),
           payment_method=COALESCE($5, payment_method),
           workflow_status=COALESCE($6, workflow_status),
           due_day=COALESCE($7, due_day),
           start_date=COALESCE($8, start_date),
           end_date=$9,
           updated_at=NOW()
       WHERE id=$10 AND code_entreprise=$11
       RETURNING *`,
      [
        branchId,
        memberId,
        b.plan_name || null,
        b.amount !== undefined && b.amount !== null && b.amount !== "" ? Number(b.amount) : null,
        b.payment_method || null,
        b.workflow_status || null,
        b.due_day !== undefined && b.due_day !== null && b.due_day !== "" ? Number(b.due_day) : null,
        b.start_date || null,
        b.end_date || null,
        req.params.id,
        scope.code,
      ]
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Subscription not found" });
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.delete("/subscriptions/:id", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "code_entreprise=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(`DELETE FROM gym_subscriptions WHERE ${where.join(" AND ")} RETURNING *`, params);
    if (!out.rows[0]) return res.status(404).json({ error: "Subscription not found" });
    res.json({ message: "Subscription deleted", id: out.rows[0].id });
  } catch (e) { next(e); }
});

router.get("/subscriptions", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["s.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "s");
    const pagination = parsePagination(req, { defaultLimit: 40, maxLimit: 200 });
    const { rows, total } = await fetchListWithPagination({
      dataSql: `SELECT s.*, m.full_name, m.member_code, b.branch_name
                FROM gym_subscriptions s
                JOIN gym_members m ON m.id = s.member_id
                LEFT JOIN gym_branches b ON b.id=s.branch_id
                WHERE ${where.join(" AND ")}
                ORDER BY s.id DESC`,
      countSql: `SELECT COUNT(*)::int AS total
                 FROM gym_subscriptions s
                 JOIN gym_members m ON m.id = s.member_id
                 WHERE ${where.join(" AND ")}`,
      params,
      pagination,
    });
    res.json(maybePaginatedResponse(rows, total, pagination));
  } catch (e) { next(e); }
});

router.get("/hq/validations", (req, res, next) => {
  if (!requireHqAccess(req, res)) return;
  return next();
}, async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const status = String(req.query.status || "pending");
    const pagination = parsePagination(req, { defaultLimit: 40, maxLimit: 200 });

    const params = [code, status];
    const { rows, total } = await fetchListWithPagination({
      dataSql: `SELECT q.*, s.member_id, s.plan_name, s.amount, s.start_date, s.payment_method,
                       m.full_name, m.member_code, c.validation_status, c.hq_comment
                FROM hq_validation_queue q
                JOIN gym_subscriptions s ON s.id=q.subscription_id
                LEFT JOIN gym_members m ON m.id=s.member_id
                LEFT JOIN gym_contracts c ON c.subscription_id=s.id
                WHERE q.tenant_code=$1 AND q.status=$2
                ORDER BY q.id DESC`,
      countSql: `SELECT COUNT(*)::int AS total
                 FROM hq_validation_queue q
                 WHERE q.tenant_code=$1 AND q.status=$2`,
      params,
      pagination,
    });

    res.json(maybePaginatedResponse(rows, total, pagination));
  } catch (e) { next(e); }
});

router.post("/hq/validate/:subscriptionId", (req, res, next) => {
  if (!requireHqAccess(req, res)) return;
  return next();
}, async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const subscriptionId = Number(req.params.subscriptionId);
    const action = String(req.body?.action || "").trim();
    const comment = req.body?.comment || null;

    const map = {
      approve: { queue: "approved", contract: "approved", workflow: "processed", status: "active" },
      reject: { queue: "rejected", contract: "rejected", workflow: "pending", status: "pending_validation" },
      needs_update: { queue: "needs_update", contract: "needs_update", workflow: "pending", status: "pending_validation" },
    };

    if (!map[action]) {
      return res.status(400).json({ error: "Invalid action. Use approve | reject | needs_update" });
    }

    const sub = await query(`SELECT * FROM gym_subscriptions WHERE id=$1 AND code_entreprise=$2`, [subscriptionId, code]);
    if (!sub.rows[0]) return res.status(404).json({ error: "Subscription not found" });

    await query(
      `UPDATE hq_validation_queue
       SET status=$1, reviewer_id=$2, reviewer_comment=$3, reviewed_at=NOW()
       WHERE tenant_code=$4 AND subscription_id=$5`,
      [map[action].queue, req.user?.id || null, comment, code, subscriptionId]
    );

    await query(
      `UPDATE gym_contracts
       SET validation_status=$1, hq_comment=$2, validated_by=$3, validated_at=NOW()
       WHERE tenant_code=$4 AND subscription_id=$5`,
      [map[action].contract, comment, req.user?.id || null, code, subscriptionId]
    );

    const updatedSub = await query(
      `UPDATE gym_subscriptions
       SET workflow_status=$1, status=$2, validated_by=$3, updated_at=NOW()
       WHERE id=$4
       RETURNING *`,
      [map[action].workflow, map[action].status, req.user?.id || null, subscriptionId]
    );

    await safeCreateNotification({
      tenant_code: code,
      type: action === "approve" ? "subscription_created" : "hq_request_created",
      title: action === "approve" ? "Demande approuvee par le siege" : "Demande traitee par le siege",
      message: `HQ action '${action}' applied successfully.`,
      severity: action === "reject" ? "danger" : action === "needs_update" ? "warning" : "success",
      entity_type: "subscription",
      entity_id: subscriptionId,
    });

    res.json({ message: `HQ action '${action}' applied`, subscription: updatedSub.rows[0] });
  } catch (e) { next(e); }
});

router.patch("/subscriptions/:id/workflow", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const status = String(req.body?.workflow_status || "");
    const allowed = ["pending", "printed", "sent_hq", "processed"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid workflow_status" });
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [status, req.params.id, scope.code];
    const where = ["id=$2", "code_entreprise=$3"];
    addBranchCondition(where, params, scope);
    const r = await query(
      `UPDATE gym_subscriptions
       SET workflow_status=$1, updated_at=NOW()
       WHERE ${where.join(" AND ")}
       RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Subscription not found" });
    if (status === "printed") {
      await safeCreateNotification({
        tenant_code: String(tenantCode(req) || r.rows[0].code_entreprise),
        type: "authorization_form_generated",
        entity_type: "subscription",
        entity_id: r.rows[0].id,
      });
    }
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.post("/subscriptions/:id/send-hq", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const id = Number(req.params.id);
    const params = [id, scope.code];
    const where = ["id=$1", "code_entreprise=$2", "payment_method='salary_deduction'"];
    addBranchCondition(where, params, scope);
    const sub = await query(
      `SELECT * FROM gym_subscriptions WHERE ${where.join(" AND ")}`,
      params
    );
    if (!sub.rows[0]) return res.status(404).json({ error: "Salary deduction subscription not found" });

    await query(
      `INSERT INTO hq_validation_queue (tenant_code, subscription_id, status)
       SELECT $1::varchar,$2::bigint,'pending'
       WHERE NOT EXISTS (
         SELECT 1 FROM hq_validation_queue WHERE tenant_code=$1 AND subscription_id=$2
       )`,
      [scope.code, id]
    );

    await query(
      `UPDATE hq_validation_queue
       SET status='pending', reviewer_id=NULL, reviewer_comment=NULL, reviewed_at=NULL
       WHERE tenant_code=$1 AND subscription_id=$2`,
      [scope.code, id]
    );

    await query(
      `UPDATE gym_contracts
       SET validation_status='pending_hq',
           authorization_pdf_path=COALESCE(authorization_pdf_path, $3)
       WHERE tenant_code=$1 AND subscription_id=$2`,
      [scope.code, id, `/api/v1/gym/subscriptions/${id}/authorization-form.pdf`]
    );

    const updated = await query(
      `UPDATE gym_subscriptions SET workflow_status='sent_hq', updated_at=NOW()
       WHERE id=$1 AND code_entreprise=$2
       RETURNING *`,
      [id, scope.code]
    );

    await safeCreateNotification({
      tenant_code: scope.code,
      type: "hq_request_created",
      entity_type: "subscription",
      entity_id: id,
      message: "Signed salary deduction authorization sent to HQ for validation.",
    });

    res.json(updated.rows[0]);
  } catch (e) { next(e); }
});

router.post("/subscriptions/batch/process", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const ids = Array.isArray(req.body?.subscription_ids) ? req.body.subscription_ids : [];
    if (!ids.length) return res.status(400).json({ error: "subscription_ids[] is required" });
    const params = [req.user?.id || null, ids, scope.code];
    const where = ["id = ANY($2::bigint[])", "code_entreprise=$3"];
    addBranchCondition(where, params, scope);
    const r = await query(
      `UPDATE gym_subscriptions SET workflow_status='processed', validated_by=$1, updated_at=NOW()
       WHERE ${where.join(" AND ")} RETURNING id, workflow_status`,
      params
    );
    res.json({ processed_count: r.rows.length, subscriptions: r.rows });
  } catch (e) { next(e); }
});

router.get("/subscriptions/:id/authorization-form", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["s.id=$1", "s.code_entreprise=$2"];
    addBranchCondition(where, params, scope, "s");
    const r = await query(
      `SELECT s.id, s.branch_id, s.amount, s.start_date, s.end_date, s.payment_method, s.plan_name, s.code_entreprise,
              m.full_name, m.employee_id, m.cin, m.bank_account, m.phone,
              b.branch_name, b.city AS branch_city,
              c.contract_number, c.authorization_reference
       FROM gym_subscriptions s
       JOIN gym_members m ON m.id=s.member_id
       LEFT JOIN gym_branches b ON b.id=s.branch_id
       LEFT JOIN gym_contracts c ON c.subscription_id=s.id AND c.tenant_code=s.code_entreprise
       WHERE ${where.join(" AND ")}`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Subscription not found" });
    const x = r.rows[0];
    const text = `Autorisation de prelevement automatique\nAbonne: ${x.full_name}\nEmploye: ${x.employee_id || "-"}\nCIN: ${x.cin || "-"}\nCompte: ${x.bank_account || "-"}\nMontant mensuel: ${x.amount} DT\nDate debut: ${formatDate(x.start_date)}`;
    await safeCreateNotification({
      tenant_code: scope.code || config.defaultTenantCode,
      type: "authorization_form_generated",
      entity_type: "subscription",
      entity_id: x.id,
    });
    res.setHeader("X-Gym-Message", "Authorization form preview generated successfully.");
    res.json({
      subscription_id: x.id,
      generated_at: new Date().toISOString(),
      authorization_text: text,
      contract_number: x.contract_number || `SD-${x.id}`,
      authorization_reference: x.authorization_reference || `AUTH-SALARY-${x.id}`,
    });
  } catch (e) { next(e); }
});

router.get("/subscriptions/:id/authorization-form.pdf", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["s.id=$1", "s.code_entreprise=$2", "s.payment_method='salary_deduction'"];
    addBranchCondition(where, params, scope, "s");
    const r = await query(
      `SELECT s.id, s.branch_id, s.amount, s.start_date, s.end_date, s.payment_method, s.plan_name, s.code_entreprise,
              m.full_name, m.employee_id, m.cin, m.bank_account, m.phone,
              b.branch_name, b.city AS branch_city,
              c.id AS contract_id, c.contract_number, c.authorization_reference
       FROM gym_subscriptions s
       JOIN gym_members m ON m.id=s.member_id
       LEFT JOIN gym_branches b ON b.id=s.branch_id
       LEFT JOIN gym_contracts c ON c.subscription_id=s.id AND c.tenant_code=s.code_entreprise
       WHERE ${where.join(" AND ")}`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Salary deduction subscription not found" });

    const html = buildSalaryDeductionAuthorizationHtmlPaper(r.rows[0]);
    let pdf = await generatePdfFromHtml({
      title: `Autorisation prelevement automatique - SUB-${r.rows[0].id}`,
      html,
      language: "fr",
      showHeader: false,
      showSignatures: false,
      pageMargin: "10mm 10mm",
    });
    if (!pdf) {
      pdf = generatePdf({
        title: "Autorisation de prelevement automatique",
        html,
        text: stripHtml(html),
      });
    }
    const fileName = `autorisation_prelevement_automatique_SUB-${r.rows[0].id}.pdf`;
    const savedFile = await trySaveGymGeneratedFile({
      req,
      tenantCode: scope.code,
      branchId: r.rows[0].branch_id || null,
      entityType: "subscription",
      entityId: r.rows[0].id,
      category: "authorization_pdf",
      filename: fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from(pdf),
    });

    await query(
      `UPDATE gym_subscriptions
       SET workflow_status=CASE WHEN workflow_status='pending' THEN 'printed' ELSE workflow_status END,
           deduction_doc_ref=$1,
           updated_at=NOW()
       WHERE id=$2 AND code_entreprise=$3`,
      [`AUTH-SALARY-${r.rows[0].id}`, r.rows[0].id, scope.code]
    );

    if (savedFile) {
      await query(
        `UPDATE gym_contracts SET authorization_pdf_path=$1
         WHERE tenant_code=$2 AND subscription_id=$3`,
        [`minio:${savedFile.minio_object_key}`, scope.code, r.rows[0].id]
      );
    }

    await logGenerationOperation({
      req,
      tenantCode: scope.code,
      branchId: r.rows[0].branch_id || null,
      operationType: "authorization_pdf",
      entityType: "subscription",
      entityId: r.rows[0].id,
      fileName,
      mimeType: "application/pdf",
      details: {
        contract_number: r.rows[0].contract_number || `SD-${r.rows[0].id}`,
        authorization_reference: r.rows[0].authorization_reference || `AUTH-SALARY-${r.rows[0].id}`,
      },
    });

    await safeCreateNotification({
      tenant_code: scope.code,
      type: "authorization_form_generated",
      entity_type: "subscription",
      entity_id: r.rows[0].id,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("X-Gym-Message", "Authorization PDF generated successfully.");
    res.send(pdf);
  } catch (e) { next(e); }
});

router.post("/payments/process-month", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const monthRef = String(req.body?.month_ref || "").trim();
    if (!monthRef) return res.status(400).json({ error: "month_ref is required (YYYY-MM-01)" });
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["code_entreprise=$1", "workflow_status='processed'"];
    addBranchCondition(where, params, scope);

    const subs = await query(
      `SELECT id, amount, due_day FROM gym_subscriptions
       WHERE ${where.join(" AND ")}`,
      params
    );

    const created = [];
    for (const s of subs.rows) {
      const dueDate = new Date(monthRef);
      dueDate.setDate(Number(s.due_day || 5));

      const ins = await query(
        `INSERT INTO gym_payments (subscription_id, month_ref, due_date, amount, status)
         VALUES ($1,$2,$3,$4,'pending')
         ON CONFLICT (subscription_id, month_ref) DO UPDATE SET due_date=EXCLUDED.due_date
         RETURNING *`,
        [s.id, monthRef, dueDate.toISOString().slice(0, 10), s.amount]
      );
      created.push(ins.rows[0]);
    }

    if (created.length > 0) {
      await safeCreateNotification({
        tenant_code: scope.code,
        type: "payment_retry_scheduled",
        title: "Echeances mensuelles generees",
        message: `${created.length} monthly payment records generated.`,
        severity: "info",
        entity_type: "payment_batch",
      });
    }

    res.json({ month_ref: monthRef, generated_count: created.length, payments: created });
  } catch (e) { next(e); }
});

router.post("/payments/:id/attempt", requireRole("admin", "super_admin", "hq_admin", "comptable", "gym_manager", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const outcome = String(req.body?.outcome || "success");
    const map = { success: "success", insufficient_funds: "insufficient_funds", failed: "failed" };
    if (!map[outcome]) return res.status(400).json({ error: "Invalid outcome" });

    const params = [req.params.id, scope.code];
    const where = ["p.id=$1", "s.code_entreprise=$2"];
    addBranchCondition(where, params, scope, "s");
    const cur = await query(
      `SELECT p.*, s.id AS subscription_id
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       WHERE ${where.join(" AND ")}`,
      params
    );

    if (!cur.rows[0]) return res.status(404).json({ error: "Payment not found" });
    const p = cur.rows[0];

    if (p.status === "success") {
      return res.status(400).json({ error: "Payment already marked as success" });
    }

    const attempts = Number(p.attempt_count || 0) + 1;
    let nextStatus = map[outcome];

    if (nextStatus !== "success" && attempts < 2) {
      nextStatus = "retry_scheduled";
    }

    const updated = await query(
      `UPDATE gym_payments
           SET attempt_count=$1,
               status=$2::varchar,
               paid_at=CASE WHEN $2::varchar='success' THEN NOW() ELSE paid_at END,
               failure_reason=CASE WHEN $2::varchar IN ('failed','insufficient_funds','retry_scheduled') THEN COALESCE($3, failure_reason) ELSE failure_reason END
       WHERE id=$4
       RETURNING *`,
      [attempts, nextStatus, req.body?.failure_reason || null, req.params.id]
    );

    await query(
      `INSERT INTO payment_attempts (payment_id, attempt_no, result_status, failure_reason)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (payment_id, attempt_no) DO UPDATE
       SET result_status=EXCLUDED.result_status,
           failure_reason=EXCLUDED.failure_reason,
           attempted_at=NOW()`,
      [req.params.id, attempts, nextStatus, req.body?.failure_reason || null]
    );

    let suspended = false;
    if (nextStatus !== "success" && attempts >= 2) {
      await query(
        `UPDATE gym_subscriptions
         SET updated_at=NOW()
         WHERE id=$1`,
        [p.subscription_id]
      );
      suspended = true;
    }

    const code = scope.code || config.defaultTenantCode;
    let notificationType = "payment_success";
    if (nextStatus === "retry_scheduled") notificationType = "payment_retry_scheduled";
    if (nextStatus === "failed" || nextStatus === "insufficient_funds") notificationType = attempts >= 2 ? "payment_final_failed" : "payment_failed";

    await safeCreateNotification({
      tenant_code: code,
      type: notificationType,
      entity_type: "payment",
      entity_id: updated.rows[0].id,
      message: req.body?.failure_reason || undefined,
      severity: nextStatus === "success" ? "success" : attempts >= 2 ? "danger" : "warning",
    });

    res.json({ ...updated.rows[0], suspended_subscription: suspended });
  } catch (e) { next(e); }
});

router.post("/payments/batch/xml", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const monthRef = String(req.body?.month_ref || "").trim();
    if (!monthRef) return res.status(400).json({ error: "month_ref is required" });
    const selectedSubscriptionIds = Array.isArray(req.body?.selected_subscription_ids)
      ? req.body.selected_subscription_ids.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : String(req.body?.selected_subscription_ids || "")
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value));
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const code = scope.code;
    const params = [code, monthRef];
    const where = [
      "s.code_entreprise=$1",
      "s.payment_method='salary_deduction'",
      "s.status='active'",
      "s.workflow_status='processed'",
      "c.validation_status IN ('approved','validated')",
      "q.status IN ('approved','validated')",
    ];
    addBranchCondition(where, params, scope, "s");

    const validated = selectedSubscriptionIds.length
      ? await query(
          `SELECT COALESCE(p.id, s.id) AS payment_id,
                  p.due_date AS due_date,
                  p.status AS payment_status,
                  s.id AS subscription_id, s.plan_name, s.amount, s.due_day, s.start_date, s.end_date, s.workflow_status, s.status AS subscription_status,
                  s.deduction_doc_ref,
                  m.full_name, m.member_code, m.employee_id, m.cin, m.bank_account,
                  c.contract_number, c.authorization_reference, c.validation_status,
                  b.branch_name
           FROM gym_subscriptions s
           JOIN gym_members m ON m.id=s.member_id
           LEFT JOIN gym_payments p ON p.subscription_id=s.id AND p.month_ref=$2
           LEFT JOIN gym_contracts c ON c.subscription_id=s.id AND c.tenant_code=s.code_entreprise
           LEFT JOIN hq_validation_queue q ON q.subscription_id=s.id AND q.tenant_code=s.code_entreprise
           LEFT JOIN gym_branches b ON b.id=s.branch_id
           WHERE s.code_entreprise=$1
             AND s.payment_method='salary_deduction'
             AND s.status='active'
             ${scope.branchId ? "AND s.branch_id=$3" : ""}
             AND s.id = ANY($${scope.branchId ? 4 : 3}::int[])
           ORDER BY s.id ASC`,
          scope.branchId ? [code, monthRef, scope.branchId, selectedSubscriptionIds] : [code, monthRef, selectedSubscriptionIds]
        )
      : await query(
          `SELECT COALESCE(p.id, s.id) AS payment_id,
                  p.due_date AS due_date,
                  p.status AS payment_status,
                  s.id AS subscription_id, s.plan_name, s.amount, s.due_day, s.start_date, s.end_date, s.workflow_status, s.status AS subscription_status,
                  s.deduction_doc_ref,
                  m.full_name, m.member_code, m.employee_id, m.cin, m.bank_account,
                  c.contract_number, c.authorization_reference, c.validation_status,
                  b.branch_name
           FROM gym_subscriptions s
           JOIN gym_members m ON m.id=s.member_id
           LEFT JOIN gym_payments p ON p.subscription_id=s.id AND p.month_ref=$2
           JOIN gym_contracts c ON c.subscription_id=s.id AND c.tenant_code=s.code_entreprise
           JOIN hq_validation_queue q ON q.subscription_id=s.id AND q.tenant_code=s.code_entreprise
           LEFT JOIN gym_branches b ON b.id=s.branch_id
           WHERE ${where.join(" AND ")}
           ORDER BY s.id ASC`,
          params
        );

    if (!validated.rows.length) {
      return res.status(409).json({
        error: selectedSubscriptionIds.length
          ? "No selected salary deduction requests found"
          : "No validated salary deduction requests found",
        message: selectedSubscriptionIds.length
          ? "Bank file generation is blocked until the selected subscriptions are available."
          : "Bank file generation is blocked until at least one salary deduction subscription is approved by HQ and active.",
      });
    }

    await query(
      `DELETE FROM gym_batch_jobs
       WHERE code_entreprise=$1 AND month_ref=$2`,
      [code, monthRef]
    );

    const generatedAt = new Date().toISOString();
    const batch = buildSalaryDeductionBatchData({
      tenantCode: code,
      monthRef,
      generatedAt,
      generatedBy: req.user || {},
      rows: validated.rows,
    });
    const txtFileName = `salary_deduction_${code}_${monthRef}.txt`;
    const xmlFileName = `salary_deduction_${code}_${monthRef}.xml`;
    const txtContent = buildSalaryDeductionTxt(batch);
    const xmlContent = buildSalaryDeductionXml(batch);
    const txtBuffer = Buffer.from(txtContent, "utf8");
    const xmlBuffer = Buffer.from(xmlContent, "utf8");

    const job = await query(
      `INSERT INTO gym_batch_jobs (code_entreprise, month_ref, status, created_by, processed_by, processed_at)
       VALUES ($1,$2,'processed',$3,$3,NOW())
       RETURNING *`,
      [code, monthRef, req.user?.id || null]
    );

    const savedTxt = await trySaveGymGeneratedFile({
      req,
      tenantCode: code,
      branchId: scope.branchId || null,
      entityType: "bank_batch",
      entityId: job.rows[0].id,
      category: "bank_txt",
      filename: txtFileName,
      mimeType: "text/plain; charset=utf-8",
      buffer: txtBuffer,
    });

    const savedXml = await trySaveGymGeneratedFile({
      req,
      tenantCode: code,
      branchId: scope.branchId || null,
      entityType: "bank_batch",
      entityId: job.rows[0].id,
      category: "bank_xml",
      filename: xmlFileName,
      mimeType: "application/xml",
      buffer: xmlBuffer,
    });

    const expTxt = await query(
      `INSERT INTO gym_salary_deduction_exports (batch_job_id, file_name, file_format, xml_content, minio_bucket, minio_object_key)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [job.rows[0].id, txtFileName, "txt", txtContent, savedTxt?.minio_bucket || null, savedTxt?.minio_object_key || null]
    );

    const expXml = await query(
      `INSERT INTO gym_salary_deduction_exports (batch_job_id, file_name, file_format, xml_content, minio_bucket, minio_object_key)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [job.rows[0].id, xmlFileName, "xml", xmlContent, savedXml?.minio_bucket || null, savedXml?.minio_object_key || null]
    );

    await logGenerationOperation({
      req,
      tenantCode: code,
      branchId: scope.branchId || null,
      operationType: "salary_deduction_bank_xml",
      entityType: "bank_batch",
      entityId: job.rows[0].id,
      fileName: `${txtFileName} | ${xmlFileName}`,
      mimeType: "application/xml,text/plain; charset=utf-8",
      details: {
        month_ref: monthRef,
        total_entries: validated.rows.length,
        total_amount: batch.totalAmount,
        exports: [
          { file_name: txtFileName, file_format: "txt" },
          { file_name: xmlFileName, file_format: "xml" },
        ],
      },
    });

    await safeCreateNotification({
      tenant_code: code,
      type: "bank_xml_generated",
      entity_type: "bank_batch",
      entity_id: job.rows[0].id,
      message: `Bank files generated successfully: ${txtFileName} and ${xmlFileName}`,
    });

    const payload = {
      message: "Bank files generated successfully.",
      batch_job: job.rows[0],
      exports: {
        txt: expTxt.rows[0],
        xml: expXml.rows[0],
      },
      download_urls: {
        txt: `/api/v1/gym/bank-exports/${expTxt.rows[0].id}/download`,
        xml: `/api/v1/gym/bank-exports/${expXml.rows[0].id}/download`,
      },
    };

    res.setHeader("X-Gym-Message", payload.message);

    const requestedFormat = String(req.query?.format || req.body?.format || "").toLowerCase();
    if (String(req.query?.download || "").toLowerCase() === "1" || String(req.query?.download || "").toLowerCase() === "true") {
      const isXml = requestedFormat === "xml";
      const downloadName = isXml ? xmlFileName : txtFileName;
      const downloadContent = isXml ? xmlContent : txtContent;
      const downloadType = isXml ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8";
      res.setHeader("Content-Type", downloadType);
      res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
      return res.send(downloadContent);
    }

    res.json(payload);
  } catch (e) {
    try {
      await logGenerationOperation({
        req,
        tenantCode: String(tenantCode(req) || config.defaultTenantCode),
        branchId: null,
        operationType: "salary_deduction_bank_xml",
        entityType: "bank_batch",
        status: "failed",
        details: { error: e?.message || "Bank XML file generation failed." },
      });
      await safeCreateNotification({
        tenant_code: String(tenantCode(req) || config.defaultTenantCode),
        type: "bank_xml_failed",
        message: e?.message || "Bank XML file generation failed.",
      });
    } catch (_ignored) {}
    next(e);
  }
});

router.get("/contracts", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["c.tenant_code=$1"];
    addBranchCondition(where, params, scope, "s");
    const pagination = parsePagination(req, { defaultLimit: 40, maxLimit: 200 });
    const { rows, total } = await fetchListWithPagination({
      dataSql: `SELECT c.*, s.plan_name, s.amount, s.payment_method, s.workflow_status, m.full_name, m.member_code
                FROM gym_contracts c
                JOIN gym_subscriptions s ON s.id=c.subscription_id
                LEFT JOIN gym_members m ON m.id=s.member_id
                WHERE ${where.join(" AND ")}
                ORDER BY c.id DESC`,
      countSql: `SELECT COUNT(*)::int AS total
                 FROM gym_contracts c
                 JOIN gym_subscriptions s ON s.id=c.subscription_id
                 WHERE ${where.join(" AND ")}`,
      params,
      pagination,
    });
    res.json(maybePaginatedResponse(rows, total, pagination));
  } catch (e) { next(e); }
});

router.get("/authorizations", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["s.code_entreprise=$1", "s.payment_method='salary_deduction'"];
    addBranchCondition(where, params, scope, "s");
    const pagination = parsePagination(req, { defaultLimit: 40, maxLimit: 200 });
    const { rows, total } = await fetchListWithPagination({
      dataSql: `SELECT s.id AS subscription_id, s.amount, s.start_date, s.workflow_status,
                       m.full_name, m.member_code, m.employee_id, m.cin, m.bank_account,
                       c.authorization_pdf_path, c.validation_status
                FROM gym_subscriptions s
                JOIN gym_members m ON m.id=s.member_id
                LEFT JOIN gym_contracts c ON c.subscription_id=s.id
                WHERE ${where.join(" AND ")}
                ORDER BY s.id DESC`,
      countSql: `SELECT COUNT(*)::int AS total
                 FROM gym_subscriptions s
                 JOIN gym_members m ON m.id=s.member_id
                 WHERE ${where.join(" AND ")}`,
      params,
      pagination,
    });
    res.json(maybePaginatedResponse(rows, total, pagination));
  } catch (e) { next(e); }
});

router.get("/payments", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["s.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "s");
    const pagination = parsePagination(req, { defaultLimit: 40, maxLimit: 200 });
    const { rows, total } = await fetchListWithPagination({
      dataSql: `SELECT p.*, s.plan_name, s.payment_method, b.branch_name, m.full_name, m.member_code
                FROM gym_payments p
                JOIN gym_subscriptions s ON s.id=p.subscription_id
                LEFT JOIN gym_branches b ON b.id=s.branch_id
                LEFT JOIN gym_members m ON m.id=s.member_id
                WHERE ${where.join(" AND ")}
                ORDER BY p.due_date DESC, p.id DESC`,
      countSql: `SELECT COUNT(*)::int AS total
                 FROM gym_payments p
                 JOIN gym_subscriptions s ON s.id=p.subscription_id
                 WHERE ${where.join(" AND ")}`,
      params,
      pagination,
    });
    res.json(maybePaginatedResponse(rows, total, pagination));
  } catch (e) { next(e); }
});

router.get("/bank-returns", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["br.code_entreprise=$1"];
    if (scope.branchId) {
      params.push(scope.branchId);
      where.push(`s.branch_id=$${params.length}`);
    }
    const out = await query(
      `SELECT br.*, p.reference, p.amount, p.status AS payment_status
       FROM gym_bank_returns br
       LEFT JOIN gym_payments p ON p.id=br.payment_id
       LEFT JOIN gym_subscriptions s ON s.id=p.subscription_id
       WHERE ${where.join(" AND ")}
       ORDER BY br.id DESC`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.get("/bank-exports", (req, res, next) => {
  if (!requireHqAccess(req, res)) return;
  return next();
}, async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const pagination = parsePagination(req, { defaultLimit: 25, maxLimit: 100 });
    const { rows, total } = await fetchListWithPagination({
      dataSql: `SELECT e.*, j.month_ref, j.status AS batch_status
                FROM gym_salary_deduction_exports e
                JOIN gym_batch_jobs j ON j.id=e.batch_job_id
                WHERE j.code_entreprise=$1
                ORDER BY e.id DESC`,
      countSql: `SELECT COUNT(*)::int AS total
                 FROM gym_salary_deduction_exports e
                 JOIN gym_batch_jobs j ON j.id=e.batch_job_id
                 WHERE j.code_entreprise=$1`,
      params,
      pagination,
    });
    res.json(maybePaginatedResponse(rows, total, pagination));
  } catch (e) { next(e); }
});

router.get("/bank-exports/:id/download", (req, res, next) => {
  if (!requireHqAccess(req, res)) return;
  return next();
}, async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const out = await query(
      `SELECT e.*
       FROM gym_salary_deduction_exports e
       JOIN gym_batch_jobs j ON j.id=e.batch_job_id
       WHERE e.id=$1 AND j.code_entreprise=$2`,
      [req.params.id, scope.code]
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Bank export not found" });
    const contentType = out.rows[0].file_format === "xml" ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${out.rows[0].file_name}"`);
    if (out.rows[0].minio_object_key) {
      const stream = await objectStream(out.rows[0].minio_object_key);
      return stream.pipe(res);
    }
    res.send(out.rows[0].xml_content);
  } catch (e) { next(e); }
});

router.post("/bank-returns", (req, res, next) => {
  if (!requireHqAccess(req, res)) return;
  return next();
}, async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const b = req.body || {};
    const out = await query(
      `INSERT INTO gym_bank_returns
       (code_entreprise, payment_id, batch_job_id, bank_name, result_status, failure_reason, raw_payload, imported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [code, b.payment_id || null, b.batch_job_id || null, b.bank_name || null, b.result_status || "failed", b.failure_reason || null, b.raw_payload || null, req.user?.id || null]
    );

    let paymentStatus = null;
    let attemptNo = null;
    if (b.payment_id) {
      const cur = await query(
        `SELECT p.*, s.id AS subscription_id
         FROM gym_payments p
         JOIN gym_subscriptions s ON s.id=p.subscription_id
         WHERE p.id=$1`,
        [b.payment_id]
      );
      if (cur.rows[0]) {
        const p = cur.rows[0];
        attemptNo = Number(p.attempt_count || 0) + 1;
        if (b.result_status === "success") {
          paymentStatus = "success";
        } else if (attemptNo < 2) {
          paymentStatus = "retry_scheduled";
        } else {
          paymentStatus = b.result_status === "insufficient_funds" ? "insufficient_funds" : "failed";
        }

        await query(
          `UPDATE gym_payments
           SET attempt_count=$1,
               status=$2::varchar,
               paid_at=CASE WHEN $2::varchar='success' THEN NOW() ELSE paid_at END,
               failure_reason=CASE WHEN $2::varchar='success' THEN NULL ELSE COALESCE($3, failure_reason) END
           WHERE id=$4`,
          [attemptNo, paymentStatus, b.failure_reason || null, b.payment_id]
        );

        await query(
          `INSERT INTO payment_attempts (payment_id, attempt_no, result_status, failure_reason)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (payment_id, attempt_no) DO UPDATE
           SET result_status=EXCLUDED.result_status,
               failure_reason=EXCLUDED.failure_reason,
               attempted_at=NOW()`,
          [b.payment_id, attemptNo, paymentStatus, b.failure_reason || null]
        );

        if (paymentStatus !== "success" && attemptNo >= 2) {
          await query(
            `UPDATE gym_subscriptions
             SET deduction_doc_ref=COALESCE(deduction_doc_ref, '') || $1,
                 updated_at=NOW()
             WHERE id=$2`,
            [`|UNPAID:${b.payment_id}`, p.subscription_id]
          );
        }
      }
    }

    await safeCreateNotification({
      tenant_code: code,
      type: paymentStatus === "success" ? "payment_success" : paymentStatus === "retry_scheduled" ? "payment_retry_scheduled" : "payment_final_failed",
      entity_type: "bank_return",
      entity_id: out.rows[0].id,
      message: paymentStatus === "retry_scheduled"
        ? "Bank return failed. A second salary deduction attempt is scheduled."
        : paymentStatus === "success"
          ? "Bank return accepted. Payment validated."
          : "Second bank return failed. Subscription is now marked unpaid.",
      severity: paymentStatus === "success" ? "success" : paymentStatus === "retry_scheduled" ? "warning" : "danger",
    });

    res.status(201).json({ ...out.rows[0], payment_status: paymentStatus, attempt_no: attemptNo });
  } catch (e) { next(e); }
});

router.get("/coaches", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["c.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "c");
    const out = await query(
      `SELECT c.*, b.branch_name, b.branch_code
       FROM gym_coaches c
       LEFT JOIN gym_branches b ON b.id=c.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY c.id DESC`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.post("/coaches", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const out = await query(
      `INSERT INTO gym_coaches (code_entreprise, branch_id, full_name, specialty, phone, email, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [scope.code, branchId, b.full_name, b.specialty || null, b.phone || null, b.email || null, b.status || "active"]
    );
    res.status(201).json(out.rows[0]);
  } catch (e) { next(e); }
});

async function updateCoach(req, res, next) {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const params = [
      branchId,
      b.full_name,
      b.specialty || null,
      b.phone || null,
      b.email || null,
      b.status || "active",
      req.params.id,
      scope.code,
    ];
    const where = ["id=$7", "code_entreprise=$8"];
    if (!scope.isHq) addBranchCondition(where, params, scope);
    const out = await query(
      `UPDATE gym_coaches
       SET branch_id=$1,
           full_name=$2,
           specialty=$3,
           phone=$4,
           email=$5,
           status=$6
       WHERE ${where.join(" AND ")}
       RETURNING *`,
      params
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Coach not found" });
    res.json(out.rows[0]);
  } catch (e) { next(e); }
}

router.put("/coaches/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), updateCoach);
router.patch("/coaches/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), updateCoach);
router.delete("/coaches/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    let where = "id=$1 AND code_entreprise=$2";
    if (!scope.isHq && scope.branchId) {
      params.push(scope.branchId);
      where += ` AND branch_id=$${params.length}`;
    }
    const out = await query(`DELETE FROM gym_coaches WHERE ${where} RETURNING id`, params);
    if (!out.rows[0]) return res.status(404).json({ error: "Coach not found" });
    res.json({ message: "Coach deleted", id: out.rows[0].id });
  } catch (e) { next(e); }
});

router.get("/classes", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["c.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "c");
    const out = await query(
      `SELECT c.*, co.full_name AS coach_name, b.branch_name
       FROM gym_classes c
       LEFT JOIN gym_coaches co ON co.id=c.coach_id
       LEFT JOIN gym_branches b ON b.id=c.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY c.starts_at DESC`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.post("/classes", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const out = await query(
      `INSERT INTO gym_classes (code_entreprise, branch_id, coach_id, class_name, class_type, capacity, starts_at, ends_at, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,20),$7,$8,$9)
       RETURNING *`,
      [scope.code, branchId, b.coach_id || null, b.class_name, b.class_type || null, b.capacity || 20, b.starts_at, b.ends_at || null, b.status || "scheduled"]
    );
    await safeCreateNotification({ tenant_code: scope.code, type: "gym_class_added", entity_type: "class", entity_id: out.rows[0].id });
    if (b.coach_id) await safeCreateNotification({ tenant_code: scope.code, type: "trainer_assigned", entity_type: "class", entity_id: out.rows[0].id });
    res.status(201).json(out.rows[0]);
  } catch (e) { next(e); }
});

router.put("/classes/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const out = await query(
      `UPDATE gym_classes
       SET branch_id=$1, coach_id=$2, class_name=$3, class_type=$4, capacity=COALESCE($5, capacity), starts_at=$6, ends_at=$7, status=$8
       WHERE id=$9 AND code_entreprise=$10
       RETURNING *`,
      [branchId, b.coach_id || null, b.class_name, b.class_type || null, b.capacity || null, b.starts_at, b.ends_at || null, b.status || "scheduled", req.params.id, scope.code]
    );
    if (!out.rows[0]) return res.status(404).json({ error: "Class not found" });
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.patch("/classes/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  return next(new Error("Use PUT /classes/:id"));
});

router.delete("/classes/:id", requireRole("admin", "super_admin", "hq_admin", "gym_manager"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [req.params.id, scope.code];
    const where = ["id=$1", "code_entreprise=$2"];
    addBranchCondition(where, params, scope);
    const out = await query(`DELETE FROM gym_classes WHERE ${where.join(" AND ")} RETURNING *`, params);
    if (!out.rows[0]) return res.status(404).json({ error: "Class not found" });
    res.json({ message: "Class deleted", id: out.rows[0].id });
  } catch (e) { next(e); }
});

router.get("/attendance", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["a.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "a");
    const out = await query(
      `SELECT a.*, m.full_name, m.member_code, c.class_name, b.branch_name
       FROM gym_attendance a
       LEFT JOIN gym_members m ON m.id=a.member_id
       LEFT JOIN gym_classes c ON c.id=a.class_id
       LEFT JOIN gym_branches b ON b.id=a.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY a.checked_in_at DESC
       LIMIT 100`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.post("/attendance/checkin", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const out = await query(
      `INSERT INTO gym_attendance (code_entreprise, member_id, class_id, branch_id, checkin_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [scope.code, b.member_id || null, b.class_id || null, branchId, b.checkin_type || "gym", req.user?.id || null]
    );
    await query(
      `INSERT INTO gym_access_events (code_entreprise, member_id, branch_id, event_type, access_status, reason)
       VALUES ($1,$2,$3,'checkin','granted',$4)`,
      [scope.code, b.member_id || null, branchId, "Member checked in"]
    );
    await safeCreateNotification({ tenant_code: scope.code, type: "member_checkin", entity_type: "attendance", entity_id: out.rows[0].id });
    res.status(201).json(out.rows[0]);
  } catch (e) { next(e); }
});

router.get("/cash", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["ct.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "ct");
    const out = await query(
      `SELECT ct.*, m.full_name, m.member_code, b.branch_name
       FROM gym_cash_transactions ct
       LEFT JOIN gym_members m ON m.id=ct.member_id
       LEFT JOIN gym_branches b ON b.id=ct.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY ct.id DESC`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.post("/cash", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const out = await query(
      `INSERT INTO gym_cash_transactions
       (code_entreprise, branch_id, member_id, subscription_id, amount, direction, payment_method, label, reference, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [scope.code, branchId, b.member_id || null, b.subscription_id || null, b.amount, b.direction || "in", b.payment_method || "cash", b.label || "Cash transaction", b.reference || null, req.user?.id || null]
    );
    res.status(201).json(out.rows[0]);
  } catch (e) { next(e); }
});

router.get("/settings", async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const out = await query(
      `INSERT INTO gym_settings (code_entreprise)
       VALUES ($1)
       ON CONFLICT (code_entreprise) DO UPDATE SET code_entreprise=EXCLUDED.code_entreprise
       RETURNING *`,
      [code]
    );
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.put("/settings", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const b = req.body || {};
    const out = await query(
      `INSERT INTO gym_settings (code_entreprise, currency, default_due_day, occupancy_limit, renewal_warning_days)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (code_entreprise) DO UPDATE SET
         currency=EXCLUDED.currency,
         default_due_day=EXCLUDED.default_due_day,
         occupancy_limit=EXCLUDED.occupancy_limit,
         renewal_warning_days=EXCLUDED.renewal_warning_days,
         updated_at=NOW()
       RETURNING *`,
      [code, b.currency || "DT", b.default_due_day || 5, b.occupancy_limit || 80, b.renewal_warning_days || 3]
    );
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.get("/access-events", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["ae.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "ae");
    const out = await query(
      `SELECT ae.*, m.full_name, m.member_code, b.branch_name
       FROM gym_access_events ae
       LEFT JOIN gym_members m ON m.id=ae.member_id
       LEFT JOIN gym_branches b ON b.id=ae.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY ae.created_at DESC
       LIMIT 100`,
      params
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.post("/access-events", requireRole("admin", "super_admin", "hq_admin", "gym_manager", "comptable", "client"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const b = req.body || {};
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const out = await query(
      `INSERT INTO gym_access_events (code_entreprise, member_id, branch_id, event_type, access_status, reason)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [scope.code, b.member_id || null, branchId, b.event_type || "checkin", b.access_status || "granted", b.reason || null]
    );
    res.status(201).json(out.rows[0]);
  } catch (e) { next(e); }
});

router.get("/statistics", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const cacheKey = `statistics:${scope.code}:${scope.branchId || "all"}`;
    const cached = getCachedValue(cacheKey);
    if (cached) {
      res.setHeader("X-Gym-Cache", "HIT");
      return res.json(cached);
    }
    const branchSql = scope.branchId ? " AND branch_id=$2" : "";
    const params = scope.branchId ? [scope.code, scope.branchId] : [scope.code];
    const out = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM gym_members WHERE code_entreprise=$1${branchSql}) AS members,
         (SELECT COUNT(*)::int FROM gym_subscriptions WHERE code_entreprise=$1${branchSql}) AS subscriptions,
         (SELECT COUNT(*)::int FROM gym_branches WHERE code_entreprise=$1${scope.branchId ? " AND id=$2" : ""}) AS branches,
         (SELECT COUNT(*)::int FROM gym_classes WHERE code_entreprise=$1${branchSql}) AS classes,
         (SELECT COUNT(*)::int FROM gym_attendance WHERE code_entreprise=$1${branchSql} AND checked_in_at::date=CURRENT_DATE) AS today_checkins,
         (SELECT COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE -amount END),0) FROM gym_cash_transactions WHERE code_entreprise=$1${branchSql}) AS cash_balance`,
      params
    );
    const payload = out.rows[0];
    setCachedValue(cacheKey, payload, 15000);
    res.setHeader("X-Gym-Cache", "MISS");
    res.json(payload);
  } catch (e) { next(e); }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const cacheKey = `dashboard:${scope.code}:${scope.branchId || "all"}`;
    const cached = getCachedValue(cacheKey);
    if (cached) {
      res.setHeader("X-Gym-Cache", "HIT");
      return res.json(cached);
    }
    const subFilter = scope.branchId ? " AND s.branch_id=$2" : "";
    const tableFilter = scope.branchId ? " AND branch_id=$2" : "";
    const params = scope.branchId ? [scope.code, scope.branchId] : [scope.code];

    const safeQuery = async (sql, params, fallbackRows) => {
      try {
        return await query(sql, params);
      } catch (err) {
        console.warn("[gym dashboard fallback]", err?.message || err);
        return { rows: fallbackRows };
      }
    };

    const revenue = await safeQuery(
      `SELECT COALESCE(SUM(amount),0) AS value
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       WHERE s.code_entreprise=$1${subFilter} AND p.status='success'`,
      params,
      [{ value: 0 }]
    );

    const activeSubs = await safeQuery(
      `SELECT COUNT(*)::int AS value
       FROM gym_subscriptions
       WHERE code_entreprise=$1${tableFilter} AND workflow_status IN ('pending','printed','sent_hq','processed')`,
      params,
      [{ value: 0 }]
    );

    const pendingSubs = await safeQuery(
      `SELECT COUNT(*)::int AS value
       FROM gym_subscriptions
       WHERE code_entreprise=$1${tableFilter} AND workflow_status IN ('pending','printed','sent_hq')`,
      params,
      [{ value: 0 }]
    );

    const payStats = await safeQuery(
      `SELECT
        COUNT(*) FILTER (WHERE p.status='success')::int AS success_count,
        COUNT(*) FILTER (WHERE p.status IN ('failed','insufficient_funds'))::int AS failed_count,
        COUNT(*)::int AS total_count
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       WHERE s.code_entreprise=$1${subFilter}`,
      params,
      [{ success_count: 0, failed_count: 0, total_count: 0 }]
    );

    const unpaid = await safeQuery(
      `SELECT COUNT(*)::int AS value
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       WHERE s.code_entreprise=$1${subFilter} AND p.status IN ('pending','retry_scheduled','insufficient_funds','failed')`,
      params,
      [{ value: 0 }]
    );

    const byBranch = await safeQuery(
      `SELECT COALESCE(b.branch_name, 'N/A') AS branch_name,
              COUNT(s.id)::int AS subscriptions,
              COALESCE(SUM(CASE WHEN p.status='success' THEN p.amount ELSE 0 END),0) AS revenue
       FROM gym_subscriptions s
       LEFT JOIN gym_branches b ON b.id=s.branch_id
       LEFT JOIN gym_payments p ON p.subscription_id=s.id
       WHERE s.code_entreprise=$1${subFilter}
       GROUP BY b.branch_name
       ORDER BY revenue DESC`,
      params,
      []
    );

    const ps = payStats.rows[0] || { success_count: 0, failed_count: 0, total_count: 0 };
    const rate = Number(ps.total_count) > 0 ? (Number(ps.success_count) * 100) / Number(ps.total_count) : 0;
    const payload = {
      revenue: Number(revenue.rows[0]?.value || 0),
      unpaid_subscriptions: Number(unpaid.rows[0]?.value || 0),
      active_subscribers: Number(activeSubs.rows[0]?.value || 0),
      pending_subscriptions: Number(pendingSubs.rows[0]?.value || 0),
      payment_success_rate: Number(rate.toFixed(2)),
      payments: {
        success: Number(ps.success_count || 0),
        failed: Number(ps.failed_count || 0),
        total: Number(ps.total_count || 0),
      },
      branch_performance: byBranch.rows,
    };
    setCachedValue(cacheKey, payload, 15000);
    res.json(payload);
  } catch (e) { next(e); }
});

module.exports = router;
