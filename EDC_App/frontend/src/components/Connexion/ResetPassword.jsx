import React, { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const ResetPassword = () => {
  const { token } = useParams();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwd !== confirm) { setErr("Les mots de passe ne correspondent pas."); return; }
    if (pwd.length < 6) { setErr("Min. 6 caractères."); return; }
    setLoading(true); setErr("");
    try {
      await axios.post(`/api/reset-password/${token}`, { mot_de_passe: pwd });
      setMsg("Mot de passe réinitialisé ! Redirection...");
      setTimeout(() => window.location.href = "/", 2000);
    } catch { setErr("Lien invalide ou expiré."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a1f2e,#27ae60)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 420, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#27ae60,#1e8449)", padding: "28px 36px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔑</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Nouveau mot de passe</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 4 }}>Choisissez un mot de passe sécurisé</p>
        </div>
        <div style={{ padding: "28px 36px 32px" }}>
          {msg && <div style={{ background: "#d5f5e3", border: "1px solid #a8e6c0", borderRadius: 8, padding: "10px 14px", color: "#1a7a3f", fontSize: 13, marginBottom: 14 }}>✅ {msg}</div>}
          {err && <div style={{ background: "#fdecea", border: "1px solid #f5c6c2", borderRadius: 8, padding: "10px 14px", color: "#c0392b", fontSize: 13, marginBottom: 14 }}>⚠ {err}</div>}
          <form onSubmit={handleSubmit}>
            {[["Nouveau mot de passe", pwd, setPwd], ["Confirmer", confirm, setConfirm]].map(([lbl, val, set]) => (
              <div key={lbl} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{lbl}</label>
                <input type="password" required value={val} onChange={e => set(e.target.value)} placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "#27ae60"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: 11, background: loading ? "#a0aec0" : "#27ae60", color: "#fff", border: "none", borderRadius: 9, fontSize: 14.5, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 4, fontFamily: "inherit" }}>
              {loading ? "Réinitialisation..." : "Réinitialiser"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
