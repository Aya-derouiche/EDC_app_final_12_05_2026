import React from "react";
import { Link } from "react-router-dom";

const card = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "18px 20px",
  textDecoration: "none",
  color: "#111827",
  display: "flex",
  alignItems: "center",
  gap: 14,
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
};

const ModuleSelector = () => {
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "'Inter', sans-serif" }}>
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 42px" }}>
          <h1 style={{ margin: "20px 0 10px", fontSize: 48, color: "#0f172a", fontWeight: 800 }}>
            Selectionnez vos modules
          </h1>
          <p style={{ margin: 0, color: "#475569", fontSize: 18 }}>
            Choisissez l'espace de travail a ouvrir.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 20px" }}>
        <h2 style={{ margin: "0 0 18px", color: "#0f172a", fontSize: 28 }}>Modules ERP</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <Link to="/login/comptabilite" style={card}>
            <span style={{ fontSize: 32 }}>📊</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Comptabilite</div>
              <div style={{ color: "#64748b", marginTop: 4 }}>Connexion vers l'espace comptable</div>
            </div>
          </Link>

          <Link to="/login/gym" style={card}>
            <span style={{ fontSize: 32 }}>🏋</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Gym Management</div>
              <div style={{ color: "#64748b", marginTop: 4 }}>Connexion vers l'espace fitness</div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ModuleSelector;
