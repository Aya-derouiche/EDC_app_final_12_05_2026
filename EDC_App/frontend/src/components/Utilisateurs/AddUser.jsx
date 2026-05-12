import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const minimalFieldStyle = {
  border: "none",
  borderBottom: "1px solid #bfc6ce",
  borderRadius: 0,
  backgroundColor: "transparent",
  paddingLeft: "0.25rem",
  paddingRight: "0.25rem",
  boxShadow: "none",
};

const AddUser = ({ isSidebarOpen, embedded = false, onClose, onSuccess }) => {
  const [user, setUser] = useState({
    code_entreprise: "",
    code_user: "",
    identite: "",
    position: "",
    tel: "",
    email: "",
    mot_de_passe: "",
    role: "",
  });

  const [entrepriseCodes, setEntrepriseCodes] = useState([]);
  const [errors, setErrors] = useState({
    code_entreprise: "",
    code_user: "",
    identite: "",
    position: "",
    tel: "",
    email: "",
    mot_de_passe: "",
    role: "",
  });

  const navigate = useNavigate();

  const validateField = (name, value) => {
    let message = "";
    switch (name) {
      case "code_entreprise": if (!value) message = "Le code entreprise est obligatoire."; break;
      case "code_user": if (!value) message = "Le code utilisateur est obligatoire."; break;
      case "identite": if (!value) message = "L'identité est obligatoire."; break;
      case "position": if (!value) message = "La position est obligatoire."; break;
      case "tel": if (!/^\d{8}$/.test(value)) message = "Le téléphone doit contenir 8 chiffres."; break;
      case "email": if (!/\S+@\S+\.\S+/.test(value)) message = "L'email doit être valide."; break;
      case "mot_de_passe": if (!value || value.length < 4) message = "Le mot de passe doit contenir au moins 4 caractères."; break;
      case "role": if (!value) message = "Le rôle est obligatoire."; break;
      default: break;
    }
    setErrors((prev) => ({ ...prev, [name]: message }));
    return message === "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleCancel = () => {
    if (embedded && onClose) onClose();
    else navigate("/users");
  };

  useEffect(() => {
    const fetchEntrepriseCodes = async () => {
      try {
        const res = await axios.get("/api/code_entreprises");
        setEntrepriseCodes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEntrepriseCodes();
  }, []);

  const isFormComplete = useMemo(() => Object.values(user).every((value) => String(value ?? "").trim() !== ""), [user]);

  const handleClick = async (e) => {
    e.preventDefault();
    const isValid = Object.keys(user).every((key) => validateField(key, user[key]));
    if (!isValid) return;

    try {
      await axios.post("/api/users", user);
      Swal.fire({ icon: "success", title: "Succès", text: "Utilisateur ajouté avec succès." });
      if (embedded) {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        navigate("/users");
      }
    } catch (error) {
      console.error("Erreur :", error);
      Swal.fire({ icon: "error", title: "Erreur", text: "L'ajout de l'utilisateur a échoué." });
    }
  };

  const formContent = (
    <div className="card border-0 shadow-sm" style={{ borderRadius: "12px", width: "100%", maxWidth: embedded ? "100%" : "1100px", margin: "0 auto" }}>
      <div className="card-body p-4 p-md-5">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4">
          <h4 className="mb-2 mb-md-0" style={{ color: "#1f6fc1", fontWeight: 700 }}>
            Liste utilisateurs <span style={{ color: "#98a0aa" }}>›</span> Ajouter un utilisateur
          </h4>
          <div className="d-flex gap-2">
            <button type="submit" form="add-user-form" className="btn btn-primary" disabled={!isFormComplete} style={{ minWidth: "120px" }}>Ajouter</button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel} style={{ minWidth: "120px", backgroundColor: "#6f7782", borderColor: "#6f7782" }}>Annuler</button>
          </div>
        </div>

        <form id="add-user-form" onSubmit={handleClick}>
          <div className="row">
            <div className="col-lg-6 pr-lg-5">
              <div className="form-group mb-4">
                <label className="font-weight-bold">Code entreprise</label>
                <select className={`form-control ${errors.code_entreprise ? "is-invalid" : ""}`} style={minimalFieldStyle} name="code_entreprise" value={user.code_entreprise} onChange={handleChange}>
                  <option value="">Sélectionnez un code entreprise</option>
                  {entrepriseCodes.map((entrepriseCode, index) => (
                    <option key={`${entrepriseCode.code_entreprise || "code"}-${index}`} value={entrepriseCode.code_entreprise || ""}>{entrepriseCode.code_entreprise}</option>
                  ))}
                </select>
                {errors.code_entreprise && <div className="invalid-feedback d-block">{errors.code_entreprise}</div>}
              </div>

              <div className="form-group mb-4">
                <label className="font-weight-bold">Code utilisateur</label>
                <input type="text" className={`form-control ${errors.code_user ? "is-invalid" : ""}`} style={minimalFieldStyle} name="code_user" value={user.code_user} onChange={handleChange} placeholder="Ex: U-001" />
                {errors.code_user && <div className="invalid-feedback d-block">{errors.code_user}</div>}
              </div>

              <div className="form-group mb-4">
                <label className="font-weight-bold">Identité</label>
                <input type="text" className={`form-control ${errors.identite ? "is-invalid" : ""}`} style={minimalFieldStyle} name="identite" value={user.identite} onChange={handleChange} placeholder="Nom complet" />
                {errors.identite && <div className="invalid-feedback d-block">{errors.identite}</div>}
              </div>

              <div className="form-group mb-4">
                <label className="font-weight-bold">Position</label>
                <input type="text" className={`form-control ${errors.position ? "is-invalid" : ""}`} style={minimalFieldStyle} name="position" value={user.position} onChange={handleChange} placeholder="Ex: Responsable comptable" />
                {errors.position && <div className="invalid-feedback d-block">{errors.position}</div>}
              </div>
            </div>

            <div className="col-lg-6 pl-lg-5">
              <div className="form-group mb-4">
                <label className="font-weight-bold">Rôle</label>
                <select className={`form-control ${errors.role ? "is-invalid" : ""}`} style={minimalFieldStyle} name="role" value={user.role} onChange={handleChange}>
                  <option value="">Sélectionnez un rôle</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="comptable">Comptable</option>
                  <option value="utilisateur">Utilisateur</option>
                </select>
                {errors.role && <div className="invalid-feedback d-block">{errors.role}</div>}
              </div>

              <div className="form-group mb-4">
                <label className="font-weight-bold">Téléphone</label>
                <input type="tel" className={`form-control ${errors.tel ? "is-invalid" : ""}`} style={minimalFieldStyle} name="tel" value={user.tel} onChange={handleChange} placeholder="8 chiffres" />
                {errors.tel && <div className="invalid-feedback d-block">{errors.tel}</div>}
              </div>

              <div className="form-group mb-4">
                <label className="font-weight-bold">Email</label>
                <input type="email" className={`form-control ${errors.email ? "is-invalid" : ""}`} style={minimalFieldStyle} name="email" value={user.email} onChange={handleChange} placeholder="exemple@entreprise.com" />
                {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
              </div>

              <div className="form-group mb-4">
                <label className="font-weight-bold">Mot de passe</label>
                <input type="password" className={`form-control ${errors.mot_de_passe ? "is-invalid" : ""}`} style={minimalFieldStyle} name="mot_de_passe" value={user.mot_de_passe} onChange={handleChange} placeholder="Minimum 4 caractères" />
                {errors.mot_de_passe && <div className="invalid-feedback d-block">{errors.mot_de_passe}</div>}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (embedded) return formContent;

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 140px)", padding: "24px" }}>
        {formContent}
      </div>
    </div>
  );
};

export default AddUser;
