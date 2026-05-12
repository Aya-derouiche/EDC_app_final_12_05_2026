import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const navigate = useNavigate();
  const [entrepriseCodes, setEntrepriseCodes] = useState([]);
  const [userData, setUserData] = useState({
    code_entreprise: "", code_comptable: "", code_user: "",
    identite: "", position: "", tel: "", email: "",
    mot_de_passe: "", role: "utilisateur",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    axios.get("/api/entreprises").then(r => setEntrepriseCodes(r.data)).catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!userData.identite.trim()) e.identite = "Requis";
    if (!userData.position.trim()) e.position = "Requis";
    if (!/\S+@\S+\.\S+/.test(userData.email)) e.email = "Email invalide";
    if (userData.mot_de_passe.length < 6) e.mot_de_passe = "Min. 6 caractères";
    if (!/^[0-9]{8,15}$/.test(userData.tel)) e.tel = "Téléphone invalide";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await axios.post("/api/register", userData);
      setSuccess("Compte créé avec succès !");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Erreur lors de la création" });
    } finally { setLoading(false); }
  };

  const Field = ({ label, name, type = "text", children }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>
      {children || (
        <input type={type} value={userData[name]} onChange={e => setUserData(p => ({ ...p, [name]: e.target.value }))}
          style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${errors[name] ? "#e74c3c" : "#e2e8f0"}`, borderRadius: 8, fontSize: 13.5, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "#27ae60"} onBlur={e => e.target.style.borderColor = errors[name] ? "#e74c3c" : "#e2e8f0"}
        />
      )}
      {errors[name] && <div style={{ fontSize: 11.5, color: "#e74c3c", marginTop: 3 }}>{errors[name]}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a1f2e,#27ae60)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 520, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#27ae60,#1e8449)", padding: "24px 36px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📝</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Créer un compte</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 3 }}>Remplissez le formulaire ci-dessous</p>
        </div>
        <div style={{ padding: "24px 36px 28px" }}>
          {errors.general && <div style={{ background: "#fdecea", border: "1px solid #f5c6c2", borderRadius: 8, padding: "10px 14px", color: "#c0392b", fontSize: 13, marginBottom: 14 }}>{errors.general}</div>}
          {success && <div style={{ background: "#d5f5e3", border: "1px solid #a8e6c0", borderRadius: 8, padding: "10px 14px", color: "#1a7a3f", fontSize: 13, marginBottom: 14 }}>✅ {success}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Field label="Identité *" name="identite" />
              <Field label="Position *" name="position" />
              <Field label="Téléphone *" name="tel" />
              <Field label="Email *" name="email" type="email" />
              <Field label="Mot de passe *" name="mot_de_passe" type="password" />
              <Field label="Rôle">
                <select value={userData.role} onChange={e => setUserData(p => ({ ...p, role: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13.5, outline: "none", fontFamily: "inherit", background: "#fff" }}>
                  <option value="utilisateur">Utilisateur</option>
                  <option value="comptable">Comptable</option>
                </select>
              </Field>
              {userData.role === "utilisateur" && (
                <Field label="Code utilisateur" name="code_user" />
              )}
              {userData.role === "comptable" && (
                <>
                  <Field label="Code entreprise">
                    <select value={userData.code_entreprise} onChange={e => setUserData(p => ({ ...p, code_entreprise: e.target.value }))}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13.5, outline: "none", fontFamily: "inherit", background: "#fff" }}>
                      <option value="">-- Sélectionner --</option>
                      {entrepriseCodes.map(ec => <option key={ec.code_entreprise} value={ec.code_entreprise}>{ec.code_entreprise}</option>)}
                    </select>
                  </Field>
                  <Field label="Code comptable" name="code_comptable" />
                </>
              )}
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "11px", background: loading ? "#a0aec0" : "#27ae60", color: "#fff", border: "none", borderRadius: 9, fontSize: 14.5, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 6, fontFamily: "inherit" }}>
              {loading ? "Création..." : "Créer mon compte"}
            </button>
            <p style={{ textAlign: "center", fontSize: 13, color: "#718096", marginTop: 14 }}>
              Déjà un compte ? <Link to="/" style={{ color: "#27ae60", fontWeight: 600, textDecoration: "none" }}>Se connecter</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
