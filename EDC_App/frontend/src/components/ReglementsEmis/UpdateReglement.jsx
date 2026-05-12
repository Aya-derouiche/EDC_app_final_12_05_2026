import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";
import TiersSaisie from "../TiersSaisie";

const UpdateReglement = ({ isSidebarOpen }) => {
  const { id } = useParams();

  const initialReglementState = {
    date_saisie: "",
    tierId: "",
    code_tiers: "",
    tiers_saisie: "",
    montant_brut: "",
    base_retenue_source: "",
    taux_retenue_source: "",
    montant_retenue_source: "",
    montant_net: "",
    observations: "",
  };

  const initialPayementState = useMemo(
      () => ({
        modalite: "",
        num: "",
        banque: "",
        date_echeance: "",
        montant: "",
      }),
      []
  );

  const initialPieceState = useMemo(
      () => ({
        num_piece_a_regler: "",
        date_piece_a_regler: "",
        montant_piece_a_regler: "",
        montant_restant: "",
        document_fichier: "",
      }),
      []
  );

  const [reglement, setReglement] = useState(initialReglementState);
  const [payements, setPayements] = useState([initialPayementState]);
  const [pieces, setPieces] = useState([initialPieceState]);
  const [codeTiers, setCodeTiers] = useState([]);
  const [taux, setTaux] = useState([]);
  const [banques, setBanques] = useState([]);
  const [activeTab, setActiveTab] = useState("pieces");
  const [options, setOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const handleModalShow = () => setShowModal(true);

  // Fetch reglement data from the server
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
            `/api/reglements_emis/${id}`
        );
        const { reglement, payements, pieces } = response.data;

        setReglement({
          date_saisie: reglement.date_saisie
              ? reglement.date_saisie.split("T")[0]
              : "",
          tierId: reglement.tierId || "",
          code_tiers: reglement.code_tiers || "",
          tiers_saisie: reglement.tiers_saisie || "",
          montant_brut: reglement.montant_brut || "",
          base_retenue_source: reglement.base_retenue_source || "",
          taux_retenue_source: reglement.taux_retenue_source || "",
          montant_retenue_source: reglement.montant_retenue_source || "",
          montant_net: reglement.montant_net || "",
          observations: reglement.observations || "",
        });
        console.log("reglement " + setReglement);
        setPayements(
            payements.length
                ? payements.map((payement) => ({
                  ...payement,
                  date_echeance: payement.date_echeance
                      ? payement.date_echeance.split("T")[0]
                      : "",
                }))
                : [initialPayementState]
        );
        setPieces(
            pieces.length
                ? pieces.map((piece) => ({
                  ...piece,
                  document_fichier: piece.document_fichier || "",
                  date_piece_a_regler: piece.date_piece_a_regler
                      ? piece.date_piece_a_regler.split("T")[0]
                      : "",
                }))
                : [initialPieceState]
        );

        console.log("payements " + setPayements);
        console.log("pieces " + setPieces);
      } catch (error) {
        console.error("Erreur lors de la récupération du règlement :", error);
        Swal.fire(
            "Erreur",
            "Erreur lors de la récupération des données.",
            "error"
        );
      }
    };

    fetchData();
  }, [id, initialPayementState, initialPieceState]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const [tiersResponse, tauxResponse, piecesResponse] = await Promise.all(
            [
              axios.get("/api/code_tiers", {
                headers: { Authorization: `Bearer ${token}` },
              }),
              axios.get("/api/taux_retenue_source/active", {
                headers: { Authorization: `Bearer ${token}` },
              }),
              axios.get("/api/pieces", {
                headers: { Authorization: `Bearer ${token}` },
              }),
            ]
        );

        setCodeTiers(tiersResponse.data);
        setTaux(tauxResponse.data);
        const piecesOptions = piecesResponse.data.map((piece) => ({
          value: piece.num_piece,
          label: piece.num_piece,
          date_piece: piece.date_piece ? piece.date_piece.split("T")[0] : "",
          montant_total_piece: piece.montant_total_piece,
          document_fichier: piece.document_fichier,
        }));
        setOptions(piecesOptions);
      } catch (err) {
        console.error("Erreur lors de la récupération des données:", err);
      }
    };
    fetchOptions();
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

      if (["base_retenue_source", "taux_retenue_source"].includes(name)) {
        const base = parseFloat(updatedReglement.base_retenue_source) || 0;
        const taux = parseFloat(updatedReglement.taux_retenue_source) || 0;
        updatedReglement.montant_retenue_source = ((base * taux) / 100).toFixed(
            3
        );
      }

      // Calculer montant_net après mise à jour correcte de montant_retenue_source
      if (
          ["montant_brut", "base_retenue_source", "taux_retenue_source"].includes(
              name
          )
      ) {
        const montantBrut = parseFloat(updatedReglement.montant_brut) || 0;
        const montantRetenueSource =
            parseFloat(updatedReglement.montant_retenue_source) || 0;
        updatedReglement.montant_net = (
            montantBrut - montantRetenueSource
        ).toFixed(3);
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

  const handleChangePiece = (e, index) => {
    const { name, value, files } = e.target;
    const updatedPieces = [...pieces];

    if (name === "document_fichier" && files.length > 0) {
      updatedPieces[index] = { ...updatedPieces[index], [name]: files[0] };
    } else {
      updatedPieces[index] = { ...updatedPieces[index], [name]: value };
    }

    setPieces(updatedPieces);
  };

  const addPayement = () => setPayements([...payements, initialPayementState]);

  const removePayement = (index) => {
    const updatedPayements = payements.filter((_, i) => i !== index);
    setPayements(updatedPayements);
  };

  const addPiece = () => setPieces([...pieces, initialPieceState]);

  const removePiece = (index) => {
    const updatedPieces = pieces.filter((_, i) => i !== index);
    setPieces(updatedPieces);
  };

  const handleSelectChange = (selectedOption, index) => {
    const updatedPieces = [...pieces];
    updatedPieces[index] = {
      ...updatedPieces[index],
      num_piece_a_regler: selectedOption?.value || "",
      date_piece_a_regler: selectedOption?.date_piece || "",
      montant_piece_a_regler: selectedOption?.montant_total_piece || "",
      document_fichier: selectedOption?.document_fichier || "",
    };
    setPieces(updatedPieces);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedPayements = payements.map((payement) => ({
        ...payement,
        reglement_emis_id: id,
      }));
      const formattedPieces = pieces.map((piece) => ({
        ...piece,
        reglement_emis_id: id,
      }));

      await axios.put(`/api/reglements_emis/${id}`, {
        reglement,
        payements: formattedPayements,
        pieces: formattedPieces,
      });
      Swal.fire("Succès", "Règlement mis à jour avec succès", "success");
      navigate("/reglements_emis");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du règlement :", error);
      Swal.fire(
          "Erreur",
          "Erreur lors de la mise à jour du règlement",
          "error"
      );
    }
  };

  const handleCancel = () => {
    navigate("/reglements_emis");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "payements":
        return (
            <div>
              <h3>Paiements</h3>
              {payements.map((payement, index) => (
                  <div key={index}>
                    <div className="row">
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Modalité :</label>
                          <select
                              style={{ color: "black" }}
                              className="form-control"
                              name="modalite"
                              onChange={(e) => handleChangePayement(e, index)}
                              value={payement.modalite}
                          >
                            <option value="">Sélectionnez...</option>
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
                          <label>Numéro :</label>
                          <input
                              type="text"
                              className="form-control"
                              name="num"
                              onChange={(e) => handleChangePayement(e, index)}
                              value={payement.num}
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
                          <label>Date d'échéance :</label>
                          <input
                              type="date"
                              className="form-control"
                              name="date_echeance"
                              onChange={(e) => handleChangePayement(e, index)}
                              value={payement.date_echeance}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Montant :</label>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <input
                                type="text"
                                className="form-control"
                                name="montant"
                                onChange={(e) => handleChangePayement(e, index)}
                                value={payement.montant}
                            />
                            &nbsp;
                            <span>DT</span>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <button
                            type="button"
                            className="btn btn-danger btn-sm mt-5"
                            onClick={() => removePayement(index)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                    <hr />
                  </div>
              ))}

              <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={addPayement}
              >
                Ajouter un paiement
              </button>
            </div>
        );
      case "pieces":
        return (
            <div>
              <h3>Pièces</h3>
              {pieces.map((piece, index) => (
                  <div key={index}>
                    <div className="row">
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Numéro de pièce à régler :</label>
                          <Select
                              options={options}
                              onChange={(selectedOption) =>
                                  handleSelectChange(selectedOption, index)
                              }
                              value={
                                  options.find(
                                      (option) =>
                                          option.value === piece.num_piece_a_regler
                                  ) || ""
                              }
                              isClearable
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Date de pièce à régler :</label>
                          <input
                              type="date"
                              className="form-control"
                              name="date_piece_a_regler"
                              onChange={(e) => handleChangePiece(e, index)}
                              value={piece.date_piece_a_regler || ""}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Montant de pièce à régler :</label>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <input
                                type="text"
                                className="form-control"
                                name="montant_piece_a_regler"
                                onChange={(e) => handleChangePiece(e, index)}
                                value={piece.montant_piece_a_regler || ""}
                            />
                            &nbsp;
                            <span>DT</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Montant restant de pièce</label>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <input
                                type="text"
                                className="form-control"
                                name="montant_restant"
                                onChange={(e) => handleChangePiece(e, index)}
                                value={piece.montant_restant || ""}
                            />
                            &nbsp;
                            <span>DT</span>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Document de pièce à régler :</label>

                          {piece.document_fichier && (
                              <img
                                  src={piece.document_fichier}
                                  alt="Document de pièce à régler"
                                  style={{
                                    width: "100px",
                                    height: "auto",
                                    cursor: "pointer",
                                  }}
                              />
                          )}
                        </div>
                      </div>

                      <div className="col-md-3">
                        <button
                            type="button"
                            className="btn btn-danger btn-sm mt-5"
                            onClick={() => removePiece(index)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                    <hr />
                  </div>
              ))}

              <button
                  type="button"
                  className="btn btn-success btn-sm mt-1"
                  onClick={addPiece}
              >
                Ajouter une pièce
              </button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
      <div className="main-panel">
        <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="card">
            <div className="card-body">
              <h2 className="text-center">Modifier un règlement émis</h2>
              <br />
              <form onSubmit={handleSubmit} className="forms-sample">
                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Date de saisie :</label>
                      <input
                          type="date"
                          className="form-control"
                          name="date_saisie"
                          value={reglement.date_saisie || ""}
                          onChange={handleChange}
                      />
                    </div>
                  </div>
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
                              tierId: option?.value || "", // Update tierId
                              code_tiers:
                                  codeTiers.find((tier) => tier.id === option?.value)
                                      ?.code_tiers || "", // Update code_tiers
                            }));
                            fetchBanques(option?.value || ""); // Fetch banks based on selected tierId
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
                      <label>Montant brut :</label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                            type="text"
                            className="form-control"
                            name="montant_brut"
                            value={reglement.montant_brut}
                            onChange={handleChange}
                        />
                        &nbsp;
                        <span>DT</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Base retenue source :</label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                            type="text"
                            className="form-control"
                            name="base_retenue_source"
                            value={reglement.base_retenue_source}
                            onChange={handleChange}
                        />
                        &nbsp;
                        <span>DT</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Taux retenue source :</label>
                      <select
                          style={{ color: "black" }}
                          className="form-control"
                          name="taux_retenue_source"
                          onChange={handleChange}
                          value={reglement.taux_retenue_source}
                      >
                        <option value="" style={{ color: "black" }}>
                          Sélectionnez...
                        </option>
                        {taux.map((taux) => (
                            <option
                                key={taux.taux}
                                value={taux.taux}
                                style={{ color: "black" }}
                            >
                              {taux.taux}%
                            </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Montant retenue source :</label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                            type="text"
                            className="form-control"
                            name="montant_retenue_source"
                            value={reglement.montant_retenue_source}
                            onChange={handleChange}
                        />
                        &nbsp;
                        <span>DT</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Montant net :</label>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                            type="text"
                            className="form-control"
                            name="montant_net"
                            value={reglement.montant_net}
                            onChange={handleChange}
                        />
                        &nbsp;
                        <span>DT</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Observations :</label>
                      <textarea
                          className="form-control"
                          name="observations"
                          placeholder="Entrez vos observations ici..."
                          onChange={handleChange}
                          value={reglement.observations}
                      />
                    </div>
                  </div>
                </div>
                <div className="tabs">
                  <button
                      type="button"
                      className={`btn ${
                          activeTab === "pieces" ? "btn-dark" : "btn-light"
                      }`}
                      onClick={() => setActiveTab("pieces")}
                  >
                    Pièces
                  </button>
                  <button
                      type="button"
                      className={`btn ${
                          activeTab === "payements" ? "btn-dark" : "btn-light"
                      }`}
                      onClick={() => setActiveTab("payements")}
                  >
                    Paiements
                  </button>
                </div>
                <div className="tab-content">{renderTabContent()}</div>
                <br />
                <div className="d-flex justify-content-center">
                  <button type="submit" className="btn btn-primary mr-2">
                    Ajouter
                  </button>
                  &nbsp;&nbsp;
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

export default UpdateReglement;
