import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../Connexion/UserProvider";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import Swal from "sweetalert2";
import TiersSaisie from "../TiersSaisie";

const AddVersement = ({ isSidebarOpen }) => {
  const initialVersementState = {
    date_versement: "",
    reference_bordereau_bulletin: "",
    observations: "",
    document_fichier: "",
  };

  const initialPayementState = {
    modalite: "",
    num: "",
    banque: "",
    montant: "",
    code_tiers: "",
    tiers_saisie: "",
  };
  const { user } = useContext(UserContext);

  const [versement, setVersement] = useState(initialVersementState);
  const [payements, setPayements] = useState([initialPayementState]);

  const [codeTiers, setCodeTiers] = useState([]);
  const [banques, setBanques] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const handleModalShow = () => setShowModal(true);

  const navigate = useNavigate();

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { versement, payements };
    const token = localStorage.getItem("token");

    axios
        .post("/api/versement", data, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          console.log(response.data);
          setVersement(initialVersementState);
          setPayements([initialPayementState]);
          console.log('payements:', payements);
          console.log('Array.isArray(payements):', Array.isArray(payements));

          // Notification si l'utilisateur est un comptable
          if (user.role === "comptable") {
            const notificationMessage = `${user.identite} a ajouté un nouveau versement`;

            const notificationData = {
              userId: user.id,
              message: notificationMessage,
            };

            axios.post("/api/notifications", notificationData);
          }

          Swal.fire({
            icon: "success",
            title: "Succès",
            text: "Versement ajouté avec succès.",
          });
          navigate("/versements");
        })
        .catch((error) => {
          console.error("Erreur lors de l'ajout du versement :", error);
          if (error.response) {
            console.error("Contenu de la réponse :", error.response.data);
          } else {
            console.error("Aucune réponse reçue.");
          }
          Swal.fire({
            icon: "error",
            title: "Erreur",
            text: "Une erreur est survenue lors de l'ajout du versement.",
          });

        });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "document_fichier" && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1];
        const url = `data:image/png;base64,${base64Data}`;
        setVersement((prev) => ({ ...prev, document_fichier: url }));
      };
      reader.readAsDataURL(e.target.files[0]);
    } else {
      setVersement((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleChangePayement = (e, index) => {
    const { name, value } = e.target;

    if (name === "code_tiers") fetchBanques(value);

    setPayements((prevPayements) => {
      // Assurez-vous que prevPayements est bien un tableau
      if (!Array.isArray(prevPayements)) return prevPayements;

      const updatedPayements = [...prevPayements];
      updatedPayements[index][name] = value;
      return updatedPayements;
    });

    if (name === "tiers_saisie" && value === "") {
      setShowModal(true);
    }
  };



  const addPayement = () => {
    setPayements([
      ...payements,
      {
        modalite: "",
        num: "",
        code_tiers: "",
        tiers_saisie: "",
        banque: "",
        montant: "",
      },
    ]);
  };

  const removePayement = (index) => {
    const updatedPayements = [...payements];
    updatedPayements.splice(index, 1);
    setPayements(updatedPayements);
  };

  const handleCancel = () => {
    navigate("/versements");
  };

  return (
      <div className="main-panel">
        <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="card">
            <div className="card-body">
              <h2 className="text-center">Ajouter un versement</h2>
              <br />
              <form onSubmit={handleSubmit} className="forms-sample">
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Date de versement :</label>
                      <input
                          type="date"
                          className="form-control"
                          name="date_versement"
                          value={versement.date_versement}
                          onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Référence du bordereau ou bulletin :</label>
                      <input
                          type="text"
                          name="reference_bordereau_bulletin"
                          className="form-control"
                          value={versement.reference_bordereau_bulletin}
                          onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Document / Fichier à Insérer :</label>
                      <input
                          type="file"
                          className="form-control"
                          name="document_fichier"
                          onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Observations :</label>
                      <textarea
                          value={versement.observations}
                          className="form-control"
                          name="observations"
                          placeholder="Entrez vos observations ici..."
                          onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <hr />
                <div>
                  <h3>Paiements</h3>
                  <br />
                  {Array.isArray(payements) && payements.map((payement, index) => (
                      <div key={index} className="mb-3 border p-3">
                        <div className="row">
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Nature:</label>
                              <select
                                  style={{ color: "black" }}
                                  value={payement.modalite}
                                  name="modalite"
                                  className="form-control"
                                  onChange={(e) => handleChangePayement(e, index)}
                              >
                                <option value="">Sélectionnez une option</option>
                                <option value="Espèces">Espèces</option>
                                <option value="Chèque">Chèque</option>
                                <option value="Effet à l'encaissement">
                                  Effet à l'encaissement{" "}
                                </option>
                                <option value="Effet à l'escompte">
                                  Effet à l'escompte{" "}
                                </option>
                                <option value="CB">CB</option>
                                <option value="Virement">Virement</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>N°:</label>
                              <input
                                  type="text"
                                  value={payement.num}
                                  name="num"
                                  className="form-control"
                                  onChange={(e) => handleChangePayement(e, index)}
                              />
                            </div>
                          </div>


                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Code tiers :</label>
                              <Select
                                  options={codeTiers.map((tier) => ({
                                    value: tier.id,
                                    label: `${tier.code_tiers} - ${tier.identite}`,
                                  }))}
                                  onChange={(option) => {
                                    setPayements((prevPayements) => {
                                      const updatedPayements = [...prevPayements];
                                      updatedPayements[index] = {
                                        ...updatedPayements[index],
                                        tierId: option?.value || "", // Stocker l'ID du tiers dans tierId
                                        code_tiers:
                                            codeTiers.find((tier) => tier.id === option?.value)?.code_tiers || "", // Stocker le code du tiers dans code_tiers
                                      };
                                      fetchBanques(option?.value || ""); // Met à jour les banques en fonction du tiers sélectionné
                                      return updatedPayements;
                                    });
                                  }}
                                  value={
                                    codeTiers.find((tier) => tier.id === payement.tierId)
                                        ? {
                                          value: payement.tierId,
                                          label: `${
                                              codeTiers.find((tier) => tier.id === payement.tierId).code_tiers
                                          } - ${
                                              codeTiers.find((tier) => tier.id === payement.tierId).identite
                                          }`,
                                        }
                                        : null
                                  }
                              />
                            </div>
                          </div>


                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Tiers à Saisir:</label>
                              <input
                                  type="text"
                                  className="form-control mr-3"
                                  name="tiers_saisie"
                                  onChange={(e) => handleChangePayement(e, index)}
                                  value={payement.tiers_saisie}
                                  onClick={handleModalShow}
                                  disabled={!!payement.code_tiers}
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
                              <label>Montant Verse:</label>
                              <input
                                  type="number"
                                  value={payement.montant}
                                  name="montant"
                                  className="form-control"
                                  onChange={(e) => handleChangePayement(e, index)}
                              />
                            </div>
                          </div>

                          <div className="col-md-3">
                            <br></br>
                            <br></br>
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => removePayement(index)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                  ))}
                  <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={addPayement}
                  >
                    Ajouter Paiement
                  </button>
                </div>
                <hr />
                <br></br>
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

export default AddVersement;
