const axios = require("axios");

async function generateChatReply(messages, ragContext = []) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const contextHint = ragContext.length
      ? "\n\nJ'ai aussi trouvé des documents liés, mais la génération IA est désactivée tant que la clé Groq n'est pas configurée."
      : "";
    return `Assistant IA non configuré: ajoute GROQ_API_KEY sur Render pour activer les réponses Groq.${contextHint}\n\nDernière question reçue: ${lastUserMessage}`;
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const apiUrl = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

  const contextBlock = ragContext.length
    ? `\nContexte documentaire (prioritaire, cite la source):\n${ragContext
        .map((c, i) => `${i + 1}. [${c.source}] ${c.text}`)
        .join("\n\n")}`
    : "";

  const payload = {
    model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "Tu es un assistant comptable SaaS. Réponds clairement et de façon opérationnelle. Si contexte fourni, base ta réponse dessus." +
          contextBlock,
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

module.exports = { generateChatReply };
