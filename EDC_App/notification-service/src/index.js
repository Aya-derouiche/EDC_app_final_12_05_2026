require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "5mb" }));

const notifications = [];

app.get("/health", (_req, res) => res.json({ ok: true, service: "notification-service" }));

app.post("/api/v1/notifications/send", (req, res) => {
  const item = {
    id: notifications.length + 1,
    channel: req.body?.channel || "email",
    recipient: req.body?.recipient || null,
    subject: req.body?.subject || "Notification",
    message: req.body?.message || "",
    status: "queued",
    created_at: new Date().toISOString(),
  };
  notifications.unshift(item);
  res.status(201).json(item);
});

app.get("/api/v1/notifications", (_req, res) => {
  res.json(notifications.slice(0, 100));
});

const port = Number(process.env.NOTIFICATION_PORT || 5004);
app.listen(port, () => console.log(`Notification service running on ${port}`));
