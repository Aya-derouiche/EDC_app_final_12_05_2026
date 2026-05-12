import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr(""); setMsg("");
    try {
      await axios.post("/api/forgot-password", { email });
      setMsg("Un lien de réinitialisation a été envoyé à votre email.");
    } catch { setErr("Email introuvable ou erreur serveur."); }
    finally { setLoading(false); }
  };

  return (
    <AuthWrap title="Mot de passe oublié" icon="🔐" sub="Entrez votre email pour recevoir un lien de réinitialisation">
      {msg && <Alert color="#d5f5e3" text="#1a7a3f" border="#a8e6c0">{msg}</Alert>}
      {err && <Alert color="#fdecea" text="#c0392b" border="#f5c6c2">{err}</Alert>}
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com" style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#27ae60"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
        <button type="submit" disabled={loading} style={btnStyle(loading)}>
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#718096" }}>
          <Link to="/" style={{ color: "#27ae60", fontWeight: 600, textDecoration: "none" }}>← Retour à la connexion</Link>
        </p>
      </form>
    </AuthWrap>
  );
};

export const ResetPassword = () => {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const token = window.location.pathname.split("/").pop();

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
    <AuthWrap title="Nouveau mot de passe" icon="🔑" sub="Choisissez un nouveau mot de passe sécurisé">
      {msg && <Alert color="#d5f5e3" text="#1a7a3f" border="#a8e6c0">{msg}</Alert>}
      {err && <Alert color="#fdecea" text="#c0392b" border="#f5c6c2">{err}</Alert>}
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Nouveau mot de passe</label>
        <input type="password" required value={pwd} onChange={e => setPwd(e.target.value)}
          placeholder="••••••••" style={{ ...inputStyle, marginBottom: 14 }}
          onFocus={e => e.target.style.borderColor = "#27ae60"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
        <label style={labelStyle}>Confirmer le mot de passe</label>
        <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••" style={inputStyle}
          onFocus={e => e.target.style.borderColor = "#27ae60"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
        <button type="submit" disabled={loading} style={btnStyle(loading)}>
          {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
        </button>
      </form>
    </AuthWrap>
  );
};

const AuthWrap = ({ title, icon, sub, children }) => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a1f2e,#27ae60)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',sans-serif" }}>
    <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 420, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg,#27ae60,#1e8449)", padding: "28px 36px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
        <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>{title}</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 4 }}>{sub}</p>
      </div>
      <div style={{ padding: "28px 36px 32px" }}>{children}</div>
    </div>
  </div>
);

const Alert = ({ color, text, border, children }) => (
  <div style={{ background: color, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 14px", color: text, fontSize: 13, marginBottom: 14 }}>{children}</div>
);

const labelStyle = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 };
const inputStyle = { width: "100%", padding: "10px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 18, transition: "border-color 0.2s" };
const btnStyle = (loading) => ({ width: "100%", padding: "11px", background: loading ? "#a0aec0" : "#27ae60", color: "#fff", border: "none", borderRadius: 9, fontSize: 14.5, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 4, fontFamily: "inherit" });

export default ForgotPassword;
