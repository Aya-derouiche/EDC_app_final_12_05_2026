require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const { ensureAuthTables } = require("./config/bootstrap");

const app = express();
const port = Number(process.env.PORT || 5001);

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "auth-service" });
});

app.use("/api/v1/auth", authRoutes);

app.post("/api/login", (req, res, next) => {
  req.url = "/login";
  return authRoutes(req, res, next);
});

app.post("/api/register", (req, res, next) => {
  req.url = "/register";
  return authRoutes(req, res, next);
});

app.post("/api/refresh-token", (req, res, next) => {
  req.url = "/refresh-token";
  return authRoutes(req, res, next);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

ensureAuthTables()
  .then(() => {
    app.listen(port, () => {
      console.log(`Auth service running on ${port}`);
    });
  })
  .catch((e) => {
    console.error("Auth service bootstrap failed:", e);
    process.exit(1);
  });
