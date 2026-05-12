import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import TiersSaisie from "../TiersSaisie";
import Swal from "sweetalert2";

const UpdateReglementRecu = ({isSidebarOpen}) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const initialReglementState = {
    tierId: "",
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
  const [banques, setBanques] = useState([]);

  const [showModal, setShowModal] = useState(false);

  const handleModalShow = () => setShowModal(true);


  useEffect(() => {
    const fetchReglement = async () => {
      if (!id) return; // Vérifiez si `id` est défini
  
      try {
        const response = await axios.get(`/api/reglements_recus/${id}`);
        const { data } = response;
  
        if (data) {
          // Vérifiez que les propriétés existent avant de les définir
          setReglement(data.reglement || {
            tierId: "",
            code_tiers: "",
            tiers_saisie: "",
            montant_total_a_regler: "",
            observations: "",
          });
  
          // Assurez-vous que les payements sont bien formatés
          const updatedPayements = data.payements ? data.payements.map(payement => ({
            modalite: payement.modalite || "",
            num: payement.num || "",
            banque: payement.banque || "",
            date_echeance: payement.date_echeance ? payement.date_echeance.split('T')[0] : "",
            montant: payement.montant || "",
          })) : [];
  
          setPayements(updatedPayements);
  
          // Assurez-vous que les factures sont bien formatées
          const updatedFactures = data.factures ? data.factures.map(facture => ({
            id: facture.id || "",
            num_facture: facture.num_facture || "",
            date_facture: facture.date_facture ? facture.date_facture.split('T')[0] : "",

            montant_total_facture: facture.montant_total_facture || "",
            document_fichier: facture.document_fichier || "",
          })) : [];
  
          setFactures(updatedFactures);
        } else {
          console.error("Aucune donnée reçue");
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du règlement :", error.message);
      }
    };
  
    fetchReglement();
  }, [id]);
  

  useEffect(() => {
    const fetchCodeTiers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/code_tiers", {
          headers: { Authorization: `Bearer ${token}` }
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
        const res = await axios.get("/api/num_facture");
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

    // Appeler fetchBanques si un tierId est déjà présent lors du montage
    useEffect(() => {
      if (reglement.tierId) {
        fetchBanques(reglement.tierId); // Récupérer les banques si tierId est déjà sélectionné
      }
    }, [reglement.tierId]); // Dépendance sur tierId pour récupérer les banques
  

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "tiers_saisie" && value !== "") setShowModal(true);

    setReglement((prevReglement) => {
      const updatedReglement = { ...prevReglement, [name]: value };

      if (name === "code_tiers") {
        const selectedTier = codeTiers.find((tier) => tier.code === value);
        if (selectedTier) {
          updatedReglement.tierId = selectedTier.id; // Assurez-vous de bien récupérer le tierId
          fetchBanques(selectedTier.id); // Récupérer les banques associées
        }
      }

      return updatedReglement;
    });
  };

  const handleChangePayement = (e, index) => {
    const { name, value } = e.target;
    setPayements((prevPayements) => {
      const updatedPayements = [...prevPayements];
      updatedPayements[index] = { ...updatedPayements[index], [name]: value };
      return updatedPayements;
    });
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
    try {
      const res = await axios.get(
        `/api/factures/${facture.value}`
      );
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      reglement,
      payements,
      factures,
    };

    try {
      const response = await axios.put(
        `/api/reglements_recus/${id}`,
        data
      );
      console.log(response.data.message);
      Swal.fire("Succès", "Règlement mis à jour avec succès", "success");
      navigate("/reglements_recus");
    } catch (error) {
      console.error("Error updating reglement:", error);
      Swal.fire(
        "Erreur",
        "Erreur lors de la mise à jour du règlement",
        "error"
      );    
    }
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
      <div className={`content-wrapper ${isSidebarOpen ? 'shifted' : ''}`}>
      <div className="card">
          <div className="card-body">
            <h2 className="text-center">Modifier un Règlement Reçu</h2>
            <br />
            <form className="forms-sample" onSubmit={handleSubmit}>
              {/* Factures */}
              <div>
                <h4>Factures</h4>
                {factures.map((facture, index) => (
                  <div key={index} className="mb-3 border p-3">
                    <legend>Facture {index + 1}</legend>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group mb-3">
                          <label>N° Facture à régler:</label>
                          <Select
                            options={factureOptions}
                            onChange={(value) =>
                              handleChangeFacture(value, index)
                            }
                            value={
                              factureOptions.find(
                                (option) =>
                                  option.value === (facture.num_facture || "")
                              ) || { value: "", label: "" }
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group mb-3">
                          <label>Date Facture:</label>
                          <input
                            type="date"
                            className="form-control"
                            name="date_facture"
                            value={facture.date_facture || ""}
                            onChange={(e) => handleChangeFacture(e, index)}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group mb-3">
                          <label>Montant Total Facture:</label>
                          <input
                            type="number"
                            className="form-control"
                            name="montant_total_facture"
                            value={facture.montant_total_facture || ""}
                            onChange={(e) => handleChangeFacture(e, index)}
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
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeFacture(index)}
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={addFacture}
                >
                  Ajouter Facture
                </button>
              </div>
              <hr />
              {/* Réglement */}
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
      tierId: option?.value || '', // Mettre à jour tierId
      code_tiers: codeTiers.find((tier) => tier.id === option?.value)?.code_tiers || '', // Mettre à jour code_tiers
    }));
    fetchBanques(option?.value || ''); // Récupérer les banques basées sur tierId sélectionné
  }}
  value={
    codeTiers.find((tier) => tier.id === reglement.tierId)
      ? {
          value: reglement.tierId,
          label: `${codeTiers.find((tier) => tier.id === reglement.tierId)?.code_tiers} - ${codeTiers.find((tier) => tier.id === reglement.tierId)?.identite}`,
        }
      : null
  }
/>


                  </div>
                </div>

                <div className="col-md-4">
                <div className="form-group">
                    <label>Tiers à ajouter :</label>
                    <input
                      type="text"
                      className="form-control"
                      name="tiers_saisie"
                      value={reglement.tiers_saisie}
                      onChange={handleChange}
                      onClick={handleModalShow}
                      disabled={!!reglement.code_tiers} // Désactiver le champ si un code_tiers est sélectionné
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Montant Total à Régler :</label>
                    <input
                      type="number"
                      name="montant_total_a_regler"
                      value={reglement.montant_total_a_regler}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Montant Total à Régler"
                    />
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
                      rows={2}
                      cols={20}
                      value={reglement.observations}
                    />
                  </div>
                </div>
              </div>
              <hr />
              <div>
                <h4>Paiements</h4>
                {payements.map((payement, index) => (
                  <div className="row" key={index}>
                    <div className="col-md-3">
                      <div className="form-group">
                        <label>Modalité:</label>
                        <select
                          style={{ color: "black" }}
                          value={payement.modalite}
                          name="modalite"
                          className="form-control"
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
                          className="form-control"
                          onChange={(e) => handleChangePayement(e, index)}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                    <div className="form-group">
  <label>Banque :</label>
  <select
  style={{ color: "black" }}
  value={payement.banque}
  name="banque"
  className="form-control mr-3"
  onChange={(e) => handleChangePayement(e, index)} // S'assurer que handleChangePayement est utilisé ici
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
                        <label>Date d'échéance:</label>
                        <input
                          type="date"
                          value={payement.date_echeance}
                          name="date_echeance"
                          className="form-control"
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
                          className="form-control"
                          onChange={(e) => handleChangePayement(e, index)}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removePayement(index)}
                      >
                        Supprimer
                      </button>
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

              {/* Boutons Enregistrer/Annuler */}
              <div
                className="d-flex justify-content-center"
              >
                <button
                  type="submit"
                  className="btn btn-primary mr-2"
                >
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

export default UpdateReglementRecu;
