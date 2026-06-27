const axios = require("axios");

const ACCOUNTING_KEYWORDS = [
  "compta",
  "comptable",
  "comptabil",
  "facture",
  "facturation",
  "achat",
  "vente",
  "livraison",
  "commande",
  "recu",
  "règlement",
  "reglement",
  "paiement",
  "banque",
  "caisse",
  "tva",
  "taxe",
  "ht",
  "ttc",
  "fodec",
  "écriture",
  "ecriture",
  "journal",
  "grand livre",
  "balance",
  "immobilis",
  "charge",
  "produit",
  "tiers",
  "client",
  "fournisseur",
  "anomal",
  "écart",
  "ecart",
  "manquant",
  "incomplet",
  "catégorie",
  "categorie",
  "reconciliation",
  "rapprochement",
];

function isAccountingTopic(text = "", ragContext = []) {
  const haystack = `${text} ${ragContext
    .map((c) => `${c.source || ""} ${c.text || ""}`)
    .join(" ")}`.toLowerCase();
  return ACCOUNTING_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function buildRefusalMessage() {
  return "Je peux aider uniquement sur la comptabilité: factures, achats, livraisons, règlements, TVA, banque, caisse, écritures, catégories comptables, anomalies et champs manquants. Pose-moi une question comptable ou envoie un document à analyser.";
}

function buildSystemPrompt(ragContext = []) {
  const contextBlock = ragContext.length
    ? `\nContexte documentaire prioritaire:\n${ragContext
        .map((c, i) => `${i + 1}. [${c.source}] ${c.text}`)
        .join("\n\n")}`
    : "";

  return (
    "Tu es un assistant comptable spécialisé. Tu réponds uniquement sur la comptabilité et la gestion documentaire comptable.\n" +
    "Périmètre autorisé: factures, achats, ventes, livraisons, commandes, règlements, banque, caisse, TVA, FODEC, immobilisations, charges, produits, rapprochement, saisie, lettrage, écritures et validation de documents.\n" +
    "Tu dois aussi aider à:\n" +
    "- suggérer une catégorie comptable adaptée au contexte d'une transaction ou d'un document;\n" +
    "- détecter les montants inhabituels, incohérences, doublons, dates suspectes et champs manquants/incomplets;\n" +
    "- proposer une action de vérification concrète.\n" +
    "Règles:\n" +
    "- Si la demande n'est pas liée à la comptabilité, refuse poliment et recentre la conversation sur la comptabilité.\n" +
    "- Si le contexte documentaire est fourni, privilégie-le et cite la source quand utile.\n" +
    "- Si des données semblent incomplètes, liste précisément les champs manquants.\n" +
    "- Si une valeur semble anormale, explique brièvement pourquoi elle mérite vérification.\n" +
    "- Réponds en français, de manière concise et opérationnelle.\n" +
    contextBlock
  );
}

async function generateChatReply(messages, ragContext = []) {
  const apiKey = process.env.GROQ_API_KEY;
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  if (!isAccountingTopic(lastUserMessage, ragContext)) {
    return buildRefusalMessage();
  }

  if (!apiKey) {
    const contextHint = ragContext.length
      ? "\n\nJ'ai aussi trouvé des documents liés, mais la génération IA est désactivée tant que la clé Groq n'est pas configurée."
      : "";
    return `Assistant comptable non configuré: ajoute GROQ_API_KEY sur Render pour activer les réponses Groq.${contextHint}\n\nDernière question reçue: ${lastUserMessage}`;
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const apiUrl = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

  const payload = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(ragContext),
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };

  let data;
  try {
    const response = await axios.post(apiUrl, payload, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 30000,
    });
    data = response.data;
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message || "Erreur inconnue";
    const e = new Error(`Erreur Groq: ${detail}`);
    e.status = err.response?.status || 502;
    throw e;
  }

  return data?.choices?.[0]?.message?.content || "Je n'ai pas pu générer une réponse.";
}

module.exports = { generateChatReply, isAccountingTopic, buildRefusalMessage };
