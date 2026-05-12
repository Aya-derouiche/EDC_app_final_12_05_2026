import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { UserContext } from "../Connexion/UserProvider";
import Swal from 'sweetalert2';


const AddTier = ({ isSidebarOpen }) => {
  const { user } = useContext(UserContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tier, setTier] = useState({
    code_tiers: "",
    date_creation: new Date().toISOString().split("T")[0],
    type: "",
    identite: "",
    MF_CIN: "",
    tel: "",
    email: "",
    adresse: "",
    ville: "",
    pays: "",
    observations: "",
    autreType: "",
    banques: [],
  });

  const [errors, setErrors] = useState({});

  const [banquesOptions , setBanquesOptions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const axiosInstance = axiosWithAuth();
        const response = await axiosInstance.get("/api/banques/active");

        // Formatage des résultats pour Select
        const formattedBanques = response.data.map((banque) => ({
          value: banque.id,
          label: banque.name,
        }));

        setBanquesOptions(formattedBanques);
      } catch (err) {
        console.error("Erreur lors de la récupération des banques actives:", err);
      }
    };
    fetchData();
  }, []);


  const [paysOptions] = useState([
    { value: "Tunisie", label: "Tunisie" },
    { value: "Algérie", label: "Algérie" },
    { value: "Maroc", label: "Maroc" },
    { value: "France", label: "France" },
    { value: "Canada", label: "Canada" },
    { value: "Italie", label: "Italie" },
    { value: "Allemagne", label: "Allemagne" },
    { value: "United Arab Emirates", label: "United Arab Emirates" },
    { value: "Autre", label: "Autre" },
  ]);

  const navigate = useNavigate();

  const villesTunisie = [
    "Tunis",
    "Ariana",
    "Ben Arous",
    "La Manouba",
    "Nabeul",
    "Zaghouan",
    "Bizerte",
    "Béja",
    "Jendouba",
    "Le Kef",
    "Siliana",
    "Sousse",
    "Monastir",
    "Mahdia",
    "Sfax",
    "Kairouan",
    "Kasserine",
    "Sidi Bouzid",
    "Gabès",
    "Médenine",
    "Tataouine",
    "Gafsa",
    "Tozeur",
    "Kebili",
  ];


  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "code_tiers":
        error = value ? "" : "Code Tiers est obligatoire";
        break;
      case "identite":
        error = value ? "" : "Identité est obligatoire";
        break;
      case "type":
        error = value ? "" : "Type est obligatoire";
        break;
      case "autreType":
        error = tier.type === "autre" && !value ? "Autre Type est obligatoire" : "";
        break;
      case "MF_CIN":
        error = value ? "" : "MF/CIN est obligatoire";
        break;
      case "tel":
        error = /^\d{8,}$/.test(value)
            ? ""
            : "Téléphone doit contenir au moins 8 chiffres";
        break;
      case "email":
        error = value && /\S+@\S+\.\S+/.test(value) ? "" : "Email est invalide";
        break;
      case "adresse":
        error = value ? "" : "Adresse est obligatoire";
        break;
      default:
        break;
    }

    setErrors((prevErrors) => ({ ...prevErrors, [name]: error }));
    return error;
  };


  const validateAllFields = () => {
    const validationErrors = {};

    Object.keys(tier).forEach((key) => {
      const error = validateField(key, tier[key]);
      if (error) {
        validationErrors[key] = error;
      }
    });

    setErrors(validationErrors);
    return validationErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTier((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSelectChange = (selectedOption) => {
    setTier((prev) => ({
      ...prev,
      pays: selectedOption ? selectedOption.value : "",
    }));
  };

  const handleMultiSelectChange = (selectedOptions) => {
    setTier((prev) => ({ ...prev, banques: selectedOptions }));
    validateField("banques", selectedOptions);
  };

  const axiosWithAuth = () => {
    const token = localStorage.getItem("token");
    return axios.create({
      baseURL: "",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const handleClick = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Valider tous les champs et vérifier les erreurs
    const validationErrors = validateAllFields();
    const hasErrors = Object.values(validationErrors).some((error) => error !== "");

    if (!hasErrors) {
      const axiosInstance = axiosWithAuth();
      const payload = {
        ...tier,
        banques: Array.isArray(tier.banques)
            ? tier.banques.map((banque) => banque.value)
            : [],
      };

      try {
        // Envoi de la requête pour ajouter un Tier
        await axiosInstance.post("/tiers", payload);

        // Notification si l'utilisateur est un comptable
        if (user.role === "comptable") {
          const notificationMessage = `${user.identite} a ajouté un nouveau Tier`;

          const notificationData = {
            userId: user.id,
            message: notificationMessage,
          };

          await axiosInstance.post("/api/notifications", notificationData);
        }

        // Afficher une notification de succès
        Swal.fire({
          icon: "success",
          title: "Succès",
          text: "Tier ajouté avec succès!",
        });

        // Rediriger vers la page des Tiers après 2 secondes
        setTimeout(() => {
          navigate("/tiers");
        }, 2000);
      } catch (err) {
        console.log(err);
        // Afficher une notification d'erreur
        Swal.fire({
          icon: "error",
          title: "Erreur",
          text: "Erreur lors de l'ajout du tier. Veuillez réessayer.",
        });
      }
    } else {
      // Afficher une notification d'erreur si des erreurs de validation existent
      Swal.fire({
        icon: "warning",
        title: "Erreur",
        text: "Veuillez corriger les erreurs dans le formulaire.",
      });
    }

    setIsSubmitting(false);
  };


  const handleCancel = () => {
    navigate("/tiers");
  };

  return (
      <div className="main-panel">
        <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="card">
            <div className="card-body">
              <h2 className="text-center">Ajouter un Tier</h2>
              <br />
              <br />
              <form className="forms-sample" onSubmit={handleClick}>
                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Date de Création:</label>
                      <input
                          type="date"
                          className="form-control"
                          name="date_creation"
                          onChange={handleChange}
                          value={tier.date_creation}
                      />
                    </div>

                    <div className="form-group">
                      <label>Code Tiers:</label>
                      <input
                          type="text"
                          className={`form-control ${
                              errors.code_tiers && "is-invalid"
                          }`}
                          name="code_tiers"
                          onChange={handleChange}
                          placeholder="Code Tiers"
                          value={tier.code_tiers}
                      />
                      {errors.code_tiers && (
                          <div className="invalid-feedback">
                            {errors.code_tiers}
                          </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Email:</label>
                      <input
                          type="email"
                          className={`form-control ${errors.email && "is-invalid"}`}
                          name="email"
                          onChange={handleChange}
                          placeholder="Email"
                          value={tier.email}
                      />
                      {errors.email && (
                          <div className="invalid-feedback">{errors.email}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Adresse:</label>
                      <input
                          type="text"
                          className={`form-control ${
                              errors.adresse && "is-invalid"
                          }`}
                          name="adresse"
                          onChange={handleChange}
                          placeholder="Adresse"
                          value={tier.adresse}
                      />
                      {errors.adresse && (
                          <div className="invalid-feedback">{errors.adresse}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Observations:</label>
                      <textarea
                          className="form-control"
                          name="observations"
                          onChange={handleChange}
                          placeholder="Observations"
                          value={tier.observations}
                      />
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Type:</label>
                      <select
                          style={{ color: "black" }}
                          className={`form-control ${errors.type && "is-invalid"}`}
                          name="type"
                          onChange={handleChange}
                          value={tier.type}
                      >
                        <option value="">Sélectionnez...</option>
                        <option value="fournisseur">Fournisseur</option>
                        <option value="client">Client</option>
                        <option value="personnel">Personnel</option>
                        <option value="associe">Associé</option>
                        <option value="autre">Autre</option>
                      </select>
                      {errors.type && (
                          <div className="invalid-feedback">{errors.type}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>MF / CIN:</label>
                      <input
                          type="text"
                          className={`form-control ${
                              errors.MF_CIN && "is-invalid"
                          }`}
                          name="MF_CIN"
                          onChange={handleChange}
                          placeholder="MF / CIN"
                          value={tier.MF_CIN}
                      />
                      {errors.MF_CIN && (
                          <div className="invalid-feedback">{errors.MF_CIN}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Identité:</label>
                      <input
                          type="text"
                          className={`form-control ${
                              errors.identite && "is-invalid"
                          }`}
                          name="identite"
                          onChange={handleChange}
                          placeholder="Identité"
                          value={tier.identite}
                      />
                      {errors.identite && (
                          <div className="invalid-feedback">{errors.identite}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Ville:</label>
                      <select
                          className="form-control"
                          name="ville"
                          onChange={handleChange}
                          style={{ color: "black" }}
                          value={tier.ville}
                      >
                        <option value="">Sélectionnez une Ville...</option>
                        {villesTunisie.map((ville) => (
                            <option key={ville} value={ville}>
                              {ville}
                            </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Autre Type:</label>
                      <input
                          type="text"
                          style={{ color: "black" }}
                          className="form-control"
                          name="autreType"
                          onChange={handleChange}
                          placeholder="Autre Type"
                          disabled={tier.type !== "autre"}
                          value={tier.autreType}
                      />
                    </div>

                    <div className="form-group">
                      <label>Téléphone:</label>
                      <input
                          type="text"
                          className={`form-control ${errors.tel && "is-invalid"}`}
                          name="tel"
                          onChange={handleChange}
                          placeholder="Téléphone"
                          value={tier.tel}
                      />
                      {errors.tel && (
                          <div className="invalid-feedback">{errors.tel}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Banque:</label>
                      <Select
                          isMulti
                          name="banques"
                          options={banquesOptions}
                          className="basic-multi-select"
                          classNamePrefix="select"
                          onChange={handleMultiSelectChange}
                          value={tier.banques}
                      />
                      {errors.banques && (
                          <div className="invalid-feedback">{errors.banques}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Pays:</label>
                      <Select
                          options={paysOptions}
                          className="basic-single"
                          onChange={handleSelectChange}
                          value={paysOptions.find(
                              (option) => option.value === tier.pays
                          )}
                          isClearable
                          isSearchable
                      />
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-center">
                  <button
                      className="btn btn-primary mr-2"
                      onClick={handleClick}
                      disabled={isSubmitting}
                  >
                    {isSubmitting ? "Soumission..." : "Ajouter"}
                  </button>

                  <button className="btn btn-light" onClick={handleCancel}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AddTier;
