const fs = require("fs");
const path = require("path");

const outPath = path.join(__dirname, "..", "docs", "gym-class-diagram.svg");

const W = 2040;
const H = 1540;
const boxW = 300;
const boxH = 220;
const gapX = 20;
const marginX = 40;
const startY = 90;
const rowGap = 350;
const headerH = 34;
const pad = 14;
const font = "Arial, Helvetica, sans-serif";

const rows = [
  [
    { name: "gym_branches", title: "GymBranch", color: "#dbeafe", fields: ["id: BIGSERIAL PK", "code_entreprise", "branch_code", "branch_name", "city", "hotel_spa_integrated"] },
    { name: "gym_members", title: "GymMember", color: "#dcfce7", fields: ["id: BIGSERIAL PK", "code_entreprise", "branch_id FK", "member_code UQ", "full_name", "employee_id / cin", "phone / bank_account", "status"] },
    { name: "gym_subscriptions", title: "GymSubscription", color: "#fef3c7", fields: ["id: BIGSERIAL PK", "code_entreprise", "branch_id FK", "member_id FK", "plan_name", "amount", "payment_method", "workflow_status", "status", "start_date / end_date"] },
    { name: "gym_contracts", title: "GymContract", color: "#ede9fe", fields: ["id: BIGSERIAL PK", "subscription_id FK", "tenant_code", "contract_number", "authorization_reference", "authorization_pdf_path", "validation_status"] },
    { name: "hq_validation_queue", title: "HQValidationQueue", color: "#fce7f3", fields: ["id: BIGSERIAL PK", "tenant_code", "subscription_id FK", "status", "reviewer_id", "reviewed_at"] },
    { name: "gym_batch_jobs", title: "GymBatchJob", color: "#ffe4e6", fields: ["id: BIGSERIAL PK", "code_entreprise", "month_ref", "status", "created_by", "processed_by", "processed_at"] },
  ],
  [
    { name: "gym_payments", title: "GymPayment", color: "#dbeafe", fields: ["id: BIGSERIAL PK", "subscription_id FK", "month_ref", "due_date", "amount", "attempt_count", "status", "paid_at"] },
    { name: "payment_attempts", title: "PaymentAttempt", color: "#dcfce7", fields: ["id: BIGSERIAL PK", "payment_id FK", "attempt_no", "result_status", "failure_reason", "attempted_at"] },
    { name: "gym_bank_returns", title: "GymBankReturn", color: "#fef3c7", fields: ["id: BIGSERIAL PK", "code_entreprise", "payment_id FK", "batch_job_id FK", "bank_name", "result_status", "failure_reason"] },
    { name: "gym_salary_deduction_exports", title: "SalaryDeductionExport", color: "#ede9fe", fields: ["id: BIGSERIAL PK", "batch_job_id FK", "file_name", "xml_content", "minio_bucket", "minio_object_key"] },
    { name: "gym_coaches", title: "GymCoach", color: "#fce7f3", fields: ["id: BIGSERIAL PK", "code_entreprise", "branch_id FK", "full_name", "specialty", "phone / email", "status"] },
    { name: "gym_classes", title: "GymClass", color: "#ffe4e6", fields: ["id: BIGSERIAL PK", "code_entreprise", "branch_id FK", "coach_id FK", "class_name", "class_type", "capacity", "starts_at / ends_at", "status"] },
  ],
  [
    { name: "gym_attendance", title: "GymAttendance", color: "#dbeafe", fields: ["id: BIGSERIAL PK", "code_entreprise", "member_id FK", "class_id FK", "branch_id FK", "checkin_type", "checked_in_at", "created_by"] },
    { name: "gym_cash_transactions", title: "GymCashTransaction", color: "#dcfce7", fields: ["id: BIGSERIAL PK", "code_entreprise", "branch_id FK", "member_id FK", "subscription_id FK", "amount", "direction", "payment_method", "label", "reference"] },
    { name: "gym_settings", title: "GymSettings", color: "#fef3c7", fields: ["id: BIGSERIAL PK", "code_entreprise UQ", "currency", "default_due_day", "occupancy_limit", "renewal_warning_days"] },
    { name: "gym_access_events", title: "GymAccessEvent", color: "#ede9fe", fields: ["id: BIGSERIAL PK", "code_entreprise", "member_id FK", "branch_id FK", "event_type", "access_status", "reason"] },
    { name: "gym_notifications", title: "GymNotification", color: "#fce7f3", fields: ["id: BIGSERIAL PK", "tenant_code", "branch_id FK", "type", "title", "message", "severity", "status", "entity_type / entity_id"] },
    { name: "gym_files", title: "GymFile", color: "#ffe4e6", fields: ["id: BIGSERIAL PK", "tenant_code", "branch_id FK", "entity_type", "entity_id", "file_category", "original_filename", "minio_object_key"] },
  ],
  [
    { name: "contract_templates", title: "ContractTemplate", color: "#dbeafe", fields: ["id: BIGSERIAL PK", "tenant_code", "contract_type", "language", "name", "mandatory_fields", "is_active"] },
    { name: "contracts", title: "Contract", color: "#dcfce7", fields: ["id: BIGSERIAL PK", "tenant_code", "contract_number UQ", "contract_type", "status", "member_id FK", "subscription_id FK", "branch_id FK", "template_id FK", "title"] },
    { name: "contract_versions", title: "ContractVersion", color: "#fef3c7", fields: ["id: BIGSERIAL PK", "contract_id FK", "version_no", "status", "content_html", "created_by"] },
    { name: "contract_clauses", title: "ContractClause", color: "#ede9fe", fields: ["id: BIGSERIAL PK", "tenant_code", "contract_type", "language", "clause_key", "title", "body", "is_mandatory", "sort_order"] },
    { name: "ai_generation_logs", title: "AiGenerationLog", color: "#fce7f3", fields: ["id: BIGSERIAL PK", "tenant_code", "contract_id FK", "provider", "model", "status", "error_message", "tokens_used"] },
    { name: "gym_generation_logs", title: "GymGenerationLog", color: "#ffe4e6", fields: ["id: BIGSERIAL PK", "tenant_code", "branch_id FK", "operation_type", "entity_type", "entity_id", "file_name", "status", "generated_by"] },
  ],
];

const positions = new Map();
rows.forEach((row, rIdx) => {
  const y = startY + rIdx * rowGap;
  row.forEach((cls, cIdx) => {
    const x = marginX + cIdx * (boxW + gapX);
    positions.set(cls.name, { x, y, w: boxW, h: boxH, title: cls.title, color: cls.color, fields: cls.fields });
  });
});

const esc = (s) => String(s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

function wrapField(text, max = 28) {
  const raw = String(text);
  if (raw.length <= max) return [raw];
  const parts = raw.split(" ");
  const lines = [];
  let current = "";
  for (const part of parts) {
    const next = current ? `${current} ${part}` : part;
    if (next.length <= max) current = next;
    else {
      if (current) lines.push(current);
      current = part;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function boxSvg(cls) {
  const { x, y, w, h, title, color, fields } = positions.get(cls.name);
  const lineHeight = 15;
  const fieldLines = fields.flatMap((f) => wrapField(f, 30));
  const bodyHeight = h - headerH - pad * 2;
  const visibleLines = Math.min(fieldLines.length, Math.floor(bodyHeight / lineHeight));
  const clipped = fieldLines.slice(0, visibleLines);
  const more = fieldLines.length > visibleLines ? `… +${fieldLines.length - visibleLines} lignes` : "";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#fff" stroke="#1f2937" stroke-width="1.4" />
      <rect x="${x}" y="${y}" width="${w}" height="${headerH}" rx="14" fill="${color}" stroke="#1f2937" stroke-width="1.4" />
      <text x="${x + w / 2}" y="${y + 22}" text-anchor="middle" font-family="${font}" font-size="15" font-weight="700" fill="#111827">${esc(title)}</text>
      <text x="${x + 14}" y="${y + headerH + 20}" font-family="${font}" font-size="11.5" fill="#374151">${clipped.map((line, i) => `<tspan x="${x + 14}" dy="${i === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`).join("")}${more ? `<tspan x="${x + 14}" dy="${lineHeight}">${esc(more)}</tspan>` : ""}</text>
    </g>`;
}

function center(name) {
  const b = positions.get(name);
  return { cx: b.x + b.w / 2, cy: b.y + b.h / 2, x: b.x, y: b.y, w: b.w, h: b.h };
}

const relations = [
  ["gym_branches", "gym_members", "1", "1..*"],
  ["gym_branches", "gym_coaches", "1", "1..*"],
  ["gym_branches", "gym_classes", "1", "1..*"],
  ["gym_branches", "gym_attendance", "1", "1..*"],
  ["gym_branches", "gym_cash_transactions", "1", "1..*"],
  ["gym_branches", "gym_access_events", "1", "1..*"],
  ["gym_branches", "gym_notifications", "1", "0..*"],
  ["gym_branches", "gym_files", "1", "0..*"],
  ["gym_branches", "gym_generation_logs", "1", "0..*"],
  ["gym_members", "gym_subscriptions", "1", "1..*"],
  ["gym_members", "gym_attendance", "1", "0..*"],
  ["gym_members", "gym_cash_transactions", "1", "0..*"],
  ["gym_members", "gym_access_events", "1", "0..*"],
  ["gym_members", "contracts", "1", "0..*"],
  ["gym_subscriptions", "gym_contracts", "1", "1"],
  ["gym_subscriptions", "gym_payments", "1", "1..*"],
  ["gym_subscriptions", "hq_validation_queue", "1", "0..1"],
  ["gym_subscriptions", "gym_cash_transactions", "1", "0..*"],
  ["gym_subscriptions", "gym_files", "1", "0..*"],
  ["gym_batch_jobs", "gym_salary_deduction_exports", "1", "1..*"],
  ["gym_batch_jobs", "gym_bank_returns", "1", "0..*"],
  ["gym_payments", "payment_attempts", "1", "0..*"],
  ["gym_payments", "gym_bank_returns", "1", "0..*"],
  ["gym_coaches", "gym_classes", "1", "0..*"],
  ["gym_classes", "gym_attendance", "1", "0..*"],
  ["contract_templates", "contracts", "1", "0..*"],
  ["contract_templates", "contract_clauses", "1", "0..*"],
  ["contracts", "contract_versions", "1", "0..*"],
  ["contracts", "ai_generation_logs", "1", "0..*"],
];

function anchorPoints(aName, bName) {
  const a = center(aName);
  const b = center(bName);
  const sameRow = Math.abs(a.cy - b.cy) < 60;
  let start;
  let end;
  if (sameRow) {
    start = a.cx < b.cx ? { x: a.x + a.w, y: a.cy } : { x: a.x, y: a.cy };
    end = a.cx < b.cx ? { x: b.x, y: b.cy } : { x: b.x + b.w, y: b.cy };
  } else if (a.cy < b.cy) {
    start = { x: a.cx, y: a.y + a.h };
    end = { x: b.cx, y: b.y };
  } else {
    start = { x: a.cx, y: a.y };
    end = { x: b.cx, y: b.y + b.h };
  }
  return { start, end };
}

function lineSvg(rel) {
  const [aName, bName, leftMult, rightMult] = rel;
  const { start, end } = anchorPoints(aName, bName);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const isVertical = Math.abs(start.x - end.x) < 40;
  const path = isVertical
    ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  const labelX = isVertical ? start.x + 8 : midX + 4;
  const labelY = isVertical ? midY : midY - 4;
  return `
    <g>
      <path d="${path}" fill="none" stroke="#475569" stroke-width="1.6" marker-end="url(#arrow)" />
      <text x="${labelX}" y="${labelY}" font-family="${font}" font-size="10.5" fill="#0f172a">${esc(leftMult)}</text>
      <text x="${end.x - 6}" y="${end.y - 6}" text-anchor="end" font-family="${font}" font-size="10.5" fill="#0f172a">${esc(rightMult)}</text>
    </g>`;
}

const title = `
  <g>
    <rect x="40" y="18" width="1960" height="46" rx="12" fill="#0f172a" opacity="0.95" />
    <text x="60" y="48" font-family="${font}" font-size="22" font-weight="700" fill="#ffffff">Gym Management - UML Class Diagram</text>
    <text x="1660" y="48" font-family="${font}" font-size="12.5" fill="#cbd5e1">Core entities extracted from schema and routes</text>
  </g>`;

const legend = `
  <g>
    <text x="40" y="1490" font-family="${font}" font-size="12.5" fill="#334155">PK = primary key, FK = foreign key, UQ = unique constraint. All tenant-scoped entities also carry code_entreprise or tenant_code.</text>
  </g>`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#475569" />
    </marker>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#eef2ff" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)" />
  ${title}
  ${relations.map(lineSvg).join("\n")}
  ${rows.flatMap((row) => row.map(boxSvg)).join("\n")}
  ${legend}
</svg>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, svg, "utf8");
console.log(outPath);
