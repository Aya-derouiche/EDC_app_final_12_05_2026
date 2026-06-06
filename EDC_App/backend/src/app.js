const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const accountingRoutes = require("./routes/accountingRoutes");
const legacyRoutes = require("./routes/legacyRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const moduleRegistryRoutes = require("./routes/moduleRegistryRoutes");
const errorHandler = require("./middleware/errorHandler");
const env = require("./config/env");

const app = express();
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/accounting", accountingRoutes);
app.use("/api/v1/chatbot", chatbotRoutes);
app.use("/api/v1/modules", moduleRegistryRoutes);
app.use("/api", legacyRoutes);
app.use("/api/v1", legacyRoutes);

app.use(errorHandler);
module.exports = app;





