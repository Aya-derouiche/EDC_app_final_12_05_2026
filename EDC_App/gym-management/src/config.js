require("dotenv").config();

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

module.exports = {
  port: Number(readEnv("GYM_PORT", "PORT") || 5002),
  jwtSecret: readEnv("JWT_SECRET") || "change-this-in-production",
  corsOrigin: readEnv("CORS_ORIGIN") || "http://localhost:5173",
  defaultTenantCode: readEnv("GYM_DEFAULT_TENANT_CODE", "DEFAULT_TENANT_CODE") || "ENT001",
  ai: {
    provider: readEnv("GYM_AI_PROVIDER") || "groq",
    groqApiKey: readEnv("GROQ_API_KEY", "GYM_GROQ_API_KEY") || "",
    groqModel: readEnv("GROQ_MODEL", "GYM_GROQ_MODEL") || "llama-3.1-8b-instant",
    groqUrl: readEnv("GROQ_API_URL", "GYM_GROQ_API_URL") || "https://api.groq.com/openai/v1/chat/completions",
  },
  db: {
    host: readEnv("GYM_DB_HOST", "DB_HOST") || "127.0.0.1",
    port: Number(readEnv("GYM_DB_PORT", "DB_PORT") || 5432),
    user: readEnv("GYM_DB_USER", "DB_USER") || "postgres",
    password: readEnv("GYM_DB_PASSWORD", "DB_PASSWORD") || "postgres",
    database: readEnv("GYM_DB_NAME", "DB_NAME") || "cloud",
  },
};
