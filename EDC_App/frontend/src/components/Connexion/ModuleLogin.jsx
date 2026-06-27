import React, { useContext, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserContext } from "./UserProvider.jsx";

const ModuleLogin = () => {
  const { module } = useParams();
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [identite, setIdentite] = useState("");
  const [mot_de_passe, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isGym = module === "gym";
  const conf = useMemo(
    () => ({
      title: isGym ? "Gym Management" : "Comptabilité",
      subtitle: isGym ? "Connectez-vous à l'espace fitness" : "Connectez-vous à l'espace comptable",
      icon: isGym ? "🏋" : "📊",
    }),
    [isGym]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/login", { identite, mot_de_passe });
      const { token, refreshToken, user } = res.data;
      if (!token || !user) throw new Error("Invalid response");

      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("active_module", isGym ? "gym" : "comptabilite");
      localStorage.setItem("user", JSON.stringify(user));
      if (user?.code_entreprise || user?.codeEntreprise) {
        localStorage.setItem("tenant_code", user?.code_entreprise || user?.codeEntreprise);
      }
      const branchId = user?.gym_branch_id || user?.branch_id || user?.branchId || user?.gymBranchId;
      if (branchId) {
        localStorage.setItem("gym_branch_id", branchId);
        localStorage.setItem("branch_id", branchId);
      } else {
        localStorage.removeItem("gym_branch_id");
        localStorage.removeItem("branch_id");
      }
      setUser(user);

      if (isGym) {
        const tenantCode = user?.code_entreprise || user?.codeEntreprise || "";
        const qs = tenantCode ? `?code_entreprise=${encodeURIComponent(tenantCode)}` : "";
        navigate(`/gym${qs}`);
      } else {
        navigate("/home");
      }
    } catch (_err) {
      setError("Identifiants invalides. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1f2e 0%, #27ae60 100%)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            padding: "32px 40px 28px",
            background: "linear-gradient(135deg,#27ae60,#1e8449)",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28 }}>{conf.icon}</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 800 }}>{conf.title}</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.9, fontSize: 13 }}>{conf.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "32px 40px 36px" }}>
          <h2 style={{ fontSize: 19, margin: "0 0 6px", color: "#0f172a" }}>Se connecter</h2>
          <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
            Entrez vos informations de connexion
          </p>

          {error ? (
            <div
              style={{
                marginBottom: 12,
                background: "#fdecea",
                color: "#c0392b",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #f5c6c2",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#1f2937", fontSize: 13 }}>
            Nom d'utilisateur
          </label>
          <input
            value={identite}
            onChange={(e) => setIdentite(e.target.value)}
            placeholder="Nom d'utilisateur"
            required
            style={{ width: "100%", marginBottom: 12, padding: 11, borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}
          />

          <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#1f2937", fontSize: 13 }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={mot_de_passe}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Mot de passe"
            required
            style={{ width: "100%", marginBottom: 14, padding: 11, borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 9,
              border: "none",
              color: "#fff",
              background: loading ? "#94a3b8" : "#27ae60",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 20 }}>
            <Link to="/modules" style={{ color: "#475569", textDecoration: "none", fontSize: 13 }}>
              Retour aux modules
            </Link>

            {/* Affiché uniquement pour le module comptabilité */}
            {!isGym && (
              <Link to="/register" style={{ color: "#27ae60", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
                Créer un compte
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModuleLogin;
