import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import "react-toastify/dist/ReactToastify.css";
import TiersSaisie from "../TiersSaisie";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider";

const AddReglementRecu = ({ isSidebarOpen }) => {
  const { user } = useContext(UserContext);

  const initialReglementState = {
    code_tiers: "",
    tiers_saisie: "",
    montant_total_a_regler: "",
    observations: "",
  };

  const initialPayementState = {
    modalite: "",
    num: "",
    banque: "",
    date_echeance: "",
    montant: "",
  };

  const initialFactureState = {
    num_facture: "",
    date_facture: "",
    montant_total_facture: "",
    document_fichier: "",
  };

  const [reglement, setReglement] = useState(initialReglementState);
  const [payements, setPayements] = useState([initialPayementState]);
  const [factures, setFactures] = useState([initialFactureState]);
  const [codeTiers, setCodeTiers] = useState([]);
  const [factureOptions, setFactureOptions] = useState([]);
  const [loadingFacture, setLoadingFacture] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const handleModalShow = () => setShowModal(true);
  const [banques, setBanques] = useState([]);


  const navigate = useNavigate();

  const fetchBanques = async (tierId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `/api/tiers/${tierId}/banques`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBanques(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des banques:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      reglement: {
        code_tiers: reglement.code_tiers,
        tiers_saisie: reglement.tiers_saisie,
        montant_total_a_regler: reglement.montant_total_a_regler,
        observations: reglement.observations,
      },
      payements,
      factures,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "/api/reglements_recus",
        data, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      console.log(response.data.message);
      // Reset des données après succès
      setReglement(initialReglementState);
      setPayements([initialPayementState]);
      setFactures([initialFactureState]);
      // Notification si l'utilisateur est un comptable
      if (user.role === "comptable") {
        const notificationMessage = `${user.identite} a ajouté un nouveau règlement reçu`;
  
        const notificationData = {
          userId: user.id,
          message: notificationMessage,
        };
  
        await axios.post("/api/notifications", notificationData);
      }
      Swal.fire({
        icon: "success",
        title: "Succès",
        text: "Règlement reçu ajouté avec succès.",
      });
      navigate("/reglements_recus");
    } catch (error) {
      console.error("Erreur lors de l'ajout du règlement :", error);
      if (error.response) {
        console.error("Contenu de la réponse :", error.response.data);
      } else {
        console.error("Aucune réponse reçue.");
      }
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Règlement reçu n'est pas ajouté avec succès.",
      });
    }
  };

  useEffect(() => {
    const fetchCodeTiers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/code_tiers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCodeTiers(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchCodeTiers();
  }, []);

  useEffect(() => {
    const fetchFactures = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/num_facture", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const options = res.data.map((num_facture) => ({
          value: num_facture,
          label: num_facture,
        }));
        setFactureOptions(options);
      } catch (err) {
        console.error("Error fetching factures:", err);
      }
    };
    fetchFactures();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code_tiers") fetchBanques(value);

      setReglement({ ...reglement, [name]: value });
      // Show modal when tiers_saisie is entered
    if (name === "tiers_saisie" && value === "") {
      setShowModal(true);
    }
  };

  const handleChangePayement = (e, index) => {
    const { name, value } = e.target;
    const updatedPayements = [...payements];
    updatedPayements[index][name] = value;
    setPayements(updatedPayements);
  };

  const addPayement = () => {
    setPayements([
      ...payements,
      {
        modalite: "",
        num: "",
        banque: "",
        date_echeance: "",
        montant: "",
      },
    ]);
  };

  const removePayement = (index) => {
    const updatedPayements = [...payements];
    updatedPayements.splice(index, 1);
    setPayements(updatedPayements);
  };

  const handleChangeFacture = async (facture, index) => {
    setLoadingFacture(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `/api/factures/${facture.value}`
        , {
          headers: { Authorization: `Bearer ${token}` },
        });
      const { id, date_facture, montant_total_facture, document_fichier } =
        res.data;
      const updatedFactures = [...factures];
      updatedFactures[index] = {
        id: id,
        num_facture: facture.value,
        date_facture,
        montant_total_facture,
        document_fichier,
      };
      setFactures(updatedFactures);
    } catch (err) {
      console.error("Error fetching facture data:", err);
    } finally {
      setLoadingFacture(false);
    }
  };

  const addFacture = () => {
    setFactures([...factures, initialFactureState]);
  };

  const removeFacture = (index) => {
    const updatedFactures = [...factures];
    updatedFactures.splice(index, 1);
    setFactures(updatedFactures);
  };

  const handleCancel = () => {
    navigate("/reglements_recus");
  };

  const openImageViewer = (documentUrl) => {
    const imageWindow = window.open("", "_blank");
    const img = document.createElement("img");
    img.src = documentUrl;
    img.style.width = "30%";
    img.style.height = "100%";
    img.style.marginLeft = "400px";
    imageWindow.document.body.appendChild(img);
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="card">
          <div className="card-body">
            <h2 className="text-center">Ajouter un règlement reçu</h2>
            <br />
            <form className="forms-sample" onSubmit={handleSubmit}>
              <br></br>

              {factures.map((facture, index) => (
                <div key={index} className="mb-3 border p-3">
                  <legend>Facture à régler {index + 1}</legend>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label>N° Facture à régler:</label>
                        <Select
                          options={factureOptions}
                          onChange={(value) =>
                            handleChangeFacture(value, index)
                          }
                          value={factureOptions.find(
                            (option) => option.value === facture.num_facture
                          )}
                        />
                      </div>
                    </div>
                    {loadingFacture ? (
                      <p>Loading facture data...</p>
                    ) : (
                      <>
                        <div className="col-md-6">
                          <div className="form-group mb-3">
                            <label>Dates Facture à régler:</label>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              name="date_facture"
                              value={
                                facture.date_facture
                                  ? facture.date_facture.split("T")[0]
                                  : ""
                              }
                              readOnly
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-group mb-3">
                            <label>Montants Facture à régler:</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              name="montant_total_facture"
                              value={facture.montant_total_facture}
                              readOnly
                            />
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="form-group mb-3">
                            <label>Document / Fichier à Insérer :</label>
                            <br />
                            <button
                              type="button"
                              className="btn btn-link"
                              onClick={() =>
                                openImageViewer(facture.document_fichier)
                              }
                            >
                              View Document
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="col-md-4">
                      <div className="form-group d-flex align-items-end mt-3">
                        <button
                          onClick={() => removeFacture(index)}
                          type="button"
                          className="btn btn-danger btn-sm me-2"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                        &nbsp;
                        {index === factures.length - 1 && (
                          <button
                            onClick={addFacture}
                            type="button"
                            className="btn btn-success btn-sm"
                          >
                            <i className="bi bi-plus-circle"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <br></br>
              <hr />

              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Code tiers :</label>
                    <Select
                      options={codeTiers.map((tier) => ({
                        value: tier.id,
                        label: `${tier.code_tiers} - ${tier.identite}`,
                      }))}
                      onChange={(option) => {
                        setReglement((prevState) => ({
                          ...prevState,
                          tierId: option?.value || "", // Stocker l'ID du tiers dans tierId
                          code_tiers:
                            codeTiers.find((tier) => tier.id === option?.value)
                              ?.code_tiers || "", // Stocker le code du tiers dans code_tiers
                        }));
                        fetchBanques(option?.value || "");
                      }}
                      value={
                        codeTiers.find((tier) => tier.id === reglement.tierId)
                          ? {
                              value: reglement.tierId,
                              label: `${
                                codeTiers.find(
                                  (tier) => tier.id === reglement.tierId
                                ).code_tiers
                              } - ${
                                codeTiers.find(
                                  (tier) => tier.id === reglement.tierId
                                ).identite
                              }`,
                            }
                          : null
                      }
                    />
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
                      value={reglement.tiers_saisie}
                      onClick={handleModalShow}
                      disabled={!!reglement.code_tiers}

                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Montant Total à Régler :</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        name="montant_total_a_regler"
                        value={reglement.montant_total_a_regler}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="Montant Total à Régler"
                      />

                      <span style={{ fontSize: "17px", marginLeft: "5px" }}>
                        DT
                      </span>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Observations:</label>
                    <textarea
                      className="form-control"
                      name="observations"
                      onChange={handleChange}
                      placeholder="Entrez vos observations ici..."
                      value={reglement.observations}
                    />
                  </div>
                </div>
              </div>
              <hr />
              <br></br>
              <legend>Paiements :</legend>
              {payements.map((payement, index) => (
                <div className="row" key={index}>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Nature:</label>
                      <select
                        style={{ color: "black" }}
                        value={payement.modalite}
                        name="modalite"
                        className="form-control mr-3"
                        onChange={(e) => handleChangePayement(e, index)}
                      >
                        <option value="">Sélectionnez une option</option>
                        <option value="Chèque">Chèque</option>
                        <option value="Effet">Effet</option>
                        <option value="CB">CB</option>
                        <option value="Virement">Virement</option>
                        <option value="Retrait de fonds">
                          Retrait de fonds
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Numéro:</label>
                      <input
                        type="text"
                        value={payement.num}
                        name="num"
                        className="form-control mr-3"
                        onChange={(e) => handleChangePayement(e, index)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Banque:</label>
                      <select
                        style={{ color: "black" }}
                        value={payement.banque}
                        name="banque"
                        className="form-control mr-3"
                        onChange={(e) => handleChangePayement(e, index)}
                      >
                        <option value="">Sélectionnez une banque</option>
                        {banques.map((banque) => (
                          <option key={banque.id} value={banque.name}>
                            {banque.name}
                          </option>
                        ))}{" "}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Date d'échéance:</label>
                      <input
                        type="date"
                        value={payement.date_echeance}
                        name="date_echeance"
                        className="form-control mr-3"
                        onChange={(e) => handleChangePayement(e, index)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Montant:</label>
                      <input
                        type="number"
                        value={payement.montant}
                        name="montant"
                        className="form-control mr-3"
                        onChange={(e) => handleChangePayement(e, index)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3" style={{ marginTop: "30px" }}>
                    <button
                      onClick={() => removePayement(index)}
                      type="button"
                      className="btn btn-danger btn-sm"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                    &nbsp;
                    {index === payements.length - 1 && (
                      <button
                        onClick={addPayement}
                        type="button"
                        className="btn btn-success btn-sm"
                      >
                        <i className="bi bi-plus-circle"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <br></br>
              <div className="d-flex justify-content-center">
                <button type="submit" className="btn btn-primary mr-2">
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

export default AddReglementRecu;
