import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import Select from "react-select";
import TiersSaisie from "../TiersSaisie";

const UpdateVersement = ({ isSidebarOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [versement, setVersement] = useState({
    date_versement: "",
    reference_bordereau_bulletin: "",
    observations: "",
    document_fichier: "",
  });

  const [payements, setPayements] = useState([
    {
      modalite: "",
      num: "",
      banque: "",
      montant: "",
      code_tiers: "",
      tierId: "",
      tiers_saisie: "",
    },
  ]);

  const [codeTiers, setCodeTiers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [banques, setBanques] = useState([]);

  const handleModalShow = () => setShowModal(true);

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
        console.error(err);
      }
    };
    fetchCodeTiers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `/api/versement/${id}`
        );
        const { data } = response;

        setVersement({
          date_versement: data.versement?.date_versement
            ? data.versement.date_versement.split("T")[0]
            : "",
          reference_bordereau_bulletin:
            data.versement?.reference_bordereau_bulletin || "",
          observations: data.versement?.observations || "",
          document_fichier: data.versement?.document_fichier || "",
        });

        const retrievedPayements = Array.isArray(data.payements)
          ? data.payements
          : [];
        setPayements(
          retrievedPayements.map((payement) => ({
            modalite: payement.modalite || "",
            num: payement.num || "",
            banque: payement.banque || "",
            montant: payement.montant || "",
            code_tiers: payement.code_tiers || "",
            tierId: payement.tierId || "",
            tiers_saisie: payement.tiers_saisie || "",
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [id]);

  const fetchBanques = async (tierId) => {
    try {
      const response = await axios.get(
        `/api/tiers/${tierId}/banques`
      );
      setBanques(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des banques:", error);
    }
  };

  useEffect(() => {
    payements.forEach((payement) => {
      if (payement.tierId) {
        fetchBanques(payement.tierId);
      }
    });
  }, [payements]);

  const handleCancel = () => {
    navigate("/versements");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      versement,
      payements,
    };

    try {
      await axios.put(`/api/versement/${id}`, data);
      Swal.fire("Succès", "Données mises à jour avec succès.", "success");
      navigate("/versements");
    } catch (error) {
      console.error("Error updating versement:", error);
      Swal.fire(
        "Erreur",
        "Erreur lors de la mise à jour du versement",
        "error"
      );
    }
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
    const updatedPayements = [...payements];
    updatedPayements[index][name] = value;
    setPayements(updatedPayements);

    if (name === "tiers_saisie" && value !== "") setShowModal(true);

    if (name === "code_tiers") {
      const selectedTier = codeTiers.find((tier) => tier.code_tiers === value);
      if (selectedTier) {
        updatedPayements[index].tierId = selectedTier.id; // Update tierId for the specific payment
        fetchBanques(selectedTier.id); // Fetch banks immediately
      } else {
        updatedPayements[index].tierId = ""; // Reset tierId if no selection
        setBanques([]); // Clear banks if tier is not selected
      }
    }

    setPayements(updatedPayements);
  };

  const addPayement = () => {
    setPayements((prev) => [
      ...prev,
      {
        modalite: "",
        num: "",
        banque: "",
        montant: "",
        code_tiers: "",
        tierId: "",
        tiers_saisie: "",
      },
    ]);
  };

  const removePayement = (index) => {
    const updatedPayements = [...payements];
    updatedPayements.splice(index, 1);
    setPayements(updatedPayements);
  };

  const openImageViewer = (documentUrl) => {
    const imageWindow = window.open("", "_blank");
    const img = document.createElement("img");
    img.src = documentUrl;
    img.style.width = "40%";
    img.style.height = "100%";
    img.style.marginLeft = "350px";
    imageWindow.document.body.appendChild(img);
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="card">
          <div className="card-body">
            <h2 className="text-center">Modifier un Versement</h2>
            <form className="forms-sample" onSubmit={handleSubmit}>
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
                    <label>Document / Fichier à Insérer :</label>
                    <input
                      type="file"
                      className="form-control"
                      name="document_fichier"
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() =>
                        openImageViewer(versement.document_fichier)
                      }
                    >
                      Voir Document
                    </button>
                  </div>
                </div>

                <div className="col-md-6">
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
                {payements.map((payement, index) => (
                  <div key={index} className="mb-3 border p-3">
                    <div className="row">
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Nature:</label>
                          <select
                            value={payement.modalite}
                            name="modalite"
                            style={{ color: "black" }}
                            className="form-control"
                            onChange={(e) => handleChangePayement(e, index)}
                          >
                            <option value="">Sélectionnez une option</option>
                            <option value="Espèces">Espèces</option>
                            <option value="Chèque">Chèque</option>
                            <option value="Effet à l'encaissement">
                              Effet à l'encaissement
                            </option>
                            <option value="Effet à l'escompte">
                              Effet à l'escompte
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
                          <label>Code Tiers:</label>
                          <Select
                            options={codeTiers.map((tier) => ({
                              value: tier.id,
                              label: `${tier.code_tiers} - ${tier.identite}`,
                            }))}
                            onChange={(option) => {
                              const updatedPayements = [...payements];
                              updatedPayements[index].tierId =
                                option?.value || ""; // Update tierId
                              updatedPayements[index].code_tiers =
                                codeTiers.find(
                                  (tier) => tier.id === option?.value
                                )?.code_tiers || ""; // Update code_tiers
                              setPayements(updatedPayements);
                              fetchBanques(option?.value || ""); // Fetch banks based on selected tierId
                            }}
                            value={
                              codeTiers.find(
                                (tier) => tier.id === payement.tierId
                              )
                                ? {
                                    value: payement.tierId,
                                    label: `${
                                      codeTiers.find(
                                        (tier) => tier.id === payement.tierId
                                      ).code_tiers
                                    } - ${
                                      codeTiers.find(
                                        (tier) => tier.id === payement.tierId
                                      ).identite
                                    }`,
                                  }
                                : null
                            }
                          />
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Tiers à ajouter :</label>
                          <input
                            type="text"
                            className="form-control"
                            name="tiers_saisie"
                            value={payement.tiers_saisie}
                            onChange={(e) => handleChangePayement(e, index)}
                            onClick={handleModalShow}
                            disabled={!!payement.code_tiers}
                          />
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Banque :</label>
                          <select
                            value={payement.banque}
                            name="banque"
                            style={{ color: "black" }}
                            className="form-control"
                            onChange={(e) => handleChangePayement(e, index)}
                          >
                            <option value="">Sélectionnez une option</option>
                            {banques.length > 0 ? (
                              banques.map((banque) => (
                                <option key={banque.id} value={banque.name}>
                                  {banque.name}
                                </option>
                              ))
                            ) : (
                              <option disabled>Aucune banque disponible</option>
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Montant Verse:</label>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <input
                              type="number"
                              value={payement.montant}
                              name="montant"
                              className="form-control"
                              onChange={(e) => handleChangePayement(e, index)}
                            />
                            &nbsp;
                            <span>DT</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <br />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm mt-4"
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

              <br />
              <div className="d-flex justify-content-center">
                <button type="submit" className="btn btn-primary mr-2">
                  Modifier
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

export default UpdateVersement;
