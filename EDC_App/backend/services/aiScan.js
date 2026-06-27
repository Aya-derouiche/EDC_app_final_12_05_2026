require("dotenv").config();
const axios = require("axios");
const zlib = require("zlib");

const GROQ_API_URL =
  process.env.GROQ_API_URL ||
  process.env.GYM_GROQ_API_URL ||
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

async function fetchAsBase64(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return {
    base64: Buffer.from(response.data).toString("base64"),
    buffer: Buffer.from(response.data),
    mimeType: response.headers["content-type"] || "application/octet-stream",
  };
}

function buildSystemPrompt() {
  return `Tu es un systeme OCR expert en comptabilite tunisienne. Ton role est d'extraire exactement les donnees visibles dans le document.

REGLES ABSOLUES:
1. Lis chaque caractere exactement tel qu'il apparait.
2. Ne devine pas, ne corrige pas.
3. Dates au format YYYY-MM-DD.
4. Les montants doivent etre des montants, jamais des pourcentages.
5. Reponds uniquement avec du JSON valide.`;
}

function buildUserPrompt(docType) {
  const schemas = {
    facture: `Extrais les donnees de cette facture.
JSON attendu:
{
  "type_document": "facture",
  "num_facture": "",
  "date_facture": "",
  "fournisseur": { "nom": "", "mf_cin": "", "adresse": "", "tel": null },
  "client": { "nom": "", "mf_cin": null },
  "lignes": [],
  "montant_ht": 0,
  "fodec": 0,
  "tva": 0,
  "timbre": 0,
  "remise": 0,
  "montant_total": 0,
  "mode_paiement": null,
  "echeance": null,
  "observations": null,
  "confidence_score": 0
}`,
    achat: `Extrais les donnees de ce document d'achat.
JSON attendu:
{
  "type_document": "achat",
  "type_piece": "",
  "num_piece": "",
  "date_piece": "",
  "fournisseur": { "nom": null, "mf_cin": null, "adresse": null },
  "montant_ht": 0,
  "fodec": 0,
  "tva": 0,
  "timbre": 0,
  "autre_montant": 0,
  "montant_total": 0,
  "observations": null,
  "confidence_score": 0
}`,
    livraison: `Extrais les donnees de ce bon de livraison.
JSON attendu:
{
  "type_document": "livraison",
  "num_bl": "",
  "date_bl": "",
  "lieu_bl": "",
  "reference_commande": null,
  "numero_client": null,
  "contact_client": null,
  "emis_par": null,
  "tiers_saisie": null,
  "fournisseur": { "nom": null, "mf_cin": null, "adresse": null, "tel": null },
  "fournisseur_nom": null,
  "fournisseur_adresse": null,
  "fournisseur_tel": null,
  "destinataire": { "nom": null, "adresse": null, "ville": null, "pays": null },
  "destinataire_nom": null,
  "destinataire_adresse": null,
  "destinataire_ville": null,
  "destinataire_pays": null,
  "lignes": [],
  "montant_ht_bl": 0,
  "tva_bl": 0,
  "montant_total_bl": 0,
  "observations": null,
  "confidence_score": 0
}`,
    commande: `Extrais les donnees de cette commande.
JSON attendu:
{
  "type_document": "commande",
  "num_commande": "",
  "date_commande": "",
  "fournisseur": { "nom": null },
  "lignes": [],
  "montant_total": 0,
  "date_livraison_prevue": null,
  "observations": null,
  "confidence_score": 0
}`,
    recu: `Extrais les donnees de ce recu.
JSON attendu:
{
  "type_document": "recu",
  "num_recu": null,
  "date": "",
  "emetteur": null,
  "beneficiaire": null,
  "montant": 0,
  "motif": null,
  "mode_paiement": null,
  "observations": null,
  "confidence_score": 0
}`,
    autres: `Extrais les informations de ce document.
JSON attendu:
{
  "type_document": "autres",
  "titre": null,
  "date": null,
  "emetteur": null,
  "destinataire": null,
  "montants": [],
  "informations_cles": [],
  "observations": null,
  "confidence_score": 0
}`,
  };

  return schemas[docType] || schemas.facture;
}

function parseAIResponse(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error("Reponse vide de l'IA");
  }

  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`JSON invalide recu: ${cleaned.slice(0, 200)}`);
  }
}

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
      lieu_bl: "",
      reference_commande: null,
      numero_client: null,
      contact_client: null,
      emis_par: null,
      tiers_saisie: null,
      fournisseur: { nom: null, mf_cin: null, adresse: null, tel: null },
      fournisseur_nom: null,
      fournisseur_adresse: null,
      fournisseur_tel: null,
      destinataire: { nom: null, adresse: null, ville: null, pays: null },
      destinataire_nom: null,
      destinataire_adresse: null,
      destinataire_ville: null,
      destinataire_pays: null,
      lignes: [],
      montant_ht_bl: 0,
      tva_bl: 0,
      montant_total_bl: 0,
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

  if (type === "recu") {
    return {
      ...common,
      type_document: "recu",
      num_recu: null,
      date: "",
      emetteur: null,
      beneficiaire: null,
      montant: 0,
      motif: null,
      mode_paiement: null,
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

function asText(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value)
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,/g, ".");

  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateIso(value) {
  const text = asText(value);
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${day.padStart(2, "0")}-${month.padStart(2, "0")}`;
  }

  return text;
}

function normalizeDeliveryExtraction(extractedData = {}) {
  const fournisseur = extractedData.fournisseur || {};
  const destinataire = extractedData.destinataire || extractedData.client || {};

  const normalized = {
    ...extractedData,
    type_document: "livraison",
  };

  normalized.date_bl = toDateIso(
    asText(
      extractedData.date_bl,
      extractedData.date,
      extractedData.date_livraison,
      extractedData.date_bon_livraison
    )
  );
  normalized.num_bl = asText(
    extractedData.num_bl,
    extractedData.numero_bl,
    extractedData.numero,
    extractedData.reference_bl
  );
  normalized.lieu_bl = asText(
    extractedData.lieu_bl,
    extractedData.lieu,
    extractedData.ville,
    destinataire.ville
  );
  normalized.reference_commande = asText(
    extractedData.reference_commande,
    extractedData.num_commande,
    extractedData.reference_commande_bl
  );
  normalized.numero_client = asText(
    extractedData.numero_client,
    extractedData.client_numero,
    extractedData.code_client,
    extractedData.code_tiers
  );
  normalized.contact_client = asText(
    extractedData.contact_client,
    extractedData.client_contact,
    destinataire.contact,
    destinataire.nom_contact
  );
  normalized.emis_par = asText(
    extractedData.emis_par,
    extractedData.livre_par,
    extractedData.etabli_par,
    extractedData.expediteur,
    fournisseur.nom
  );
  normalized.tiers_saisie = asText(
    extractedData.tiers_saisie,
    extractedData.fournisseur_nom,
    fournisseur.nom,
    destinataire.nom
  );

  normalized.fournisseur = {
    nom: asText(fournisseur.nom, extractedData.fournisseur_nom) || null,
    mf_cin: asText(fournisseur.mf_cin, extractedData.fournisseur_mf_cin) || null,
    adresse: asText(fournisseur.adresse, extractedData.fournisseur_adresse) || null,
    tel: asText(fournisseur.tel, extractedData.fournisseur_tel) || null,
  };
  normalized.fournisseur_nom = normalized.fournisseur.nom;
  normalized.fournisseur_adresse = normalized.fournisseur.adresse;
  normalized.fournisseur_tel = normalized.fournisseur.tel;

  normalized.destinataire = {
    nom: asText(destinataire.nom, extractedData.destinataire_nom) || null,
    adresse: asText(destinataire.adresse, extractedData.destinataire_adresse) || null,
    ville: asText(destinataire.ville, extractedData.destinataire_ville) || null,
    pays: asText(destinataire.pays, extractedData.destinataire_pays) || null,
  };
  normalized.destinataire_nom = normalized.destinataire.nom;
  normalized.destinataire_adresse = normalized.destinataire.adresse;
  normalized.destinataire_ville = normalized.destinataire.ville;
  normalized.destinataire_pays = normalized.destinataire.pays;

  normalized.lignes = Array.isArray(extractedData.lignes) ? extractedData.lignes : [];
  normalized.montant_ht_bl = toNumber(
    extractedData.montant_ht_bl ?? extractedData.montant_ht ?? extractedData.total_ht
  );
  normalized.montant_ht = normalized.montant_ht_bl;
  normalized.tva_bl = toNumber(
    extractedData.tva_bl ?? extractedData.tva ?? extractedData.taxe_tva
  );
  normalized.tva = normalized.tva_bl;
  normalized.montant_total_bl = toNumber(
    extractedData.montant_total_bl ?? extractedData.montant_total ?? extractedData.total_ttc
  );
  normalized.montant_total = normalized.montant_total_bl;
  normalized.date = normalized.date_bl || null;
  normalized.observations = asText(
    extractedData.observations,
    extractedData.informations_additionnelles,
    extractedData.notes
  ) || null;
  normalized.confidence_score = Number.isFinite(Number(extractedData.confidence_score))
    ? Number(extractedData.confidence_score)
    : 0;

  return normalized;
}

function normalizeConfidenceScore(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 0.75;
}

function unescapePdfString(value) {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }

    const next = value[i + 1];
    if (next === undefined) break;
    if (next === "n") { out += "\n"; i += 1; continue; }
    if (next === "r") { out += "\r"; i += 1; continue; }
    if (next === "t") { out += "\t"; i += 1; continue; }
    if (next === "b") { out += "\b"; i += 1; continue; }
    if (next === "f") { out += "\f"; i += 1; continue; }
    if (next === "(" || next === ")" || next === "\\") { out += next; i += 1; continue; }
    if (/\d/.test(next)) {
      const octal = value.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0];
      if (octal) {
        out += String.fromCharCode(parseInt(octal, 8));
        i += octal.length;
        continue;
      }
    }
    if (next === "\n") { i += 1; continue; }
    if (next === "\r") { i += value[i + 2] === "\n" ? 2 : 1; continue; }
    out += next;
    i += 1;
  }
  return out;
}

function extractPdfText(buffer) {
  const latin1 = buffer.toString("latin1");
  const out = [];
  let cursor = 0;

  while (cursor < buffer.length) {
    const streamIndex = latin1.indexOf("stream", cursor);
    if (streamIndex === -1) break;

    const afterStream = latin1.indexOf("\n", streamIndex);
    const start = afterStream === -1
      ? -1
      : (latin1[streamIndex + 6] === "\r" ? streamIndex + 7 : afterStream + 1);
    const end = start === -1 ? -1 : latin1.indexOf("endstream", start);
    if (start === -1 || end === -1) {
      cursor = streamIndex + 6;
      continue;
    }

    const context = latin1.slice(Math.max(0, streamIndex - 180), streamIndex + 40);
    const rawStream = buffer.slice(start, end);

    const candidates = [];
    try {
      if (context.includes("/FlateDecode")) {
        candidates.push(zlib.inflateSync(rawStream).toString("latin1"));
      }
    } catch (_err) {}
    candidates.push(rawStream.toString("latin1"));

    for (const candidate of candidates) {
      const literalMatches = candidate.match(/\((?:\\.|[^\\)])*\)\s*T[Jj]/g) || [];
      for (const match of literalMatches) {
        const literal = match.match(/\(((?:\\.|[^\\)])*)\)/)?.[1];
        if (literal) out.push(unescapePdfString(literal));
      }

      const arrayMatches = candidate.match(/\[(?:[\s\S]*?)\]\s*TJ/g) || [];
      for (const match of arrayMatches) {
        const literals = [...match.matchAll(/\(((?:\\.|[^\\)])*)\)/g)];
        for (const literalMatch of literals) {
          out.push(unescapePdfString(literalMatch[1]));
        }

        const hexStrings = [...match.matchAll(/<([0-9A-Fa-f\s]+)>/g)];
        for (const hexMatch of hexStrings) {
          const raw = hexMatch[1].replace(/\s+/g, "");
          if (raw.length >= 2 && raw.length % 2 === 0) {
            try {
              out.push(Buffer.from(raw, "hex").toString("latin1"));
            } catch (_err) {}
          }
        }
      }
    }

    cursor = end + 9;
  }

  const fallback = latin1
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const joined = out.join("\n").trim();
  if (joined.length < 50 && fallback.length > 50) {
    return fallback;
  }

  return joined;
}

async function callGroqImage(apiKey, model, base64, mimeType, docType) {
  return axios.post(
    GROQ_API_URL,
    {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
            { type: "text", text: buildUserPrompt(docType) },
          ],
        },
      ],
      temperature: 0.0,
      max_tokens: 3000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 90000,
    }
  );
}

async function callGroqText(apiKey, model, documentText, docType) {
  return axios.post(
    GROQ_API_URL,
    {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content:
            `${buildUserPrompt(docType)}\n\n` +
            `Le texte ci-dessous provient d'un PDF texte. Extrais uniquement les donnees visibles et renvoie du JSON valide.\n\n` +
            `TEXTE OCR:\n${String(documentText || "").slice(0, 16000)}`,
        },
      ],
      temperature: 0.0,
      max_tokens: 3000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 90000,
    }
  );
}

async function scanDocument(fileUrlOrBuffer, mimeType, docType = "facture") {
  try {
    const apiKey = process.env.GROQ_API_KEY || process.env.GYM_GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY manquante dans .env");
    }

    const normalizedMime = String(mimeType || "").toLowerCase();
    if (
      normalizedMime.includes("excel") ||
      normalizedMime.includes("spreadsheetml") ||
      normalizedMime === "text/csv"
    ) {
      return {
        success: false,
        error:
          "Excel/CSV: remplissage manuel requis - l'IA ne peut pas lire les feuilles de calcul binaires.",
        extractedData: emptyExtraction(docType),
        confidence_score: 0,
      };
    }

    const isPdf = normalizedMime.includes("pdf");
    const isImage = normalizedMime.startsWith("image/");

    let buffer = null;
    let base64 = "";
    let fileMime = normalizedMime || "application/octet-stream";

    if (Buffer.isBuffer(fileUrlOrBuffer)) {
      buffer = fileUrlOrBuffer;
      base64 = fileUrlOrBuffer.toString("base64");
    } else {
      const fetched = await fetchAsBase64(fileUrlOrBuffer);
      buffer = fetched.buffer;
      base64 = fetched.base64;
      fileMime = String(fetched.mimeType || fileMime).toLowerCase();
    }

    const configuredModel = process.env.GROQ_MODEL || process.env.GYM_GROQ_MODEL;
    const models = configuredModel
      ? [configuredModel, ...GROQ_VISION_MODELS.filter((m) => m !== configuredModel)]
      : GROQ_VISION_MODELS;

    if (isPdf) {
      const pdfText = buffer ? extractPdfText(buffer) : "";
      if (!pdfText.trim()) {
        return {
          success: false,
          error:
            "PDF detecte, mais aucun texte exploitable n'a pu etre extrait. Si le document est un scan image, une conversion OCR serveur est necessaire.",
          extractedData: emptyExtraction(docType),
          confidence_score: 0,
        };
      }

      let lastError = "";
      for (const model of models) {
        try {
          console.log(`[AI Scan] Trying model on PDF text: ${model}`);
          const response = await callGroqText(apiKey, model, pdfText, docType);
          const rawText = response.data?.choices?.[0]?.message?.content || "";
          if (!rawText.trim()) {
            lastError = `Reponse vide du modele ${model}`;
            continue;
          }

          const extractedData = parseAIResponse(rawText);
          const normalizedExtraction =
            docType === "livraison"
              ? normalizeDeliveryExtraction(extractedData)
              : extractedData;
          return {
            success: true,
            extractedData: normalizedExtraction,
            confidence_score: normalizeConfidenceScore(
              normalizedExtraction.confidence_score ?? extractedData.confidence_score
            ),
            model_used: model,
            doc_type_detected: normalizedExtraction.type_document,
            rawText: pdfText,
          };
        } catch (modelErr) {
          const errMsg = modelErr.response?.data?.error?.message || modelErr.message;
          lastError = errMsg;
          const retryable =
            errMsg.includes("quota") ||
            errMsg.includes("429") ||
            errMsg.includes("rate_limit") ||
            errMsg.includes("overloaded");
          if (!retryable) break;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      throw new Error(`Tous les modeles PDF ont echoue. Derniere erreur: ${lastError}`);
    }

    if (!isImage) {
      return {
        success: false,
        error:
          "OCR IA disponible pour les images JPG/PNG/WebP/GIF. Pour les PDF, un texte exploitable doit etre present ou une conversion OCR serveur est necessaire.",
        extractedData: emptyExtraction(docType),
        confidence_score: 0,
      };
    }

    const allowedImages = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedImages.includes(fileMime)) {
      fileMime = "image/jpeg";
    }

    let lastError = "";
    for (const model of models) {
      try {
        console.log(`[AI Scan] Trying model: ${model}`);
        const response = await callGroqImage(apiKey, model, base64, fileMime, docType);
        const rawText = response.data?.choices?.[0]?.message?.content || "";
        if (!rawText.trim()) {
          lastError = `Reponse vide du modele ${model}`;
          continue;
        }

        const extractedData = parseAIResponse(rawText);
        const normalizedExtraction =
          docType === "livraison"
            ? normalizeDeliveryExtraction(extractedData)
            : extractedData;
        return {
          success: true,
          extractedData: normalizedExtraction,
          confidence_score: normalizeConfidenceScore(
            normalizedExtraction.confidence_score ?? extractedData.confidence_score
          ),
          model_used: model,
          doc_type_detected: normalizedExtraction.type_document,
          rawText: rawText,
        };
      } catch (modelErr) {
        const errMsg = modelErr.response?.data?.error?.message || modelErr.message;
        lastError = errMsg;
        const retryable =
          errMsg.includes("quota") ||
          errMsg.includes("429") ||
          errMsg.includes("rate_limit") ||
          errMsg.includes("overloaded");
        if (!retryable) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    throw new Error(`Tous les modeles ont echoue. Derniere erreur: ${lastError}`);
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error("[AI Scan] Erreur finale:", errorMsg);
    return {
      success: false,
      error: errorMsg,
      extractedData: emptyExtraction(docType),
      confidence_score: 0,
    };
  }
}

module.exports = { scanDocument };
