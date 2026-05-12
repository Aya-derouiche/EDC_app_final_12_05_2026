import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import { useNavigate } from "react-router-dom";
import TiersSaisie from "../TiersSaisie";
import Swal from 'sweetalert2';
import "react-toastify/dist/ReactToastify.css";
import { UserContext } from "../Connexion/UserProvider";

const AddCommande = ({ isSidebarOpen }) => {
  const { user } = useContext(UserContext);

  const initialCommandeState = {
    date_commande: new Date().toISOString().split("T")[0],
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

  const [commande, setCommande] = useState(initialCommandeState);
  const [familles, setFamilles] = useState([initialFamilleState]);
  const [codeTiers, setCodeTiers] = useState([]);
  const [options, setOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState({});
  const handleModalShow = () => setShowModal(true);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCodeTiers = async () => {
      try {
        const res = await axios.get("/api/code_tiers", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`, // Exemple de gestion de token
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
    const fetchFamilles = async () => {
      try {
        const res = await axios.get("/api/familles");
        const options = res.data.map((famille) => ({
          value: famille,
          label: famille,
        }));
        setOptions(options);
      } catch (err) {
        console.log(err);
      }
    };
    fetchFamilles();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "document_fichier" && files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1];
        const url = `data:image/png;base64,${base64Data}`;
        setCommande((prev) => ({ ...prev, document_fichier: url }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setCommande((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "tiers_saisie" && value !== "") {
      setShowModal(true);
    }
  };

  const handleChangeFamille = (value, index, field) => {
    const updatedFamilles = [...familles];
    if (field) {
      updatedFamilles[index][field] = value.target ? value.target.value : value.value;
    } else {
      const familleValue = value && value.__isNew__ ? value.value : value;
      updatedFamilles[index].famille = familleValue;
    }
    setFamilles(updatedFamilles);
  };

  const addFamille = () => {
    setFamilles([...familles, initialFamilleState]);
  };

  const removeFamille = (index) => {
    const updatedFamilles = familles.filter((_, i) => i !== index);
    setFamilles(updatedFamilles);
  };

  const validateForm = () => {
    let formErrors = {};

    // Validation des champs uniquement pour la commande
    if (!commande.date_commande) {
      formErrors.date_commande = "La date de la commande est requise";
    }
    if (!commande.num_commande) {
      formErrors.num_commande = "Le numéro de commande est requis";
    }
    if (!commande.montant_commande) {
      formErrors.montant_commande = "Le montant de la commande est requis";
    }
    if (!commande.date_livraison_prevue) {
      formErrors.date_livraison_prevue = "La date de livraison prévue est requise";
    }
    if (!commande.document_fichier) {
      formErrors.document_fichier = "Document est requis";
    }

    setErrors(formErrors);

    // Retourne true seulement si aucune erreur n'existe pour la partie commande
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation des champs de la commande
    if (!validateForm()) {
      Swal.fire({
        icon: "warning",
        title: "Erreur",
        text: "Veuillez remplir tous les champs requis.",
      });
      return;
    }

    try {
      // Envoi des données au serveur
      const response = await axios.post(
          "/api/commande",
          { commande, familles }, // On inclut commande et familles
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`, // Token de l'utilisateur
              "Content-Type": "application/json", // Assurez-vous que le format est correctement défini
            },
          }
      );

      // Affichage du succès après l'envoi
      Swal.fire({
        icon: "success",
        title: "Succès",
        text: "Commande ajoutée avec succès!",
      });

      // Redirection vers la page des commandes
      navigate("/commandes");

    } catch (error) {
      console.error("Erreur lors de l'ajout de la commande :", error);

      // Gestion détaillée des erreurs serveur
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
            error.response?.data?.message ||
            "Une erreur est survenue lors de l'ajout de la commande.",
      });
    }
  };

  const handleCancel = () => {
    navigate("/commandes");
  };

  return (
      <div className="main-panel">
        <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="card">
            <div className="card-body">
              <h2 className="text-center">Ajouter une Commande</h2>
              <br />
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
                      {errors.date_commande && (
                          <div className="text-danger">{errors.date_commande}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>N° de la commande:</label>
                      <input
                          type="text"
                          className="form-control"
                          name="num_commande"
                          onChange={handleChange}
                          value={commande.num_commande}
                          placeholder="N° de la commande"
                      />
                      {errors.num_commande && (
                          <div className="text-danger">{errors.num_commande}</div>
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
                          value={commande.code_tiers}
                      >
                        <option value="" style={{ color: "black" }}>
                          Sélectionner le Code Tiers
                        </option>
                        {codeTiers.map((tier) => (
                            <option
                                key={tier.id}
                                value={tier.code_tiers}
                            >
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
                        &nbsp;
                        <span>DT</span>
                      </div>
                      {errors.montant_commande && (
                          <div className="text-danger">
                            {errors.montant_commande}
                          </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Tiers Saisie:</label>
                      <input
                          type="text"
                          className="form-control"
                          name="tiers_saisie"
                          onChange={handleChange}
                          onClick={handleModalShow}
                          value={commande.tiers_saisie}
                          disabled={!!commande.code_tiers}
                      />
                    </div>
                    <div className="form-group">
                      <label>Date de livraison prévue:</label>
                      <input
                          type="date"
                          className="form-control"
                          name="date_livraison_prevue"
                          onChange={handleChange}
                          value={commande.date_livraison_prevue}
                      />
                      {errors.date_livraison_prevue && (
                          <div className="text-danger">
                            {errors.date_livraison_prevue}
                          </div>
                      )}
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
                      {errors.document_fichier && (
                          <div className="text-danger">
                            {errors.document_fichier}
                          </div>
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
                <br />
                <h3>Familles</h3>
                <br />
                {familles.map((famille, index) => (
                    <div key={index} className="mb-3 border p-3">
                      <div className="row">
                        <div className="col-md-3">
                          <div className="form-group mb-3">
                            <label>Famille:</label>
                            <CreatableSelect
                                options={options}
                                onChange={(value) =>
                                    handleChangeFamille(value, index)
                                }
                                value={options.find(
                                    (option) => option.value === famille.famille
                                )}
                                isClearable
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group mb-3">
                            <label>Sous Famille:</label>
                            <input
                                type="text"
                                className="form-control"
                                value={famille.sous_famille}
                                onChange={(e) =>
                                    handleChangeFamille(e, index, "sous_famille")
                                }
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="form-group mb-3">
                            <label>Article:</label>
                            <input
                                type="text"
                                className="form-control"
                                value={famille.article}
                                onChange={(e) =>
                                    handleChangeFamille(e, index, "article")
                                }
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <br />
                          <div className="form-group d-flex align-items-end mb-0">
                            <button
                                type="button"
                                className="btn btn-danger btn-sm mt-3"
                                onClick={() => removeFamille(index)}
                            >
                              <i className="bi bi-trash3"></i>
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
                <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={addFamille}
                >
                  <i className="bi bi-plus-circle"></i> Ajouter
                </button>
                <br />
                <br />
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

export default AddCommande;
