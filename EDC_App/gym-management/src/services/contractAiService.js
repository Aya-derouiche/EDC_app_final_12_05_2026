const config = require("../config");

const CONTRACT_TYPES = {
  gym_membership: "Gym Membership Contract",
  salary_deduction_authorization: "Salary Deduction Authorization",
  personal_training: "Personal Training Agreement",
  corporate_membership: "Corporate Membership Contract",
  spa_membership: "Spa Membership Contract",
  coach_employment: "Coach Employment Agreement",
  custom: "Custom Contract",
};

const LANGUAGE_LABELS = {
  fr: "French",
  en: "English",
  ar: "Arabic",
};

const BASE_CLAUSES = {
  payment: {
    fr: "Le membre s'engage a regler les montants dus selon le mode de paiement convenu. Tout retard peut entrainer une suspension temporaire de l'acces.",
    en: "The member agrees to pay all amounts due according to the agreed payment method. Late payment may result in temporary access suspension.",
    ar: "يلتزم العضو بسداد المبالغ المستحقة وفق طريقة الدفع المتفق عليها، وقد يؤدي التأخير إلى تعليق مؤقت للدخول.",
  },
  cancellation: {
    fr: "Toute resiliation doit etre notifiee par ecrit. Les sommes deja dues restent exigibles jusqu'a la date effective de resiliation.",
    en: "Any cancellation must be notified in writing. Amounts already due remain payable until the effective cancellation date.",
    ar: "يجب إشعار الإلغاء كتابيا، وتبقى المبالغ المستحقة واجبة الدفع إلى تاريخ الإلغاء الفعلي.",
  },
  data_privacy: {
    fr: "Les donnees personnelles sont traitees uniquement pour la gestion de l'abonnement, des paiements et des acces.",
    en: "Personal data is processed only for membership, payment and access management purposes.",
    ar: "تتم معالجة البيانات الشخصية فقط لأغراض إدارة الاشتراك والدفع والدخول.",
  },
  safety: {
    fr: "Le membre declare etre apte a pratiquer une activite sportive et s'engage a respecter les consignes de securite de la salle.",
    en: "The member confirms fitness to exercise and agrees to follow all gym safety instructions.",
    ar: "يقر العضو بقدرته على ممارسة النشاط الرياضي ويلتزم باحترام تعليمات السلامة داخل النادي.",
  },
  salary_deduction: {
    fr: "Le membre autorise le prelevement sur salaire du montant mensuel indique, selon les procedures de validation du siege.",
    en: "The member authorizes salary deduction for the monthly amount stated, according to HQ validation procedures.",
    ar: "يفوض العضو اقتطاع المبلغ الشهري المحدد من الراتب وفق إجراءات اعتماد الإدارة المركزية.",
  },
};

function normalizeLanguage(language) {
  return ["fr", "en", "ar"].includes(language) ? language : "fr";
}

function normalizeType(type) {
  return CONTRACT_TYPES[type] ? type : "gym_membership";
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function contextValueMap(context) {
  const member = context.member || {};
  const subscription = context.subscription || {};
  const branch = context.branch || {};
  const duration = context.duration || {};
  return {
    "member.full_name": member.full_name || "",
    "member.name": member.full_name || "",
    "member.member_code": member.member_code || "",
    "member.employee_id": member.employee_id || "",
    "member.cin": member.cin || "",
    "member.phone": member.phone || "",
    "member.email": member.email || "",
    "member.bank_account": member.bank_account || "",
    "subscription.plan_name": subscription.plan_name || "",
    "subscription.amount": subscription.amount || "",
    "subscription.payment_method": subscription.payment_method || context.payment_method || "",
    "subscription.start_date": formatDate(subscription.start_date || duration.start_date),
    "subscription.duration.start_date": formatDate(subscription.start_date || duration.start_date),
    "subscription.end_date": formatDate(subscription.end_date || duration.end_date),
    "subscription.duration.end_date": formatDate(subscription.end_date || duration.end_date),
    "branch.branch_name": branch.branch_name || "",
    "branch.name": branch.branch_name || "",
    "branch.city": branch.city || "",
  };
}

function replacePlaceholders(html, context) {
  const values = contextValueMap(context);
  let out = String(html || "");
  for (const [key, value] of Object.entries(values)) {
    const escaped = htmlEscape(value || "-");
    out = out
      .replaceAll(`{{${key}}}`, escaped)
      .replaceAll(`{${key}}`, escaped);
  }
  return out;
}

function identityLabels(language) {
  if (language === "ar") {
    return {
      title: "بيانات العقد",
      member: "اسم العميل",
      code: "رمز العضو",
      branch: "الفرع",
      plan: "نوع الاشتراك",
      amount: "المبلغ الشهري",
      payment: "طريقة الدفع",
      start: "تاريخ البداية",
      end: "تاريخ النهاية",
    };
  }
  if (language === "en") {
    return {
      title: "Contract Information",
      member: "Client name",
      code: "Member code",
      branch: "Branch",
      plan: "Subscription plan",
      amount: "Monthly amount",
      payment: "Payment method",
      start: "Start date",
      end: "End date",
    };
  }
  return {
    title: "Informations du contrat",
    member: "Nom du client",
    code: "Code membre",
    branch: "Salle / branche",
    plan: "Plan d'abonnement",
    amount: "Montant mensuel",
    payment: "Mode de paiement",
    start: "Date de debut",
    end: "Date de fin",
  };
}

function buildIdentityBlock(context, language) {
  const labels = identityLabels(language);
  const values = contextValueMap(context);
  const rows = [
    [labels.member, values["member.full_name"]],
    [labels.code, values["member.member_code"]],
    [labels.branch, values["branch.branch_name"]],
    [labels.plan, values["subscription.plan_name"]],
    [labels.amount, values["subscription.amount"] ? `${values["subscription.amount"]} ${context.currency || "DT"}` : ""],
    [labels.payment, values["subscription.payment_method"]],
    [labels.start, values["subscription.start_date"]],
    [labels.end, values["subscription.end_date"]],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  return `
    <section data-contract-context="true" dir="${language === "ar" ? "rtl" : "ltr"}">
      <h2>${htmlEscape(labels.title)}</h2>
      <table>${rows.map(([label, value]) => `<tr><th>${htmlEscape(label)}</th><td>${htmlEscape(value)}</td></tr>`).join("")}</table>
    </section>
  `;
}

function ensureIdentityBlock(html, context, language) {
  const replaced = replacePlaceholders(html, context);
  const memberName = context.member?.full_name;
  const alreadyHasMember = memberName && replaced.includes(memberName);
  if (alreadyHasMember && replaced.includes('data-contract-context="true"')) return replaced;
  const block = buildIdentityBlock(context, language);
  if (/<\/h1>/i.test(replaced)) return replaced.replace(/<\/h1>/i, `</h1>${block}`);
  return `${block}${replaced}`;
}

function requiredFieldsFor(type) {
  const common = ["member.full_name", "subscription.plan_name", "subscription.amount", "branch.branch_name", "subscription.start_date"];
  if (type === "salary_deduction_authorization") return [...common, "member.employee_id", "member.bank_account"];
  if (type === "coach_employment") return ["coach.full_name", "branch.branch_name"];
  if (type === "corporate_membership") return [...common, "member.employee_id"];
  return common;
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function detectMissing(context, type) {
  return requiredFieldsFor(type)
    .filter((field) => {
      const value = getPath(context, field);
      return value === undefined || value === null || String(value).trim() === "";
    })
    .map((field) => ({
      field,
      severity: "warning",
      message: `Mandatory information missing: ${field}`,
    }));
}

function clauseRecommendations(type, language, dbClauses = []) {
  const lang = normalizeLanguage(language);
  const keys = ["payment", "cancellation", "data_privacy", "safety"];
  if (type === "salary_deduction_authorization") keys.unshift("salary_deduction");
  if (type === "personal_training") keys.push("safety");

  const generated = keys.map((key, index) => ({
    clause_key: key,
    title: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    body: BASE_CLAUSES[key]?.[lang] || BASE_CLAUSES[key]?.fr || "",
    category: key === "payment" || key === "salary_deduction" ? "payment" : "legal",
    is_mandatory: ["payment", "data_privacy"].includes(key),
    sort_order: index + 1,
  }));

  const merged = [...dbClauses, ...generated];
  const seen = new Set();
  return merged.filter((clause) => {
    const key = clause.clause_key || clause.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function localTitle(type, language) {
  const name = CONTRACT_TYPES[type] || CONTRACT_TYPES.gym_membership;
  if (language === "fr") return `Contrat - ${name}`;
  if (language === "ar") return `عقد - ${name}`;
  return name;
}

function buildLocalContract({ type, language, context, clauses, customInstructions }) {
  const lang = normalizeLanguage(language);
  const member = context.member || {};
  const subscription = context.subscription || {};
  const branch = context.branch || {};
  const title = localTitle(type, lang);
  const duration = context.duration || {};

  const intro = {
    fr: `Ce contrat est conclu entre ${branch.branch_name || "la salle"} et ${member.full_name || "le membre"}.`,
    en: `This agreement is entered into between ${branch.branch_name || "the gym branch"} and ${member.full_name || "the member"}.`,
    ar: `يبرم هذا العقد بين ${branch.branch_name || "النادي"} و ${member.full_name || "العضو"}.`,
  }[lang];

  const details = [
    ["Member", member.full_name],
    ["Member code", member.member_code],
    ["Branch", branch.branch_name],
    ["Plan", subscription.plan_name],
    ["Amount", subscription.amount ? `${subscription.amount} ${context.currency || "DT"}` : ""],
    ["Payment method", subscription.payment_method],
    ["Start date", subscription.start_date],
    ["End date", subscription.end_date || duration.end_date],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  const html = `
    <h1>${title}</h1>
    ${buildIdentityBlock(context, lang)}
    <p>${intro}</p>
    <h2>Contract Data</h2>
    <table>${details.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>
    <h2>Clauses</h2>
    ${clauses.map((clause) => `<h3>${clause.title}</h3><p>${clause.body}</p>`).join("")}
    ${customInstructions ? `<h2>Specific Instructions</h2><p>${customInstructions}</p>` : ""}
    <h2>Signatures</h2>
    <p>Gym representative: ____________________ Date: ____/____/________</p>
    <p>Member / employee: ____________________ Date: ____/____/________</p>
  `;

  return {
    title,
    content_html: html,
    content_text: stripHtml(html),
    suggestions: clauses.map((clause) => ({
      type: clause.category || "legal",
      title: clause.title,
      text: clause.body,
    })),
  };
}

function buildPrompt({ type, language, context, clauses, customInstructions }) {
  return [
    `Generate a professional ERP-ready gym contract.`,
    `Contract type: ${CONTRACT_TYPES[type] || type}.`,
    `Language: ${LANGUAGE_LABELS[language] || "French"}.`,
    `Return strict JSON only with keys: title, content_html, suggestions, warnings.`,
    `Use HTML tags h1, h2, h3, p, table, tr, th, td, ul, li. Do not include CSS.`,
    `Include legal, payment, access, cancellation, data privacy and signature sections when relevant.`,
    `Context JSON: ${JSON.stringify(context)}`,
    `Recommended clauses JSON: ${JSON.stringify(clauses)}`,
    customInstructions ? `User instructions: ${customInstructions}` : "",
  ].filter(Boolean).join("\n");
}

function parseJsonResponse(raw) {
  const cleaned = String(raw || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response was not valid JSON.");
    return JSON.parse(match[0]);
  }
}

async function callGroq(payload) {
  if (!config.ai.groqApiKey) return null;

  const response = await fetch(config.ai.groqUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.ai.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ai.groqModel,
      temperature: 0.2,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: "You are an AI contract assistant for a gym ERP. Generate practical contract drafts, detect missing data, and return JSON only.",
        },
        { role: "user", content: buildPrompt(payload) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Groq generation failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const json = await response.json();
  const raw = json?.choices?.[0]?.message?.content || "";
  return { raw, parsed: parseJsonResponse(raw), usage: json?.usage || null };
}

async function generateContractDraft(payload) {
  const type = normalizeType(payload.type);
  const language = normalizeLanguage(payload.language);
  const clauses = clauseRecommendations(type, language, payload.dbClauses || []);
  const context = payload.context || {};
  const warnings = detectMissing(context, type);

  try {
    const ai = await callGroq({ ...payload, type, language, clauses, context });
    if (ai?.parsed) {
      return {
        provider: "groq",
        model: config.ai.groqModel,
        title: ai.parsed.title || localTitle(type, language),
        content_html: ensureIdentityBlock(ai.parsed.content_html || ai.parsed.content || "", context, language),
        content_text: stripHtml(ensureIdentityBlock(ai.parsed.content_html || ai.parsed.content || "", context, language)),
        suggestions: Array.isArray(ai.parsed.suggestions) ? ai.parsed.suggestions : [],
        warnings: [...warnings, ...(Array.isArray(ai.parsed.warnings) ? ai.parsed.warnings : [])],
        clauses,
        raw_response: ai.raw,
        usage: ai.usage,
      };
    }
  } catch (error) {
    const fallback = buildLocalContract({ ...payload, type, language, clauses, context });
    return {
      provider: "local_fallback",
      model: "deterministic-contract-assistant",
      ...fallback,
      warnings: [...warnings, { severity: "info", message: error.message }],
      clauses,
      raw_response: null,
      usage: null,
    };
  }

  const fallback = buildLocalContract({ ...payload, type, language, clauses, context });
  return {
    provider: "local_fallback",
    model: "deterministic-contract-assistant",
    ...fallback,
    warnings,
    clauses,
    raw_response: null,
    usage: null,
  };
}

module.exports = {
  CONTRACT_TYPES,
  clauseRecommendations,
  detectMissing,
  generateContractDraft,
  ensureIdentityBlock,
  normalizeLanguage,
  normalizeType,
  stripHtml,
};
