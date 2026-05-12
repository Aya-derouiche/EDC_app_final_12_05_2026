import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const AddEntreprise = ({ isSidebarOpen }) => {
  const [entreprise, setEntreprise] = useState({
    code_entreprise: "",
    date_creation: new Date().toISOString().split("T")[0],
    identite: "",
    MF_CIN: "",
    responsable: "",
    cnss: "",
    tel: "",
    email: "",
    adresse: "",
  });

  const [errors, setErrors] = useState({
    code_entreprise: "",
    date_creation: "",
    identite: "",
    MF_CIN: "",
    responsable: "",
    cnss: "",
    tel: "",
    email: "",
    adresse: "",
  });

  const [inputValidity, setInputValidity] = useState({
    code_entreprise: false,
    date_creation: false,
    identite: false,
    MF_CIN: false,
    responsable: false,
    cnss: false,
    tel: false,
    email: false,
    adresse: false,
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEntreprise((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let error = "";
    let valid = false;
    switch (name) {
      case "code_entreprise":
        error = value ? "" : "Code Entreprise est obligatoire";
        valid = value !== "";
        break;
      case "date_creation":
        error = value ? "" : "Date de Création est obligatoire";
        valid = value !== "";
        break;
      case "identite":
        error = value ? "" : "Identité est obligatoire";
        valid = value !== "";
        break;
      case "MF_CIN":
        error = value ? "" : "MF/CIN est obligatoire";
        valid = value !== "";
        break;
      case "responsable":
        error = value ? "" : "Responsable est obligatoire";
        valid = value !== "";
        break;
      case "cnss":
        error = value ? "" : "CNSS est obligatoire";
        valid = value !== "";
        break;
      case "tel":
        error = value
          ? value.length === 8
            ? ""
            : "Le numéro de téléphone doit contenir 8 chiffres"
          : "Téléphone est obligatoire";
        valid = value.length === 8;
        break;
      case "email":
        error = value ? (/\S+@\S+\.\S+/.test(value) ? "" : "Email invalide") : "Email est obligatoire";
        valid = /\S+@\S+\.\S+/.test(value);
        break;
      case "adresse":
        error = value ? "" : "Adresse est obligatoire";
        valid = value !== "";
        break;
      default:
        break;
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: error }));
    setInputValidity((prevValidity) => ({ ...prevValidity, [name]: valid }));
  };

  const handleClick = async (e) => {
    e.preventDefault();

    Object.keys(entreprise).forEach((key) => validateField(key, entreprise[key]));

    if (Object.values(inputValidity).every((valid) => valid)) {
      try {
        await axios.post("/api/entreprises", entreprise);        
        Swal.fire({
          icon: "success",
          title: "Succès",
          text: "Entreprise ajoutée avec succès.",
        });

        setTimeout(() => {
          navigate("/entreprises");
        }, 2000);
      } catch (err) {
        console.log(err);
        Swal.fire({
          icon: "error",
          title: "Erreur",
          text: "L'ajout de l'entreprise a échoué.",
        });
      }
    }
  };

  const handleCancel = () => {
    navigate("/entreprises");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? 'shifted' : ''}`}>
        <div className="card">
          <div className="card-body">
            <h2 className="text-center">Ajouter une Entreprise</h2>
            <br />
            <form className="forms-sample">
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Date de Création:</label>
                    <input
                      type="date"
                      className={`form-control ${errors.date_creation ? "is-invalid" : ""}`}
                      name="date_creation"
                      value={entreprise.date_creation}
                      onChange={handleChange}
                    />
                    {errors.date_creation && (
                      <div className="invalid-feedback">{errors.date_creation}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Code Entreprise:</label>
                    <input
                      type="text"
                      className={`form-control ${errors.code_entreprise ? "is-invalid" : ""}`}
                      name="code_entreprise"
                      value={entreprise.code_entreprise}
                      onChange={handleChange}
                      placeholder="Code entreprise"
                    />
                    {errors.code_entreprise && (
                      <div className="invalid-feedback">{errors.code_entreprise}</div>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Identité:</label>
                    <input
                      type="text"
                      className={`form-control ${errors.identite ? "is-invalid" : ""}`}
                      name="identite"
                      value={entreprise.identite}
                      onChange={handleChange}
                      placeholder="Identité"
                    />
                    {errors.identite && (
                      <div className="invalid-feedback">{errors.identite}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>MF/CIN:</label>
                    <input
                      type="text"
                      className={`form-control ${errors.MF_CIN ? "is-invalid" : ""}`}
                      name="MF_CIN"
                      value={entreprise.MF_CIN}
                      onChange={handleChange}
                      placeholder="MF/CIN"
                    />
                    {errors.MF_CIN && (
                      <div className="invalid-feedback">{errors.MF_CIN}</div>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Responsable:</label>
                    <input
                      type="text"
                      className={`form-control ${errors.responsable ? "is-invalid" : ""}`}
                      name="responsable"
                      value={entreprise.responsable}
                      onChange={handleChange}
                      placeholder="Responsable"
                    />
                    {errors.responsable && (
                      <div className="invalid-feedback">{errors.responsable}</div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>CNSS:</label>
                    <input
                      type="text"
                      className={`form-control ${errors.cnss ? "is-invalid" : ""}`}
                      name="cnss"
                      value={entreprise.cnss}
                      onChange={handleChange}
                      placeholder="CNSS"
                    />
                    {errors.cnss && (
                      <div className="invalid-feedback">{errors.cnss}</div>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? "is-invalid" : ""}`}
                      name="email"
                      value={entreprise.email}
                      onChange={handleChange}
                      placeholder="Email"
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email}</div>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Téléphone:</label>
                    <input
                      type="tel"
                      className={`form-control ${errors.tel ? "is-invalid" : ""}`}
                      name="tel"
                      value={entreprise.tel}
                      onChange={handleChange}
                      placeholder="Téléphone"
                    />
                    {errors.tel && (
                      <div className="invalid-feedback">{errors.tel}</div>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Adresse:</label>
                    <input
                      type="text"
                      className={`form-control ${errors.adresse ? "is-invalid" : ""}`}
                      name="adresse"
                      value={entreprise.adresse}
                      onChange={handleChange}
                      placeholder="Adresse"
                    />
                    {errors.adresse && (
                      <div className="invalid-feedback">{errors.adresse}</div>
                    )}
                  </div>
                </div>
              </div>
              <br />
              <div className="d-flex justify-content-center">
                <button
                  type="submit"
                  className="btn btn-primary mr-2"
                  onClick={handleClick}
                >
                  Soumettre
                </button>
                &nbsp; &nbsp;
                <button className="btn btn-light" onClick={handleCancel}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEntreprise;
