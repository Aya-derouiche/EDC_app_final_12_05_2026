import React, { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserProvider.jsx";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [identite, setIdentite] = useState("");
  const [mot_de_passe, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/login", { identite, mot_de_passe });
      const { token, user } = res.data;
      if (!token || !user) throw new Error("Réponse invalide");
      localStorage.setItem("token", token);
      setUser(user);
      navigate("/home");
    } catch (err) {
      setError("Identifiants invalides. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1f2e 0%, #27ae60 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: 20,
    }}>
      {/* Card */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        width: "100%",
        maxWidth: 440,
        overflow: "hidden",
      }}>
        {/* Header band */}
        <div style={{
          background: "linear-gradient(135deg,#27ae60,#1e8449)",
          padding: "32px 40px 28px",
          textAlign: "center",
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "rgba(255,255,255,0.2)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: 14,
          }}>
            📊
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>
            EDC Gestion
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 }}>
            Connectez-vous à votre espace comptable
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "32px 40px 36px" }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1a202c", marginBottom: 6 }}>
            Se connecter
          </h2>
          <p style={{ fontSize: 13, color: "#718096", marginBottom: 26 }}>
            Entrez vos informations de connexion
          </p>

          {error && (
            <div style={{
              background: "#fdecea", border: "1px solid #f5c6c2",
              borderRadius: 9, padding: "11px 15px",
              color: "#c0392b", fontSize: 13, marginBottom: 18,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Nom d'utilisateur
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "#a0aec0",
                }}>👤</span>
                <input
                  type="text"
                  value={identite}
                  onChange={e => setIdentite(e.target.value)}
                  placeholder="Nom d'utilisateur"
                  required
                  style={{
                    width: "100%", padding: "11px 14px 11px 40px",
                    border: "1.5px solid #e2e8f0", borderRadius: 9,
                    fontSize: 14, outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => e.target.style.borderColor = "#27ae60"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "#a0aec0",
                }}>🔒</span>
                <input
                  type={showPwd ? "text" : "password"}
                  value={mot_de_passe}
                  onChange={e => setMotDePasse(e.target.value)}
                  placeholder="Mot de passe"
                  required
                  style={{
                    width: "100%", padding: "11px 40px 11px 40px",
                    border: "1.5px solid #e2e8f0", borderRadius: 9,
                    fontSize: 14, outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                    fontFamily: "inherit",
                  }}
                  onFocus={e => e.target.style.borderColor = "#27ae60"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 16, color: "#a0aec0", padding: 2,
                  }}
                >
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Helper text */}
            <p style={{ fontSize: 12, color: "#a0aec0", marginBottom: 18 }}>
              Si vous rencontrez un problème, contactez votre administration
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? "#a0aec0" : "linear-gradient(135deg,#27ae60,#1e8449)",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity 0.2s, transform 0.15s",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {loading ? (
                <><span style={{
                  width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff", borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Connexion...</>
              ) : "Se connecter"}
            </button>

            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 18, fontSize: 13,
            }}>
              <Link to="/forget_pass" style={{ color: "#27ae60", textDecoration: "none", fontWeight: 500 }}>
                Mot de passe oublié ?
              </Link>
              <Link to="/register" style={{ color: "#718096", textDecoration: "none" }}>
                Créer un compte
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
