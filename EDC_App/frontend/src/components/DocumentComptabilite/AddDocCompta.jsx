// AddDocCompta.js
import React, { useContext, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider";

const AddDocCompta = ({isSidebarOpen}) => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [form, setForm] = useState({
    date: "",
    nature: "",
    designation: "",
    destinataire: "",
    document_fichier: "",
    priorite: "",
    observations: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "document_fichier" && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1];
        const url = `data:image/png;base64,${base64Data}`;
        setForm((prev) => ({ ...prev, document_fichier: url }));
      };
      reader.readAsDataURL(e.target.files[0]);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const createDocument = async () => {
    try {
      await axios.post("/api/documents_comptabilite", form);
      console.log(form);
        // Notification si l'utilisateur est un comptable
        if (user.role === "comptable") {
          const notificationMessage = `${user.identite} a ajouté un nouveau Document pour la Comptabilité`;
    
          const notificationData = {
            userId: user.id,
            message: notificationMessage,
          };
    
          axios.post("/api/notifications", notificationData);
        }
    
          Swal.fire({
            icon: "success",
            title: "Succès",
            text: "Document ajouté avec succès.",
          });
          navigate("/documents_comptabilite");
    } catch (error) {
      console.error("Error creating document:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Une erreur est survenue lors de l'ajout du document.",
      });
    
    }
  };

  const handleCancel = () => {
    navigate("/documents_comptabilite");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? 'shifted' : ''}`}>
      <div className="card">
          <div className="card-body">
            <h2 className="text-center">Ajouter Document pour la Comptabilité</h2>
            <br />
            <br />
            <form className="forms-sample">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="date">Date de la periode:</label>
                    <input
                      id="date"
                      name="date"
                      placeholder="Date"
                      type="date"
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="nature">Nature du Document:</label>
                    <select
                      id="nature"
                      name="nature"
                      style={{ color: "black" }}
                      className="form-control"
                      value={form.nature}
                      onChange={handleChange}
                    >
                      <option value="">Sélectionnez...</option>
                      <option value="facture">Facture</option>
                      <option value="note d'honoraire">Note d'honoraire</option>
                      <option value="bon de livraison">Bon de livraison</option>
                      <option value="quittance">Quittance</option>
                      <option value="reçu">Reçu</option>
                      <option value="contrat">Contrat</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="designation">Désignation:</label>
                    <input
                      id="designation"
                      name="designation"
                      type="text"
                      placeholder="Désignation"
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="destinataire">Destinataire:</label>
                    <input
                      id="destinataire"
                      name="destinataire"
                      type="text"
                      placeholder="Destinataire"
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  
                  <div className="form-group">
                    <label htmlFor="priorite">Priorité:</label>
                    <select
                      id="priorite"
                      style={{ color: "black" }}
                      name="priorite"
                      className="form-control mr-3"
                      onChange={handleChange}
                    >
                      <option value="">Sélectionnez une priorité</option>
                      <option value="Normale">Normale</option>
                      <option value="Importante">Importante</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="document_fichier">
                      Document/ Fichier à Insérer:
                    </label>
                    <input
                      id="document_fichier"
                      name="document_fichier"
                      type="file"
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                  
                </div>

                <div className="col-md-6">
                <div className="form-group">
                    <label htmlFor="observations">Observations:</label>
                    <textarea
                      id="observations"
                      name="observations"
                      placeholder="Observations"
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
               
                </div>
              </div>
              <br></br>

              <div
                className="d-flex justify-content-center"
              >
                <button
                  type="submit"
                  onClick={createDocument}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDocCompta;
