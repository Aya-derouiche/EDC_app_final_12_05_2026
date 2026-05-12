import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div style={{ minHeight: "100vh", background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: 72, fontWeight: 800, color: "#e8ecf0", margin: 0, lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a202c", marginTop: 8 }}>Page introuvable</h2>
      <p style={{ color: "#718096", fontSize: 14, marginTop: 6, marginBottom: 28 }}>La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link to="/home" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", background: "#27ae60", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
        ← Retour au tableau de bord
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
