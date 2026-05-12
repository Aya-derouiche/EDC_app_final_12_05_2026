const axios = require("axios");

async function generateChatReply(messages, ragContext = []) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is missing");

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

  const { data } = await axios.post(apiUrl, payload, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 30000,
  });

  return data?.choices?.[0]?.message?.content || "Je n'ai pas pu générer une réponse.";
}

module.exports = { generateChatReply };
