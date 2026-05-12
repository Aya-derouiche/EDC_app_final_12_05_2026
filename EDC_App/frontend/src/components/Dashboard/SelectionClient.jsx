import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Connexion/UserProvider.jsx";

const SelectionClient = () => {
  const { user, setSelectedClient } = useContext(UserContext);
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    axios.get("/api/clients", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setClients(r.data)).catch(() => navigate("/home"));
  }, [navigate]);

  const filtered = clients.filter(c =>
    c.identite?.toLowerCase().includes(search.toLowerCase()) ||
    c.code_entreprise?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'Inter',sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#27ae60,#1e8449)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 12 }}>🏢</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a202c" }}>Sélectionnez un client</h1>
          <p style={{ color: "#718096", fontSize: 14, marginTop: 4 }}>Choisissez le client pour lequel vous souhaitez travailler</p>
        </div>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#a0aec0", fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..." style={{ width: "100%", padding: "12px 14px 12px 44px", border: "1.5px solid #e8ecf0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(c => (
            <button key={c.id} onClick={() => { setSelectedClient(c); navigate("/home"); }} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
              background: "#fff", border: "1.5px solid #e8ecf0", borderRadius: 12,
              cursor: "pointer", textAlign: "left", transition: "all 0.18s", width: "100%",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#27ae60"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(39,174,96,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8ecf0"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#27ae60,#1e8449)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {c.identite?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a202c" }}>{c.identite}</div>
                <div style={{ fontSize: 12.5, color: "#718096", marginTop: 2 }}>Code: {c.code_entreprise}</div>
              </div>
              <span style={{ marginLeft: "auto", color: "#a0aec0", fontSize: 18 }}>→</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#a0aec0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Aucun client trouvé</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectionClient;
