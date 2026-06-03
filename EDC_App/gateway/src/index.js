require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");
const { requestId } = require("./middleware/requestId");
const { requireGatewayAuth } = require("./middleware/auth");

const app = express();

const port = Number(process.env.GATEWAY_PORT || 8080);
const jwtSecret = process.env.JWT_SECRET || "change-this-in-production";
const jwtSecrets = process.env.JWT_SECRETS || jwtSecret;
const coreServiceUrl = process.env.CORE_SERVICE_URL || "http://localhost:5000";
const gymServiceUrl = process.env.GYM_SERVICE_URL || "http://localhost:5002";
const bankServiceUrl = process.env.BANK_SERVICE_URL || "http://localhost:5003";
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5004";
const reportingServiceUrl = process.env.REPORTING_SERVICE_URL || "http://localhost:5005";
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(requestId);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api-gateway" });
});

const publicPrefixes = [
  "/api/login",
  "/api/refresh-token",
  "/api/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh-token",
  "/api/v1/auth/register",
];

app.use((req, res, next) => {
  if (publicPrefixes.some((p) => req.path.startsWith(p))) return next();
  return requireGatewayAuth(jwtSecrets)(req, res, next);
});

function onProxyReq(proxyReq, req) {
  fixRequestBody(proxyReq, req);
  if (req.requestId) proxyReq.setHeader("x-request-id", req.requestId);
  if (req.user) {
    const encodedUser = Buffer.from(JSON.stringify(req.user), "utf8").toString("base64");
    proxyReq.setHeader("x-gateway-user", encodedUser);
  }
}

function makeProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    pathRewrite: (_path, req) => req.originalUrl,
    onProxyReq,
    on: { proxyReq: onProxyReq },
  });
}

app.use("/api/v1/gym", makeProxy(gymServiceUrl));
app.use("/api/v1/bank", makeProxy(bankServiceUrl));
app.use("/api/v1/notifications", makeProxy(notificationServiceUrl));
app.use("/api/v1/reporting", makeProxy(reportingServiceUrl));
app.use("/api", makeProxy(coreServiceUrl));

app.listen(port, () => {
  console.log(`API Gateway running on ${port}`);
  console.log(`Proxying /api/v1/gym -> ${gymServiceUrl}`);
  console.log(`Proxying /api/v1/bank -> ${bankServiceUrl}`);
  console.log(`Proxying /api/v1/notifications -> ${notificationServiceUrl}`);
  console.log(`Proxying /api/v1/reporting -> ${reportingServiceUrl}`);
  console.log(`Proxying /api -> ${coreServiceUrl}`);
});
