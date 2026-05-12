import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TiersSaisie from "../TiersSaisie";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider";

const AddFacture = ({ isSidebarOpen }) => {
  const initialFactureState = {
    date_facture: "",
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
    etat_payement: false,
  };

  const [facture, setFacture] = useState(initialFactureState);
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [codeTiers, setCodeTiers] = useState([]);
  const [refLivraisons, setRefLivraisons] = useState([]);
  const { user } = useContext(UserContext);


  const navigate = useNavigate();

  // Fonction pour utiliser Azure Form Recognizer pour extraire les informations d'une facture
  const handleAzureFormRecognizer = async () => {
    if (!file) {
      Swal.fire("Avertissement", "Veuillez télécharger un fichier.", "warning");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiKey = "53fa9f341277462ab1327e5037165f93";
      const endpoint =
          "https://form-recognizer-service.cognitiveservices.azure.com";
      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "multipart/form-data",
        },
      };

      const analyzeResponse = await axios.post(
          `${endpoint}/formrecognizer/v2.1/prebuilt/invoice/analyze`,
          formData,
          config
      );

      const operationLocation = analyzeResponse.headers["operation-location"];

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      let resultResponse;
      let status = "running";

      while (status === "running" || status === "notStarted") {
        resultResponse = await axios.get(operationLocation, config);
        status = resultResponse.data.status;

        if (status === "succeeded") {
          const fields =
              resultResponse.data.analyzeResult.documentResults[0].fields;

          // Extraction des champs avec les données appropriées
          const montantHT =
              fields.SubTotal?.text || fields["Total HT"]?.text || "";
          const tva = fields.TotalTax?.text || fields["Total TVA"]?.text || "";
          const timbre = fields.Timbre?.text || fields["Timbre"]?.text || "";
          const fodec = fields.Fodec?.text || fields["FODEC"]?.text || "";
          const montantTotal =
              fields.InvoiceTotal?.text ||
              fields["Net A Payer"]?.text ||
              fields["Total TTC"]?.text ||
              "";

          // Mettre à jour les champs de la facture avec les valeurs extraites
          setFacture({
            ...facture,
            date_facture: fields.InvoiceDate?.valueDate || "",
            num_facture: fields.InvoiceId?.valueString || "",
            montant_HT_facture: montantHT,
            TVA_facture: tva,
            FODEC_sur_facture: fodec,
            timbre_facture: timbre,
            montant_total_facture: montantTotal,
          });

          console.log("Données extraites :", fields);

          Swal.fire(
              "Succès",
              "Les données de la facture ont été extraites avec succès !",
              "success"
          );
          break;
        }

        await delay(2000);
      }

      if (status !== "succeeded") {
        Swal.fire("Erreur", "L'analyse de la facture a échoué.", "error");
      }
    } catch (error) {
      console.error("Erreur lors de l'analyse de la facture :", error);
      Swal.fire(
          "Erreur",
          "Impossible d'extraire les données de la facture.",
          "error"
      );
    }
  };


  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1]; // Extraction des données en base64
        setFacture((prev) => ({
          ...prev,
          document_fichier: base64Data,
        }));
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFacture((prev) => ({ ...prev, document_fichier: "" }));
    }
  };



  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFacture((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "document_fichier" && e.target.files.length > 0) {
      handleFileChange(e); // Appel à la fonction handleFileChange pour gérer le fichier
    }else {
      setFacture((prev) => ({ ...prev, [name]: value || "" }));
    }

    if (name === "tiers_saisie" && value !== "") {
      setShowModal(true);
    }

    // Validation du champ modifié
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value || ""),
    }));
  };


  const handleModalShow = () => setShowModal(true);

  const validateField = (name, value) => {
    switch (name) {
      case "date_facture":
        if (!value) return "La date de la facture est obligatoire.";
        break;
      case "num_facture":
        if (!value) return "Le numéro de la facture est obligatoire.";
        break;
      case "montant_total_facture":
        if (!value) return "Le montant total de la facture est obligatoire.";
        break;
      case "document_fichier":
        if (!value) return "Document de la facture est obligatoire.";
        break;
      default:
        return null;
    }
  };

  const validateAllFields = () => {
    const newErrors = {};
    Object.keys(facture).forEach((key) => {
      const error = validateField(key, facture[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      Swal.fire("Avertissement", "Veuillez télécharger un fichier.", "warning");
      return;
    }

    if (validateAllFields()) {
      const formData = new FormData();
      formData.append('facture', JSON.stringify(facture));

      console.log("FormData avant envoi :", formData);


      try {
        // Envoi de la facture
        const token = localStorage.getItem("token");
        const response = await axios.post("/api/facture", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",

          },
        });
        console.log("Réponse du serveur :", response.data);

        // Réinitialiser le formulaire
        setFacture(initialFactureState);

        const notificationMessage = `${user.identite} a ajouté une nouvelle facture`;

        if (user.role === "comptable") {
          // Notification data structure
          const notificationData = {
            userId: user.id,
            message: notificationMessage,
          };

          // Envoi de la notification
          await axios.post("/api/notifications", notificationData);
        }

        // Afficher le message de succès
        Swal.fire({
          icon: "success",
          title: "Succès",
          text: "Facture ajoutée avec succès!",
        });

        // Redirection après succès
        navigate("/facturations");
      } catch (error) {
        console.error("Erreur lors de l'ajout de la facture :", error);

        Swal.fire({
          icon: "error",
          title: "Erreur",
          text: "Erreur lors de l'ajout de la facture. Veuillez réessayer.",
        });
      }
    } else {
      Swal.fire({
        icon: "warning",
        title: "Erreur",
        text: "Veuillez corriger les erreurs dans le formulaire.",
      });
    }
  };




  useEffect(() => {
    const fetchCodeTiers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/code_tiers", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setCodeTiers(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchCodeTiers();
  }, []);

  useEffect(() => {
    const fetchRefLivraison = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
            "/api/reference_livraison", {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
        setRefLivraisons(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchRefLivraison();
  }, []);

  const handleCancel = () => {
    navigate("/facturations");
  };

  return (
      <div className="main-panel">
        <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="card">
            <div className="card-body">
              <h1 className="text-center">Ajouter une facture</h1>
              <br />
              <form
                  className="forms-sample"
                  onSubmit={handleSubmit}
              >
                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Date de la Facture:</label>
                      <input
                          type="date"
                          className="form-control"
                          name="date_facture"
                          onChange={handleChange}
                          value={facture.date_facture || ""}
                      />

                      {errors.date_facture && (
                          <span className="text-danger">{errors.date_facture}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>N° de la Facture:</label>
                      <input
                          type="text"
                          className="form-control"
                          name="num_facture"
                          onChange={handleChange}
                          value={facture.num_facture || ""}
                          placeholder="N° de la Facture"
                      />

                      {errors.num_facture && (
                          <span className="text-danger">{errors.num_facture}</span>
                      )}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Code Tiers:</label>
                      <select
                          style={{ color: "black" }}
                          className="form-control"
                          name="code_tiers"
                          onChange={handleChange}
                          value={facture.code_tiers || ""}
                      >
                        <option value="" style={{ color: "black" }}>
                          Sélectionner le Code Tiers
                        </option>
                        {codeTiers.map((tier) => (
                            <option key={tier.code_tiers} value={tier.code_tiers}>
                              {`${tier.code_tiers} - ${tier.identite}`}
                            </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Référence de la Livraison:</label>
                      <select
                          style={{ color: "black" }}
                          className="form-control"
                          name="reference_livraison"
                          onChange={handleChange}
                          value={facture.reference_livraison || ""}
                      >
                        <option value="" style={{ color: "black" }}>
                          Référence Livraison
                        </option>
                        {refLivraisons.map((refLivraison) => (
                            <option
                                key={refLivraison.num_BL}
                                value={refLivraison.num_BL}
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
                      <label>Tier à ajouter:</label>
                      <input
                          type="text"
                          className="form-control"
                          name="tiers_saisie"
                          onChange={handleChange}
                          onClick={handleModalShow}
                          value={facture.tiers_saisie || ""}
                          disabled={!!facture.code_tiers}
                      />
                    </div>
                    <div className="form-group">
                      <label>TVA de la Facture:</label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                            type="text"
                            className="form-control"
                            name="TVA_facture"
                            value={facture.TVA_facture || ""}
                            onChange={handleChange}
                            placeholder="TVA de la Facture"
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
                            value={facture.montant_HT_facture || ""}
                            onChange={handleChange}
                            placeholder="Montant HT de la Facture"
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
                            value={facture.FODEC_sur_facture || ""}
                            onChange={handleChange}
                            placeholder="FODEC sur la Facture"
                        />
                        &nbsp;
                        <span>DT</span>
                      </div>
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
                            value={facture.timbre_facture || ""}
                            onChange={handleChange}
                            placeholder="Timbre sur la Facture"
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
                            value={facture.montant_total_facture || ""}
                            onChange={handleChange}
                            placeholder="Montant Total de la Facture"
                        />
                        &nbsp;
                        <span>DT</span>
                      </div>
                      {errors.montant_total_facture && (
                          <span className="text-danger">
                        {errors.montant_total_facture}
                      </span>
                      )}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Autre montant sur la Facture:</label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                            type="text"
                            className="form-control"
                            name="autre_montant_facture"
                            value={facture.autre_montant_facture || ""}
                            onChange={handleChange}
                            placeholder="Autre montant sur la Facture"
                        />
                        &nbsp;
                        <span>DT</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Observations:</label>
                      <input
                          className="form-control"
                          name="observations"
                          value={facture.observations || ""}
                          onChange={handleChange}
                          placeholder="Entrez vos observations ici..."
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Document / Fichier à Insérer :</label>
                      <input
                          type="file"
                          className="form-control"
                          name="document_fichier"
                          onChange={handleFileChange}
                      />
                      {errors.document_fichier && (
                          <span className="text-danger">
      {errors.document_fichier}
    </span>
                      )}
                      <button
                          type="button"
                          className="btn btn-link"
                          onClick={handleAzureFormRecognizer} // Analyse avec Azure Form Recognizer
                      >
                        Analyser Facture avec IA
                      </button>
                    </div>

                  </div>

                  <div className="col-md-4 mt-4">
                    <div className="form-group">
                      <label>Etat de paiement</label>
                      <div>
                        <input
                            type="checkbox"
                            name="etat_payement"
                            value={facture.etat_payement || ""}
                            checked={facture.etat_payement}
                            onChange={handleChange}
                        />
                        <span
                            style={{
                              color: facture.etat_payement ? "green" : "red",
                              fontWeight: "bold",
                            }}
                        >
                        {facture.etat_payement ? " Payée" : " Non Payée"}
                      </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-center">
                  <button type="submit" className="btn btn-primary mr-2">
                    Enregistrer
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

export default AddFacture;
