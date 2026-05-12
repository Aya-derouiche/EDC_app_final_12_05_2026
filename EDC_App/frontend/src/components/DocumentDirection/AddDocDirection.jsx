import React, { useContext, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider";

const AddDocDirection = ({ isSidebarOpen }) => {
  const { user } = useContext(UserContext);

  const navigate = useNavigate();
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
    const { name, value, files } = e.target;
    if (name === "document_fichier" && files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({ ...prev, document_fichier: reader.result }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const createDocument = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/documents_direction", form);
       // Notification si l'utilisateur est un comptable
       if (user.role === "utilisateur") {
        const notificationMessage = `${user.identite} a ajouté un nouveau Document pour la Direction`;
  
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
        navigate("/documents_direction");
    } catch (error) {
      console.error("Error creating document:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Une erreur est survenue lors de l'ajout du document.",
      });    }
  };

  const handleCancel = () => {
    navigate("/documents_direction");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? 'shifted' : ''}`}>
        <div className="card">
          <div className="card-body">
            <h2 className="text-center">Ajouter Document pour la Direction</h2>
            <br />
            <br />
            <form className="forms-sample" onSubmit={createDocument}>
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
                      required
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
                      required
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
                      required
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
                      required
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
                      required
                    >
                      <option value="">Sélectionnez une priorité</option>
                      <option value="Normale">Normale</option>
                      <option value="Importante">Importante</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="document_fichier">Document/ Fichier à Insérer:</label>
                    <input
                      id="document_fichier"
                      name="document_fichier"
                      type="file"
                      onChange={handleChange}
                      className="form-control"
                      required
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
              <br />
              <div className="d-flex justify-content-center" >
              <button type="submit" className="btn btn-primary mr-2">Enregistrer</button>
              <button type="button" className="btn btn-light" onClick={handleCancel}>Annuler</button>
              </div>
             
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDocDirection;
