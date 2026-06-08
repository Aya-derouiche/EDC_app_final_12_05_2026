const router = require("express").Router();
const multer = require("multer");
const { query } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const config = require("../config");
const { uploadGymFile, uploadGymBuffer, objectStream, presignedUrl, bucket: minioBucket } = require("../storage/minio");
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

function ribCells(value) {
  const chars = String(value || "").replace(/\s+/g, "").split("");
  const count = Math.max(20, chars.length || 20);
  return Array.from({ length: count }, (_, i) => `<span>${escapeHtml(chars[i] || "")}</span>`).join("");
}

function buildSalaryDeductionAuthorizationHtml(row) {
  const today = new Date();
  const companyName = row.company_name || row.branch_company_name || "La Sté Olympe Gym";
  const branchName = row.branch_name || "Gym";
  const contractNumber = row.contract_number || `SUB-${row.id}`;
  const city = row.branch_city || "Sousse";
  const deductionDay = Number(row.deduction_day || 5);
  return `
    <style>
      .auto-form { color: #222; font-family: Arial, sans-serif; font-size: 12.5px; line-height: 1.5; }
      .auto-top { display: grid; grid-template-columns: 1fr 230px; gap: 20px; align-items: start; margin-bottom: 14px; }
      .auto-title { border: 2px solid #333; font-size: 21px; font-weight: 700; margin: 0 auto; padding: 12px 24px; text-align: center; width: 560px; }
      .auto-meta { font-size: 13px; line-height: 2.1; padding-top: 6px; }
      .line { border-bottom: 1px dotted #555; display: inline-block; min-width: 230px; padding: 0 8px 1px; }
      .line.small { min-width: 100px; }
      .line.medium { min-width: 160px; }
      .identity p, .body p { margin: 8px 0; }
      .muted { color: #444; font-size: 11px; }
      .rib-row { align-items: center; display: grid; gap: 14px; grid-template-columns: 130px 1fr; margin: 18px 0; }
      .rib-cells { display: flex; flex-wrap: nowrap; }
      .rib-cells span { border: 1px solid #444; border-left: 0; display: inline-block; font-size: 22px; height: 34px; line-height: 32px; min-width: 27px; text-align: center; }
      .rib-cells span:first-child { border-left: 1px solid #444; }
      .checkline { align-items: center; display: flex; gap: 24px; margin: 18px 0; }
      .box { border: 1px solid #444; display: inline-block; font-weight: 700; height: 24px; line-height: 22px; margin: 0 4px; text-align: center; width: 34px; }
      .tick { border: 1px solid #444; display: inline-block; height: 24px; line-height: 20px; text-align: center; vertical-align: middle; width: 34px; }
      .company { margin: 13px 0; }
      .bold-note { font-size: 15px; font-weight: 700; margin: 18px 0; }
      .signatures-local { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; margin-top: 30px; page-break-inside: avoid; }
      .sign-box { min-height: 112px; }
      .conditions { margin-top: 32px; }
      .conditions h2 { border-bottom: 1px solid #222; display: inline-block; font-size: 16px; margin: 0 0 12px; padding: 0; }
      .conditions p { margin: 10px 0; }
      .conditions .indent { margin-left: 34px; }
    </style>
    <section class="auto-form">
      <div class="auto-top">
        <div class="auto-title">Autorisation de prélèvement automatique</div>
        <div class="auto-meta">
          <div><strong>contrat N°</strong> <span class="line small">${escapeHtml(contractNumber)}</span></div>
          <div><strong>Salle :</strong> <span class="line small">${escapeHtml(branchName)}</span></div>
          <div><strong>commercial</strong> <span class="line small"></span></div>
        </div>
      </div>

      <div class="identity">
        <p>Je soussigné(e),</p>
        <p><strong>Nom et Prénom :</strong> <span class="line">${blank(row.full_name, "")}</span></p>
        <p class="muted">( Contrat au nom de : <span class="line medium">${blank(row.contract_holder, "")}</span> )</p>
        <p><strong>C.I.N N°</strong> <span class="line medium">${blank(row.cin, "")}</span> délivrée le <span class="line medium"></span> à <span class="line medium"></span></p>
        <p><strong>N° téléphone</strong> <span class="line medium">${blank(row.phone, "")}</span></p>
      </div>

      <div class="rib-row">
        <strong>RIB Bancaire :</strong>
        <div class="rib-cells">${ribCells(row.bank_account)}</div>
      </div>

      <div class="body">
        <p>autorise <strong>${escapeHtml(companyName)}</strong> à exécuter les ordres des prélèvements automatiques : fermes et irrévocables sur mon compte</p>
        <p>une fois par mois <strong>à partir de mois de</strong> <span class="line medium">${formatMonthYear(row.start_date)}</span> <strong>et jusqu'au mois</strong> <span class="line medium">${formatMonthYear(row.end_date)}</span></p>
        <div class="checkline">
          <span>et ce ou bien le 05 de chaque mois <span class="box">5</span><span class="tick">${deductionDay === 5 ? "X" : ""}</span></span>
          <span>ou bien le 26 de chaque mois <span class="box">26</span><span class="tick">${deductionDay === 26 ? "X" : ""}</span></span>
          <span>( à mettre une croix )</span>
        </div>
        <p>d'un montant de <span class="line small">${formatAmount(row.amount)}</span> dt,000 ( <span class="line"></span> ) <strong>au profit de la Société Olympe gym</strong></p>
      </div>

      <p class="company">MF : 1271307F A/M/000--adresse : Immeuble Badr Bloc B 4 ème étage - khezama 4 071-sousse</p>
      <p class="company">et ce sur le compte N° <strong>25 016 0000000092680 24</strong> ouvert à <strong>Banque Zitouna</strong>-agence monastir</p>
      <p class="bold-note">* Code de la sté olympe gym au niveau de La Banque Centrale : 0127</p>

      <div class="signatures-local">
        <div class="sign-box">
          <p>Fait à <span class="line small">${escapeHtml(city)}</span>, Le <span class="line medium">${formatDate(today)}</span></p>
          <p><strong>Signature du Titulaire du compte</strong><br>( Lu et approuvé )</p>
        </div>
        <div class="sign-box">
          <p>Fait à <span class="line small"></span>, Le <span class="line medium"></span></p>
          <p style="text-align:center;"><strong>Accord de la Banque</strong><br>( Visa et cachet du Chef d'agence )</p>
        </div>
      </div>

      <div class="conditions">
        <h2>Conditions particulières exigées :</h2>
        <p><strong>1- Changement des coordonnées bancaires :</strong></p>
        <p class="indent">* En cas de changement des coordonnées bancaires, l'abonné est tenu de refaire l'autorisation et de la déposer dans la salle de sport concernée : (olympe gym + olympe fitness extrême : Sousse et olympe Ennasr : Tunis).</p>
        <p><strong>2- Modalités de résiliation de l'abonnement :</strong></p>
        <p class="indent">* <strong><u>L'abonnement ne peut être résilié ni remboursé pendant la durée minimale, soit 12 mois.</u></strong> À l'issue de la durée minimale.</p>
        <p class="indent">* L'abonnement est conclu pour une durée minimale de 12 mois. <strong><u>Cette durée est incompressible.</u></strong></p>
        <p class="indent">* Les montants des prélèvements sont garantis pendant la période minimale de l'abonnement. Cependant, les montants des prélèvements mensuels peuvent être révisés à la hausse après la période minimale d'engagement.</p>
        <p class="indent">* En cas d'impayés d'une échéance, la société olympe gym bloquera systématiquement l'abonnement.</p>
        <p class="indent">* L'adhérent est tenu de régulariser le montant dû pour réactiver son abonnement.</p>
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

const hqRoles = new Set(["admin", "super_admin", "superadmin", "hq_admin", "hqadmin", "siege", "siège"]);

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
    audience: "hq_admin",
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
    audience: "hq_admin,comptable",
  },
  bank_xml_failed: {
    category: "bank",
    severity: "danger",
    title: "Erreur fichier bancaire",
    message: "Bank XML file generation failed.",
    audience: "hq_admin,comptable",
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
    audience: "admin,hq_admin",
  },
  employee_account_created: {
    category: "security",
    severity: "info",
    title: "Nouveau compte cree",
    message: "A new employee account has been created.",
    audience: "admin,hq_admin",
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
      xml_content TEXT NOT NULL,
      minio_bucket VARCHAR(120),
      minio_object_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
    `ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`,
    `ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS failure_reason TEXT`,
    `ALTER TABLE gym_payments ADD COLUMN IF NOT EXISTS reference VARCHAR(120)`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS contract_pdf_path TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS mandate_pdf_path TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS authorization_pdf_path TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS hq_comment TEXT`,
    `ALTER TABLE gym_notifications ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES gym_branches(id) ON DELETE SET NULL`,
    `ALTER TABLE gym_salary_deduction_exports ADD COLUMN IF NOT EXISTS minio_bucket VARCHAR(120)`,
    `ALTER TABLE gym_salary_deduction_exports ADD COLUMN IF NOT EXISTS minio_object_key TEXT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS validated_by BIGINT`,
    `ALTER TABLE gym_contracts ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP`,
    `CREATE INDEX IF NOT EXISTS idx_gym_members_tenant_branch ON gym_members(code_entreprise, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_subscriptions_tenant_branch ON gym_subscriptions(code_entreprise, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_coaches_tenant_branch ON gym_coaches(code_entreprise, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_payments_month_status ON gym_payments(month_ref, status)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_notifications_tenant_status ON gym_notifications(tenant_code, status)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_notifications_tenant_branch ON gym_notifications(tenant_code, branch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gym_files_tenant_branch ON gym_files(tenant_code, branch_id)`,
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

router.post("/bootstrap", requireRole("admin", "super_admin", "hq_admin"), async (_req, res, next) => {
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
    await saveGymGeneratedFile({
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
    const r = await query(
      `SELECT m.*, b.branch_name
       FROM gym_members m
       LEFT JOIN gym_branches b ON b.id=m.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY m.id DESC`,
      params
    );
    res.json(r.rows);
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
    const paymentMethod = String(b.payment_method || "direct");
    const workflow = paymentMethod === "salary_deduction" ? "printed" : (b.workflow_status || "processed");
    const branchId = scopedBranchId(scope, b.branch_id || null);
    const memberParams = [b.member_id, scope.code];
    const memberWhere = ["id=$1", "code_entreprise=$2"];
    addBranchCondition(memberWhere, memberParams, { ...scope, branchId });
    const memberCheck = await query(`SELECT id FROM gym_members WHERE ${memberWhere.join(" AND ")}`, memberParams);
    if (!memberCheck.rows[0]) return res.status(404).json({ error: "Member not found in this branch" });

    const r = await query(
      `INSERT INTO gym_subscriptions
      (code_entreprise, branch_id, member_id, plan_name, amount, payment_method, workflow_status, due_day, start_date, end_date, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,5),$9,$10,$11)
      RETURNING *`,
      [scope.code, branchId, b.member_id, b.plan_name, b.amount, paymentMethod, workflow, b.due_day || 5, b.start_date, b.end_date || null, req.user?.id || null]
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
        `INSERT INTO gym_contracts (subscription_id, tenant_code, validation_status, authorization_pdf_path)
         VALUES ($1,$2,'pending_hq',$3)`,
        [created.id, scope.code, `/api/v1/gym/subscriptions/${created.id}/authorization-form.pdf`]
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

router.get("/subscriptions", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const params = [scope.code];
    const where = ["s.code_entreprise=$1"];
    addBranchCondition(where, params, scope, "s");
    const r = await query(
      `SELECT s.*, m.full_name, m.member_code, b.branch_name
       FROM gym_subscriptions s
       JOIN gym_members m ON m.id = s.member_id
       LEFT JOIN gym_branches b ON b.id=s.branch_id
       WHERE ${where.join(" AND ")}
       ORDER BY s.id DESC`,
      params
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/hq/validations", requireRole("hq_admin", "super_admin", "admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const status = String(req.query.status || "pending");

    const out = await query(
      `SELECT q.*, s.member_id, s.plan_name, s.amount, s.start_date, s.payment_method,
              m.full_name, m.member_code, c.validation_status, c.hq_comment
       FROM hq_validation_queue q
       JOIN gym_subscriptions s ON s.id=q.subscription_id
       LEFT JOIN gym_members m ON m.id=s.member_id
       LEFT JOIN gym_contracts c ON c.subscription_id=s.id
       WHERE q.tenant_code=$1 AND q.status=$2
       ORDER BY q.id DESC`,
      [code, status]
    );

    res.json(out.rows);
  } catch (e) { next(e); }
});

router.post("/hq/validate/:subscriptionId", requireRole("hq_admin", "super_admin", "admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const code = String(tenantCode(req) || "");
    const subscriptionId = Number(req.params.subscriptionId);
    const action = String(req.body?.action || "").trim();
    const comment = req.body?.comment || null;

    const map = {
      approve: { queue: "approved", contract: "approved", workflow: "processed" },
      reject: { queue: "rejected", contract: "rejected", workflow: "pending" },
      needs_update: { queue: "needs_update", contract: "needs_update", workflow: "pending" },
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
       SET workflow_status=$1, validated_by=$2, updated_at=NOW()
       WHERE id=$3
       RETURNING *`,
      [map[action].workflow, req.user?.id || null, subscriptionId]
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
              b.branch_name, b.city AS branch_city
       FROM gym_subscriptions s
       JOIN gym_members m ON m.id=s.member_id
       LEFT JOIN gym_branches b ON b.id=s.branch_id
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
    res.json({ subscription_id: x.id, generated_at: new Date().toISOString(), authorization_text: text });
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
              c.id AS contract_id
       FROM gym_subscriptions s
       JOIN gym_members m ON m.id=s.member_id
       LEFT JOIN gym_branches b ON b.id=s.branch_id
       LEFT JOIN gym_contracts c ON c.subscription_id=s.id AND c.tenant_code=s.code_entreprise
       WHERE ${where.join(" AND ")}`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Salary deduction subscription not found" });

    const html = buildSalaryDeductionAuthorizationHtml(r.rows[0]);
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
    const savedFile = await saveGymGeneratedFile({
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

    await query(
      `UPDATE gym_contracts SET authorization_pdf_path=$1
       WHERE tenant_code=$2 AND subscription_id=$3`,
      [`minio:${savedFile.minio_object_key}`, scope.code, r.rows[0].id]
    );

    await safeCreateNotification({
      tenant_code: scope.code,
      type: "authorization_form_generated",
      entity_type: "subscription",
      entity_id: r.rows[0].id,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
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

router.post("/payments/batch/xml", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const monthRef = String(req.body?.month_ref || "").trim();
    if (!monthRef) return res.status(400).json({ error: "month_ref is required" });
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const code = scope.code;

    const job = await query(
      `INSERT INTO gym_batch_jobs (code_entreprise, month_ref, status, created_by)
       VALUES ($1,$2,'processed',$3)
       RETURNING *`,
      [code, monthRef, req.user?.id || null]
    );

    const payParams = [code, monthRef];
    const payWhere = [
      "s.code_entreprise=$1",
      "p.month_ref=$2",
      "s.payment_method='salary_deduction'",
      "s.workflow_status='processed'",
      "p.status IN ('pending','retry_scheduled','insufficient_funds')",
    ];
    addBranchCondition(payWhere, payParams, scope, "s");
    const pays = await query(
      `SELECT p.id, p.amount, p.month_ref, p.due_date, p.status,
              s.id AS subscription_id, s.plan_name,
              m.full_name, m.employee_id, m.bank_account, m.cin
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       JOIN gym_members m ON m.id=s.member_id
       WHERE ${payWhere.join(" AND ")}`,
      payParams
    );

    const lines = pays.rows.map((x) =>
      `  <Deduction>` +
      `<PaymentId>${escapeXml(x.id)}</PaymentId>` +
      `<SubscriptionId>${escapeXml(x.subscription_id)}</SubscriptionId>` +
      `<EmployeeId>${escapeXml(x.employee_id || "")}</EmployeeId>` +
      `<MemberName>${escapeXml(x.full_name || "")}</MemberName>` +
      `<CIN>${escapeXml(x.cin || "")}</CIN>` +
      `<BankAccount>${escapeXml(x.bank_account || "")}</BankAccount>` +
      `<Plan>${escapeXml(x.plan_name || "")}</Plan>` +
      `<Amount currency="DT">${escapeXml(x.amount)}</Amount>` +
      `<DueDate>${escapeXml(String(x.due_date || "").slice(0, 10))}</DueDate>` +
      `<Status>${escapeXml(x.status)}</Status>` +
      `</Deduction>`
    ).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<SalaryDeductions tenant="${escapeXml(code)}" month="${escapeXml(monthRef)}" generatedAt="${new Date().toISOString()}">\n${lines}\n</SalaryDeductions>`;
    const fileName = `salary_deduction_${code}_${monthRef}.xml`;
    const xmlBuffer = Buffer.from(xml, "utf8");
    const savedXml = await saveGymGeneratedFile({
      req,
      tenantCode: code,
      branchId: scope.branchId || null,
      entityType: "bank_batch",
      entityId: job.rows[0].id,
      category: "bank_xml",
      filename: fileName,
      mimeType: "application/xml",
      buffer: xmlBuffer,
    });

    const exp = await query(
      `INSERT INTO gym_salary_deduction_exports (batch_job_id, file_name, xml_content, minio_bucket, minio_object_key)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [job.rows[0].id, fileName, xml, savedXml.minio_bucket, savedXml.minio_object_key]
    );

    await safeCreateNotification({
      tenant_code: code,
      type: "bank_xml_generated",
      entity_type: "bank_batch",
      entity_id: job.rows[0].id,
      message: `Bank XML batch file generated successfully: ${fileName}`,
    });

    res.json({ batch_job: job.rows[0], export: exp.rows[0] });
  } catch (e) {
    try {
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
    const out = await query(
      `SELECT c.*, s.plan_name, s.amount, s.payment_method, s.workflow_status, m.full_name, m.member_code
       FROM gym_contracts c
       JOIN gym_subscriptions s ON s.id=c.subscription_id
       LEFT JOIN gym_members m ON m.id=s.member_id
       WHERE ${where.join(" AND ")}
       ORDER BY c.id DESC`,
      params
    );
    res.json(out.rows);
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
    const out = await query(
      `SELECT s.id AS subscription_id, s.amount, s.start_date, s.workflow_status,
              m.full_name, m.member_code, m.employee_id, m.cin, m.bank_account,
              c.authorization_pdf_path, c.validation_status
       FROM gym_subscriptions s
       JOIN gym_members m ON m.id=s.member_id
       LEFT JOIN gym_contracts c ON c.subscription_id=s.id
       WHERE ${where.join(" AND ")}
       ORDER BY s.id DESC`,
      params
    );
    res.json(out.rows);
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
    const out = await query(
      `SELECT p.*, s.plan_name, s.payment_method, b.branch_name, m.full_name, m.member_code
       FROM gym_payments p
       JOIN gym_subscriptions s ON s.id=p.subscription_id
       LEFT JOIN gym_branches b ON b.id=s.branch_id
       LEFT JOIN gym_members m ON m.id=s.member_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.due_date DESC, p.id DESC`,
      params
    );
    res.json(out.rows);
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

router.get("/bank-exports", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
    const out = await query(
      `SELECT e.*, j.month_ref, j.status AS batch_status
       FROM gym_salary_deduction_exports e
       JOIN gym_batch_jobs j ON j.id=e.batch_job_id
       WHERE j.code_entreprise=$1
       ORDER BY e.id DESC
       LIMIT 50`,
      [scope.code]
    );
    res.json(out.rows);
  } catch (e) { next(e); }
});

router.get("/bank-exports/:id/download", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
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
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${out.rows[0].file_name}"`);
    if (out.rows[0].minio_object_key) {
      const stream = await objectStream(out.rows[0].minio_object_key);
      return stream.pipe(res);
    }
    res.send(out.rows[0].xml_content);
  } catch (e) { next(e); }
});

router.post("/bank-returns", requireRole("admin", "super_admin", "hq_admin"), async (req, res, next) => {
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
    res.json(out.rows[0]);
  } catch (e) { next(e); }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    await ensureSchema();
    const scope = requireBranchScope(req, res);
    if (!scope) return;
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

    res.json({
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
    });
  } catch (e) { next(e); }
});

module.exports = router;

