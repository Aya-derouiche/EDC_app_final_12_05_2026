// server/services/aiScan.js
// Groq API — GRATUIT — https://console.groq.com
require("dotenv").config();
const axios = require("axios");

const GROQ_API_URL = process.env.GROQ_API_URL || process.env.GYM_GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

const GROQ_VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

// ── Fetch file from MinIO URL and convert to base64 ─────────────────────────
async function fetchAsBase64(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return {
    base64:   Buffer.from(response.data).toString("base64"),
    mimeType: response.headers["content-type"] || "application/octet-stream",
  };
}

// ── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `Tu es un système OCR expert en comptabilité tunisienne. Ton rôle est d'extraire EXACTEMENT les données visibles dans le document.

RÈGLES ABSOLUES — NE JAMAIS VIOLER :
1. LIS chaque caractère EXACTEMENT tel qu'il apparaît. Ne devine pas, ne corrige pas.
2. NUMÉROS DE DOCUMENT : Copie caractère par caractère. "FR-001" reste "FR-001", jamais "PR-001".
3. DATES : Lis le jour, le mois, l'année exactement. Format YYYY-MM-DD.
   - "29/01/2019" → "2019-01-29"
   - "28/11/2019" → "2019-11-28"
   Lis ATTENTIVEMENT le mois (01=Jan, 02=Fév, ..., 11=Nov, 12=Déc).
4. MONTANTS : Copie le nombre exact affiché.
   - "TVA 19%" sur "1000.000" → tva = 190.000 (le MONTANT en TND, PAS le taux %)
   - "Total HT 1000.000" → montant_ht = 1000.000
   - "TOTAL 1190.600" → montant_total = 1190.600
   Ne mets JAMAIS un taux (0.19, 19) à la place d'un montant (190.000).
5. MATRICULE FISCAL tunisien : format "1234567A/A/M/000" — 7 chiffres/lettre/lettre/lettre/000
6. NOMS : Copie exactement. Vérifie chaque lettre.
7. confidence_score : entre 0 et 1. Mets 0.9+ seulement si tu es certain à 90%+.
8. Réponds UNIQUEMENT avec le JSON. Zéro texte avant ou après. Zéro backtick markdown.`;
}

// ── User prompts per document type ───────────────────────────────────────────
function buildUserPrompt(docType) {
  const schemas = {
    facture: `Extrais TOUTES les données de cette facture tunisienne. Sois ULTRA PRÉCIS sur chaque valeur.

Vérifie particulièrement :
- Le numéro de facture — copie EXACTEMENT
- La date (jour/mois/année) — convertis en YYYY-MM-DD
- Montant HT = total avant taxes
- TVA = le MONTANT en TND (ex: 190.000), PAS le taux (pas 19 ou 0.19)
- FODEC = montant FODEC si présent (1% sur certains produits), sinon 0
- Timbre = 0.600 TND si présent, sinon 0
- Montant total = montant final à payer (HT + TVA + FODEC + Timbre)
- Matricule Fiscal (MF) format tunisien : XXXXXXX/A/A/X/000

JSON à retourner:
{
  "type_document": "facture",
  "num_facture": "COPIE EXACTE DU NUMÉRO",
  "date_facture": "YYYY-MM-DD",
  "fournisseur": {
    "nom": "nom exact du fournisseur/vendeur",
    "mf_cin": "matricule fiscal ou CIN",
    "adresse": "adresse complète",
    "tel": null
  },
  "client": {
    "nom": "nom exact du client",
    "mf_cin": null
  },
  "lignes": [
    {
      "description": "désignation exacte",
      "quantite": 0,
      "prix_unitaire": 0.000,
      "montant_ht": 0.000
    }
  ],
  "montant_ht": 0.000,
  "fodec": 0.000,
  "tva": 0.000,
  "timbre": 0.000,
  "remise": 0.000,
  "montant_total": 0.000,
  "mode_paiement": null,
  "echeance": "YYYY-MM-DD ou null",
  "observations": null,
  "confidence_score": 0.0
}`,

    achat: `Extrais toutes les données de ce document d'achat. Sois ULTRA PRÉCIS.
TVA = montant en TND (pas le taux %). FODEC = montant si présent.

JSON:
{
  "type_document": "achat",
  "type_piece": "type exact (Facture, Avoir, Bon de commande, etc.)",
  "num_piece": "numéro exact",
  "date_piece": "YYYY-MM-DD",
  "fournisseur": { "nom": null, "mf_cin": null, "adresse": null },
  "montant_ht": 0.000,
  "fodec": 0.000,
  "tva": 0.000,
  "timbre": 0.000,
  "autre_montant": 0.000,
  "montant_total": 0.000,
  "observations": null,
  "confidence_score": 0.0
}`,

    livraison: `Extrais toutes les données de ce bon de livraison. Sois ULTRA PRÉCIS sur les numéros et dates.

JSON:
{
  "type_document": "livraison",
  "num_bl": "numéro exact du BL",
  "date_bl": "YYYY-MM-DD",
  "fournisseur": { "nom": null, "mf_cin": null },
  "reference_commande": null,
  "lignes": [{ "description": null, "quantite": 0, "unite": null }],
  "montant_ht": 0.000,
  "tva": 0.000,
  "montant_total": 0.000,
  "observations": null,
  "confidence_score": 0.0
}`,

    commande: `Extrais toutes les données de cette commande. Sois ULTRA PRÉCIS.

JSON:
{
  "type_document": "commande",
  "num_commande": "numéro exact",
  "date_commande": "YYYY-MM-DD",
  "fournisseur": { "nom": null },
  "lignes": [{ "description": null, "quantite": 0, "prix_unitaire": 0.000, "montant_ht": 0.000 }],
  "montant_total": 0.000,
  "date_livraison_prevue": "YYYY-MM-DD ou null",
  "observations": null,
  "confidence_score": 0.0
}`,

    recu: `Extrais toutes les données de ce reçu/quittance. Sois ULTRA PRÉCIS.

JSON:
{
  "type_document": "recu",
  "num_recu": null,
  "date": "YYYY-MM-DD",
  "emetteur": null,
  "beneficiaire": null,
  "montant": 0.000,
  "motif": null,
  "mode_paiement": null,
  "observations": null,
  "confidence_score": 0.0
}`,

    autres: `Extrais toutes les informations disponibles dans ce document.

JSON:
{
  "type_document": "autres",
  "titre": null,
  "date": "YYYY-MM-DD ou null",
  "emetteur": null,
  "destinataire": null,
  "montants": [],
  "informations_cles": [],
  "observations": null,
  "confidence_score": 0.0
}`,
  };

  return schemas[docType] || schemas["facture"];
}

// ── Call Groq API ─────────────────────────────────────────────────────────────
async function callGroq(apiKey, model, base64, mimeType, docType) {
  const isImage = mimeType.startsWith("image/");

  const userContent = isImage
    ? [
        {
          type: "image_url",
          image_url: {
            url:    `data:${mimeType};base64,${base64}`,
            detail: "high",
          },
        },
        { type: "text", text: buildUserPrompt(docType) },
      ]
    : [
        {
          type: "text",
          text: buildUserPrompt(docType) +
            "\n\n(Document PDF — extrais ce que tu peux depuis le contenu textuel. confidence_score max 0.65)",
        },
      ];

  const response = await axios.post(
    GROQ_API_URL,
    {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user",   content: userContent },
      ],
      temperature:  0.0,
      max_tokens:   3000,
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      timeout: 90000,
    }
  );

  return response;
}

// ── Parse AI response safely ──────────────────────────────────────────────────
function parseAIResponse(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error("Réponse vide de l'IA");
  }

  // Remove markdown code blocks if present
  let cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`JSON invalide reçu: ${cleaned.slice(0, 200)}`);
  }
}

// ── Main scan function ────────────────────────────────────────────────────────
// Can accept either a URL (string) or a Buffer directly
function emptyExtraction(docType) {
  const type = String(docType || "facture").toLowerCase();
  const common = { confidence_score: 0 };

  if (type === "achat") {
    return {
      ...common,
      type_document: "achat",
      type_piece: "",
      num_piece: "",
      date_piece: "",
      fournisseur: { nom: null, mf_cin: null, adresse: null },
      montant_ht: 0,
      fodec: 0,
      tva: 0,
      timbre: 0,
      autre_montant: 0,
      montant_total: 0,
      observations: null,
    };
  }

  if (type === "livraison") {
    return {
      ...common,
      type_document: "livraison",
      num_bl: "",
      date_bl: "",
      fournisseur: { nom: null, mf_cin: null },
      reference_commande: null,
      lignes: [],
      montant_ht: 0,
      tva: 0,
      montant_total: 0,
      observations: null,
    };
  }

  if (type === "commande") {
    return {
      ...common,
      type_document: "commande",
      num_commande: "",
      date_commande: "",
      fournisseur: { nom: null },
      lignes: [],
      montant_total: 0,
      date_livraison_prevue: null,
      observations: null,
    };
  }

  return {
    ...common,
    type_document: "facture",
    num_facture: "",
    date_facture: "",
    fournisseur: { nom: null, mf_cin: null, adresse: null, tel: null },
    client: { nom: null, mf_cin: null },
    lignes: [],
    montant_ht: 0,
    fodec: 0,
    tva: 0,
    timbre: 0,
    remise: 0,
    montant_total: 0,
    mode_paiement: null,
    echeance: null,
    observations: null,
  };
}

async function scanDocument(fileUrlOrBuffer, mimeType, docType = "facture") {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.GYM_GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY manquante dans .env ! Obtenez votre clé gratuite sur https://console.groq.com"
      );
    }

    // Excel/CSV: AI cannot process binary spreadsheets directly
    if (
      mimeType.includes("excel") ||
      mimeType.includes("spreadsheetml") ||
      mimeType === "text/csv"
    ) {
      return {
        success: false,
        error:   "Excel/CSV: remplissage manuel requis — l'IA ne peut pas lire les feuilles de calcul binaires.",
        extractedData: emptyExtraction(docType),
        confidence_score: 0,
      };
    }

    // Get file as base64
    let base64, fileMime;
    if (Buffer.isBuffer(fileUrlOrBuffer)) {
      // Direct buffer (from multer memoryStorage)
      base64   = fileUrlOrBuffer.toString("base64");
      fileMime = mimeType;
    } else {
      // URL — fetch from MinIO or any URL
      const fetched = await fetchAsBase64(fileUrlOrBuffer);
      base64   = fetched.base64;
      fileMime = fetched.mimeType;
    }

    // Normalize image MIME type (Groq only accepts specific image types)
    const allowedImages = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (fileMime.startsWith("image/") && !allowedImages.includes(fileMime)) {
      fileMime = "image/jpeg"; // fallback
    }

    if (!fileMime.startsWith("image/")) {
      return {
        success: false,
        error: "OCR IA disponible pour les images JPG/PNG/WebP/GIF. Pour PDF/Excel/CSV, le fichier est importe et la saisie reste manuelle.",
        extractedData: emptyExtraction(docType),
        confidence_score: 0,
      };
    }

    let lastError = "";
    const configuredModel = process.env.GROQ_MODEL || process.env.GYM_GROQ_MODEL;
    const models = configuredModel
      ? [configuredModel, ...GROQ_VISION_MODELS.filter((m) => m !== configuredModel)]
      : GROQ_VISION_MODELS;

    // Try each model in order (fallback on quota/rate limit)
    for (const model of models) {
      try {
        console.log(`[AI Scan] Trying model: ${model}`);

        const response = await callGroq(apiKey, model, base64, fileMime, docType);
        const rawText  = response.data?.choices?.[0]?.message?.content || "";

        if (!rawText.trim()) {
          lastError = `Réponse vide du modèle ${model}`;
          continue;
        }

        const extractedData = parseAIResponse(rawText);

        console.log(`[AI Scan] ✅ Succès avec: ${model}`);
        console.log(`[AI Scan] Type détecté: ${extractedData.type_document}, Confiance: ${extractedData.confidence_score}`);

        return {
          success:          true,
          extractedData,
          confidence_score: extractedData.confidence_score ?? 0,
          model_used:       model,
          doc_type_detected: extractedData.type_document,
        };

      } catch (modelErr) {
        const errMsg = modelErr.response?.data?.error?.message || modelErr.message;
        console.warn(`[AI Scan] ❌ ${model} échoué: ${errMsg}`);
        lastError = errMsg;

        // Only retry on rate limit / quota errors
        const isRetryable =
          errMsg.includes("quota") ||
          errMsg.includes("429") ||
          errMsg.includes("rate_limit") ||
          errMsg.includes("overloaded");

        if (!isRetryable) break;

        // Wait before retrying
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    throw new Error(`Tous les modèles ont échoué. Dernière erreur: ${lastError}`);

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error("[AI Scan] Erreur finale:", errorMsg);
    return {
      success:          false,
      error:            errorMsg,
      extractedData:    emptyExtraction(docType),
      confidence_score: 0,
    };
  }
}

module.exports = { scanDocument };
