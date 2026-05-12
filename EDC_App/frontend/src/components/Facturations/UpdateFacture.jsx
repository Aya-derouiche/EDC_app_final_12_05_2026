import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import TiersSaisie from "../TiersSaisie";

const UpdateFacture = ({isSidebarOpen}) => {
  const initialFactureState = {
    date_facture: new Date().toISOString().split("T")[0],
    num_facture: "",
    code_tiers: "",
    tiers_saisie: "",
    reference_livraison: "",
    montant_HT_facture: "",
    FODEC_sur_facture: "",
    TVA_facture: "",
    timbre_facture: "",
    autre_montant_facture: "",
    montant_total_facture: "",
    observations: "",
    document_fichier: "",
    etat_payement: "non payée",
  };



  const [facture, setFacture] = useState(initialFactureState);
  const [codeTiers, setCodeTiers] = useState([]);
  const [refLivraisons, setRefLivraisons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const handleModalShow = () => setShowModal(true);


  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchFacture = async () => {
      try {
        const res = await axios.get(`/api/facture/${id}`);
        const { data } = res;

        const f = data.facture || data || {};
        setFacture({
          ...initialFactureState,
          date_facture: f.date_facture ? new Date(f.date_facture).toISOString().split("T")[0] : "",
          num_facture: f.num_facture ?? "",
          code_tiers: f.code_tiers ?? "",
          tiers_saisie: f.tiers_saisie ?? "",
          reference_livraison: f.reference_livraison ?? "",
          montant_HT_facture: f.montant_HT_facture ?? "",
          FODEC_sur_facture: f.FODEC_sur_facture ?? "",
          TVA_facture: f.TVA_facture ?? "",
          timbre_facture: f.timbre_facture ?? "",
          autre_montant_facture: f.autre_montant_facture ?? "",
          montant_total_facture: f.montant_total_facture ?? "",
          observations: f.observations ?? "",
          document_fichier: f.document_fichier ?? "",
          etat_payement: f.etat_payement ?? "non payée",
        });
      } catch (err) {
        console.log(err);
      }
    };
    fetchFacture();
  }, [id]);

  useEffect(() => {
    const fetchCodeTiers = async () => {
      try {
        const res = await axios.get("/api/code_tiers", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setCodeTiers(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchCodeTiers();
  }, []);

  useEffect(() => {
    const fetchRefLivraisons = async () => {
      try {
        const res = await axios.get(
          "/api/reference_livraison"
        );
        setRefLivraisons(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchRefLivraisons();
  }, []);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFacture((prev) => ({ ...prev, [name]: checked ? "payée" : "non payée" }));
    } else if (name === "document_fichier" && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1];
        const url = `data:image/png;base64,${base64Data}`;
        setFacture((prev) => ({ ...prev, document_fichier: url }));
      };
      reader.readAsDataURL(e.target.files[0]);
    } else {
      setFacture((prev) => ({ ...prev, [name]: value ?? "" }));
    }
    if (name === "tiers_saisie" && value !== "") {
      setShowModal(true);
    }
  };



  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { facture };

    axios
      .put(`/api/facture/${id}`, data)
      .then((response) => {
        console.log(response.data.message);
        alert("Données modifiées avec succès.");
        navigate("/facturations");
      })
      .catch((error) => {
        console.error("Erreur lors de la modification du Facture :", error);
        if (error.response) {
          console.error("Contenu de la réponse :", error.response.data);
        } else {
          console.error("Aucune réponse reçue.");
        }
        alert("Erreur lors de la modification du Facture: " + error.message);
      });
  };

  const openImageViewer = () => {
    const imageViewerUrl = facture.document_fichier;
    const imageWindow = window.open("", "_blank");
    const img = document.createElement("img");
    img.src = imageViewerUrl;
    img.style.marginLeft = "400px";
    imageWindow.document.body.appendChild(img);
  };

  const handleCancel = () => {
    navigate("/facturations");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? 'shifted' : ''}`}>
      <div className="card">
          <div className="card-body">
            <h2 className="text-center">Modifier une Facture</h2>
            <br />
            <form className="forms-sample" onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Date de la Facture:</label>
                    <input
                      type="date"
                      className="form-control"
                      name="date_facture"
                      onChange={handleChange}
                      value={facture.date_facture ?? ""}
                    />
                  </div>

                  <div className="form-group">
                    <label>Code Tiers:</label>
                    <select
                      className="form-control"
                      style={{color: "black"}}
                      name="code_tiers"
                      onChange={handleChange}
                      value={facture.code_tiers ?? ""}
                    >
                      <option value="">Sélectionner le Code Tiers</option>
                      {codeTiers.map((tier) => (
                        <option key={tier.id} value={tier.code_tiers}>
                          {`${tier.code_tiers} - ${tier.identite}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>N° de la Facture:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="num_facture"
                      onChange={handleChange}
                      value={facture.num_facture ?? ""}
                    />
                  </div>

                  <div className="form-group">
                    <label>Référence de la Livraison:</label>
                    <select
                      style={{ color: "black" }}
                      className="form-control form-control-lg"
                      name="reference_livraison"
                      onChange={handleChange}
                      value={facture.reference_livraison ?? ""}
                    >
                      <option value="" style={{ color: "black" }}>
                        Référence Livraison
                      </option>
                      {refLivraisons.map((refLivraison, idx) => (
                        <option
                          key={`${refLivraison.num_BL || "vide"}-${idx}`}
                          value={refLivraison.num_BL || ""}
                          style={{ color: "black" }}
                        >
                          {refLivraison.num_BL}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                <div className="form-group">
                    <label>Tiers à ajouter:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="tiers_saisie"
                      onChange={handleChange}
                      onClick={handleModalShow}
                      value={facture.tiers_saisie ?? ""}
                      disabled={!!facture.code_tiers} // Désactiver si code_tiers est sélectionné
                    />
                  </div>
                  <div className="form-group">
                    <label>TVA de la Facture:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-control"
                        name="TVA_facture"
                        onChange={handleChange}
                        value={facture.TVA_facture ?? ""}
                      />
                      &nbsp;
                      <span>DT</span>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Montant HT de la Facture:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-control"
                        name="montant_HT_facture"
                        onChange={handleChange}
                        value={facture.montant_HT_facture ?? ""}
                      />
                      &nbsp;
                      <span>DT</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>FODEC sur la Facture:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-control"
                        name="FODEC_sur_facture"
                        onChange={handleChange}
                        value={facture.FODEC_sur_facture ?? ""}
                      />
                      &nbsp;
                      <span>DT</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Observations:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="observations"
                      onChange={handleChange}
                      value={facture.observations ?? ""}
                    />
                  </div>
                </div>

                

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Timbre sur la Facture:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-control"
                        name="timbre_facture"
                        onChange={handleChange}
                        value={facture.timbre_facture ?? ""}
                      />
                      &nbsp;
                      <span>DT</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Autre montant sur la Facture:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-control"
                        name="autre_montant_facture"
                        onChange={handleChange}
                        value={facture.autre_montant_facture ?? ""}
                      />
                      &nbsp;
                      <span>DT</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Montant Total de la Facture:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-control"
                        name="montant_total_facture"
                        onChange={handleChange}
                        value={facture.montant_total_facture ?? ""}
                      />
                      &nbsp;
                      <span>DT</span>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Document / Fichier à Insérer :</label>
                    <input
                      type="file"
                      className="form-control"
                      name="document_fichier"
                      onChange={handleChange}
                    />
                    <br />
                    {facture.document_fichier && (
                      <img
                        src={facture.document_fichier}
                        alt="Facture Document"
                        style={{
                          width: "100px",
                          height: "auto",
                          cursor: "pointer",
                        }}
                        onClick={openImageViewer}
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label>Etat de paiement</label>
                    <div>
                      <input
                        type="checkbox"
                        name="etat_payement"
                        checked={facture.etat_payement === "payée" || facture.etat_payement === "payee" || facture.etat_payement === true}
                        onChange={handleChange}
                        value="payée"
                      />
                      <span
                        style={{
                          color: facture.etat_payement ? "green" : "red",
                          fontWeight: "bold",
                        }}
                      >
                        {(facture.etat_payement === "payée" || facture.etat_payement === "payee" || facture.etat_payement === true) ? " Payée" : " Non Payée"}
                      </span>
                    </div>
                  </div>

                 
                </div>
              </div>

              <div
                className="d-flex justify-content-center"
              >
                <button
                  type="submit"
                  className="btn btn-primary mr-2"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleCancel}
                >
                  Annuler
                </button>
              </div>
            </form>
            <TiersSaisie showModal={showModal} setShowModal={setShowModal} />

          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateFacture;



