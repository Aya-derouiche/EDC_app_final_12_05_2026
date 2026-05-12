import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import TiersSaisie from "../TiersSaisie";
import { UserContext } from "../Connexion/UserProvider";

const AddLivraison = ({ isSidebarOpen }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [livraison, setLivraison] = useState({
    date_BL: new Date().toISOString().split("T")[0],
    num_BL: "",
    code_tiers: "",
    tiers_saisie: "",
    reference_commande: "",
    montant_HT_BL: "",
    TVA_BL: "",
    montant_total_BL: "",
    observations: "",
    document_fichier: "",
    document_fichier_url: "",
  });

  const [errors, setErrors] = useState({});
  const [codeTiers, setCodeTiers] = useState([]);
  const [refCommandes, setRefCommandes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleModalShow = () => setShowModal(true);

  useEffect(() => {
    const fetchCodeTiers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("/api/code_tiers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCodeTiers(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      }
    };
    fetchCodeTiers();
  }, [navigate]);

  useEffect(() => {
    const ht = parseFloat(livraison.montant_HT_BL) || 0;
    const tva = parseFloat(livraison.TVA_BL) || 0;
    setLivraison((prev) => ({ ...prev, montant_total_BL: (ht + tva).toFixed(3) }));
  }, [livraison.montant_HT_BL, livraison.TVA_BL]);

  useEffect(() => {
    const fetchRefCommande = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/reference_commande", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRefCommandes(res.data);
      } catch (_err) {}
    };
    fetchRefCommande();
  }, []);

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "date_BL":
        error = value ? "" : "La date du bon de livraison est requise";
        break;
      case "num_BL":
        error = value ? "" : "Le numéro du bon de livraison est requis";
        break;
      case "montant_HT_BL":
        error = value ? "" : "Le montant HT du bon de livraison est requis";
        break;
      case "TVA_BL":
        error = value ? "" : "La TVA du bon de livraison est requise";
        break;
      case "montant_total_BL":
        error = value ? "" : "Le montant total du bon de livraison est requis";
        break;
      default:
        break;
    }
    setErrors((prevErrors) => ({ ...prevErrors, [name]: error }));
    return error;
  };

  const validateAllFields = () => {
    const validationErrors = {};
    Object.keys(livraison).forEach((key) => {
      if (key === "document_fichier_url") return;
      const error = validateField(key, livraison[key]);
      if (error) validationErrors[key] = error;
    });
    setErrors(validationErrors);
    return validationErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLivraison((prev) => ({ ...prev, [name]: value }));
    if (name === "tiers_saisie" && value !== "") setShowModal(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post("/api/livraison/upload-document", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLivraison((prev) => ({
        ...prev,
        document_fichier: res.data.objectKey,
        document_fichier_url: res.data.secureUrl,
      }));

      Swal.fire({ icon: "success", title: "Document importé", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Erreur upload",
        text: err.response?.data?.error || "Échec de l'upload du document.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClick = async (e) => {
    e.preventDefault();
    const validationErrors = validateAllFields();

    if (Object.keys(validationErrors).length !== 0) {
      Swal.fire({ icon: "warning", title: "Erreur", text: "Veuillez corriger les erreurs dans le formulaire." });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({ icon: "error", title: "Erreur", text: "Vous n'êtes pas authentifié. Veuillez vous reconnecter." });
      navigate("/login");
      return;
    }

    try {
      await axios.post("/api/livraison", livraison, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (user && user.role === "utilisateur") {
        try {
          await axios.post(
            "/api/notifications",
            { userId: user.id, message: `${user.identite} a ajouté une nouvelle Livraison` },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (_notifErr) {}
      }

      Swal.fire({ icon: "success", title: "Succès", text: "Livraison ajoutée avec succès!" });
      navigate("/livraisons");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.response?.data?.error || "Erreur lors de l'ajout de la livraison.",
      });
    }
  };

  const handleCancel = () => navigate("/livraisons");

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="card">
          <div className="card-body">
            <h1 className="text-center">Ajouter une Livraison</h1>
            <br />
            <form className="forms-sample">
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Date du Bon de Livraison :</label>
                    <input type="date" className={`form-control ${errors.date_BL && "is-invalid"}`} name="date_BL" onChange={handleChange} value={livraison.date_BL} />
                    {errors.date_BL && <div className="text-danger">{errors.date_BL}</div>}
                  </div>

                  <div className="form-group">
                    <label>Référence Commande:</label>
                    <select style={{ color: "black" }} className="form-control form-control-lg" name="reference_commande" onChange={handleChange} value={livraison.reference_commande}>
                      <option value="" style={{ color: "black" }}>Référence Commande</option>
                      {refCommandes.map((refCommande) => (
                        <option key={refCommande.num_commande} value={refCommande.num_commande} style={{ color: "black" }}>
                          {refCommande.num_commande}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Code Tiers:</label>
                    <select style={{ color: "black" }} className="form-control form-control-lg" name="code_tiers" onChange={handleChange} value={livraison.code_tiers}>
                      <option value="" style={{ color: "black" }}>Sélectionner le Code Tiers</option>
                      {codeTiers.map((tier) => (
                        <option key={tier.id} value={tier.code_tiers}>{`${tier.code_tiers} - ${tier.identite}`}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>N° du Bon de Livraison:</label>
                    <input type="text" className={`form-control ${errors.num_BL && "is-invalid"}`} name="num_BL" onChange={handleChange} placeholder="N° du Bon de Livraison" value={livraison.num_BL} />
                    {errors.num_BL && <div className="text-danger">{errors.num_BL}</div>}
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Tiers à Saisir:</label>
                    <input type="text" className="form-control" name="tiers_saisie" onChange={handleChange} onClick={handleModalShow} value={livraison.tiers_saisie} disabled={!!livraison.code_tiers} placeholder="Sélectionner un tiers" readOnly />
                  </div>

                  <div className="form-group">
                    <label>Document / Fichier à Insérer :</label>
                    <input type="file" className="form-control" name="document_fichier_file" onChange={handleFileUpload} accept="image/*,application/pdf" />
                    {uploading && <small style={{ color: "#666" }}>Upload en cours...</small>}
                    {livraison.document_fichier_url && (
                      <small style={{ display: "block", color: "green" }}>Document prêt.</small>
                    )}
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Montant HT du Bon de Livraison:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input type="number" step="0.01" className={`form-control ${errors.montant_HT_BL && "is-invalid"}`} name="montant_HT_BL" onChange={handleChange} placeholder="Montant HT du BL" value={livraison.montant_HT_BL} />
                      &nbsp;<span>DT</span>
                    </div>
                    {errors.montant_HT_BL && <div className="text-danger">{errors.montant_HT_BL}</div>}
                  </div>

                  <div className="form-group">
                    <label>Observations:</label>
                    <textarea className="form-control" name="observations" onChange={handleChange} placeholder="Entrez vos observations ici..." value={livraison.observations} rows="3" />
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>TVA du Bon de Livraison:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input type="number" step="0.01" className={`form-control ${errors.TVA_BL && "is-invalid"}`} name="TVA_BL" onChange={handleChange} placeholder="TVA du BL" value={livraison.TVA_BL} />
                      &nbsp;<span>DT</span>
                    </div>
                    {errors.TVA_BL && <div className="text-danger">{errors.TVA_BL}</div>}
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Montant Total du Bon de Livraison:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input type="number" step="0.01" className={`form-control ${errors.montant_total_BL && "is-invalid"}`} name="montant_total_BL" onChange={handleChange} placeholder="Montant Total du BL" value={livraison.montant_total_BL} />
                      &nbsp;<span>DT</span>
                    </div>
                    {errors.montant_total_BL && <div className="text-danger">{errors.montant_total_BL}</div>}
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-center">
                <button type="submit" className="btn btn-primary mr-2" onClick={handleClick} disabled={uploading}>Enregistrer</button>
                <button type="button" className="btn btn-light" onClick={handleCancel}>Annuler</button>
              </div>
            </form>

            <TiersSaisie
              showModal={showModal}
              setShowModal={setShowModal}
              setTiersSaisie={(value) => setLivraison((prev) => ({ ...prev, tiers_saisie: value }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLivraison;
