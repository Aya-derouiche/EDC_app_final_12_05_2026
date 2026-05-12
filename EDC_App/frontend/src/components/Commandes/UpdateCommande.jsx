import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import TiersSaisie from "../TiersSaisie";

const UpdateCommande = ({ isSidebarOpen }) => {
  const { id } = useParams();

  // Ã‰tat initial de la commande et des familles
  const initialCommandeState = {
    date_commande: "",
    num_commande: "",
    code_tiers: "",
    tiers_saisie: "",
    montant_commande: "",
    date_livraison_prevue: "",
    observations: "",
    document_fichier: "",
  };

  const initialFamilleState = {
    famille: "",
    sous_famille: "",
    article: "",
  };

  // Ã‰tats pour stocker la commande, les familles et les codes tiers
  const [commande, setCommande] = useState(initialCommandeState);
  const [familles, setFamilles] = useState([initialFamilleState]);
  const [codeTiers, setCodeTiers] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const handleModalShow = () => setShowModal(true);

  // Utilisation du hook useNavigate pour la navigation
  const navigate = useNavigate();

  // Effet pour rÃ©cupÃ©rer les donnÃ©es de la commande et des familles depuis le serveur
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`/api/commande/${id}`);
        const { data } = response;
        // Correction : Assurer que les dates sont bien formatÃ©es
        setCommande({
          ...data.commande,
          code_tiers: data.commande.code_tiers || "",
          date_commande: data.commande.date_commande
            ? new Date(data.commande.date_commande).toISOString().split("T")[0]
            : "",
          date_livraison_prevue: data.commande.date_livraison_prevue
            ? new Date(data.commande.date_livraison_prevue).toISOString().split("T")[0]
            : "",
        });
        setFamilles(data.familles.map(famille => ({
          id: famille.id || "", // ou autre clÃ© unique
          famille: famille.famille,
          sous_famille: famille.sous_famille,
          article: famille.article,
        })));
      
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("An error occurred while fetching data. Please try again.");
      }
    };

    fetchData();
  }, [id]);

  // Effet pour rÃ©cupÃ©rer les codes tiers depuis le serveur
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

  // Fonction de gestion des changements dans les champs de la commande
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "document_fichier" && files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1]; // Extracting base64 data
        const url = `data:image/png;base64,${base64Data}`; // Assuming it's PNG format
        setCommande((prev) => ({ ...prev, document_fichier: url }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setCommande((prev) => ({ ...prev, [name]: e.target.value }));
    }

    if (name === "tiers_saisie" && value !== "") {
      setShowModal(true);
    }
  };

  // Fonction de gestion des changements dans les champs de la famille
  const handleChangeFamille = (e, index) => {
    const { name, value } = e.target;
    const updatedFamilles = [...familles];
    updatedFamilles[index][name] = value;
    setFamilles(updatedFamilles);
  };

  // Fonction pour ajouter une nouvelle famille
  const addFamille = () => {
    setFamilles([
      ...familles,
      {
        famille: "",
        sous_famille: "",
        article: "",
      },
    ]);
  };

  const removeFamille = async (index, familleId) => {
    try {
      if (familleId) {
        await axios.delete(`/api/familles/${familleId}`);
      }
      const updatedFamilles = familles.filter((_, i) => i !== index);
      setFamilles(updatedFamilles);
    } catch (error) {
      console.error("Erreur lors de la suppression du famille :", error);
    }
  };
  

  // Fonction pour soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedFamilles = familles.map((famille) => ({
        famille: famille.famille,
        sous_famille: famille.sous_famille,
        article: famille.article,
        commande_id: id,
      }));

      await axios.put(`/api/commande/${id}`, {
        commande,
        familles: formattedFamilles,
      });
      Swal.fire({
        icon: "success",
        title: "SuccÃ¨s",
        text: "Commande mise Ã  jour avec succÃ¨s!",
      });
      navigate("/commandes");
    } catch (error) {
      console.error("Erreur lors de la mise Ã  jour de la commande :", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Erreur lors de la mise Ã  jour de la commande. Veuillez rÃ©essayer.",
      });
    }
  };

  // Fonction pour annuler la modification de la commande
  const handleCancel = () => {
      navigate("/commandes");
  };
  

  const openImageViewer = (documentBase64) => {
    const imageWindow = window.open("", "_blank");
    const img = document.createElement("img");
    img.src = documentBase64;  // Utilisez directement la chaÃ®ne en base64
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
            <h2 className="text-center">Modifier une Commande</h2>
            <br />
            <form className="forms-sample" onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Date de la Commande:</label>
                    <input
                      type="date"
                      className="form-control"
                      name="date_commande"
                      onChange={handleChange}
                      value={commande.date_commande}
                    />
                  </div>

                  <div className="form-group">
                    <label>NÂ° de la commande:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="num_commande"
                      onChange={handleChange}
                      value={commande.num_commande}
                      placeholder="NÂ° de la commande"
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Code Tiers:</label>
                    <select
                      className="form-control"
                      style={{color: "black"}}
                      name="code_tiers"
                      onChange={handleChange}
                      value={commande.code_tiers}
                    >
                      <option value="">SÃ©lectionner le Code Tiers</option>
                      {codeTiers.map((tier) => (
                        <option key={tier.id} value={tier.code_tiers}>
                          {`${tier.code_tiers} - ${tier.identite}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Montant de la Commande:</label>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input
                        type="text"
                        className="form-control"
                        name="montant_commande"
                        onChange={handleChange}
                        value={commande.montant_commande}
                        placeholder="Montant de la Commande"
                      />
                      &nbsp;<span>DT</span>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Tiers Ã  ajouter:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="tiers_saisie"
                      onChange={handleChange}
                      onClick={handleModalShow}
                      value={commande.tiers_saisie}
                      disabled={!!commande.code_tiers} // DÃ©sactiver si code_tiers est sÃ©lectionnÃ©
                    />
                  </div>

                  <div className="form-group">
                    <label>Date de livraison prÃ©vue:</label>
                    <input
                      type="date"
                      className="form-control"
                      name="date_livraison_prevue"
                      onChange={handleChange}
                      value={commande.date_livraison_prevue}
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="form-group">
                    <label>Document fichier:</label>
                    <input
                      type="file"
                      className="form-control"
                      name="document_fichier"
                      onChange={handleChange}
                    />
                    {commande.document_fichier && (
                      <img
                      src={commande.document_fichier}
                      alt="Facture Document"
                      style={{
                        width: "100px",
                        height: "auto",
                        cursor: "pointer",
                      }}
                      onClick={() => openImageViewer(commande.document_fichier)}
                    />
                    
                    )}
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
                      value={commande.observations}
                    />
                  </div>
                </div>
              </div>
              <br />
              <hr />
              <legend>Familles</legend>
              {familles.map((famille, index) => (
                <div key={index} className="mb-3 border p-3">
                  <div className="row">
                    <div className="col-md-3">
                      <div className="form-group mb-3">
                        <label>Famille:</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="famille"
                          value={famille.famille}
                          onChange={(e) => handleChangeFamille(e, index)}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group mb-3">
                        <label>Sous Famille:</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="sous_famille"
                          value={famille.sous_famille}
                          onChange={(e) => handleChangeFamille(e, index)}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group mb-3">
                        <label>Article:</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="article"
                          value={famille.article}
                          onChange={(e) => handleChangeFamille(e, index)}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group d-flex align-items-end mb-0">
                        <button
                          onClick={() => removeFamille(index)}
                          type="button"
                          className="btn btn-danger btn-sm mt-3"
                        >
                          <i className="bi bi-trash"></i> Supprimer
                        </button>
                        &nbsp;
                        {index === familles.length - 1 && (
                          <button
                            onClick={addFamille}
                            type="button"
                            className="btn btn-success btn-sm"
                          >
                            <i className="bi bi-plus-circle"></i> Ajouter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <br />
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

export default UpdateCommande;
