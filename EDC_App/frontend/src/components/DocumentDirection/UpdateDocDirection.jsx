import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const UpdateDocDirection = ({ isSidebarOpen }) => {
  const { id } = useParams();
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
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const res = await axios.get(
            `/api/documents_direction/${id}`
        );
        const document = res.data;

        // Format date to 'yyyy-MM-dd'
        const formattedDate = document.date ? document.date.split("T")[0] : "";

        setForm({
          date: formattedDate || "",
          nature: document.nature || "",
          designation: document.designation || "",
          destinataire: document.destinataire || "",
          document_fichier: document.document_fichier || "",
          priorite: document.priorite || "",
          observations: document.observations || "",
        });
        setImageUrl(document.document_fichier || "");
      } catch (error) {
        console.error("Error fetching document:", error);
      }
    };

    fetchDocument();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value || "" });
  };

  const handleFileChange = (e) => {
    if (e.target.name === "document_fichier" && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(",")[1];
        const url = `data:image/png;base64,${base64Data}`;
        setForm((prev) => ({ ...prev, document_fichier: url }));
        setImageUrl(url);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const updateDocument = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
          `/api/documents_direction/${id}`,
          form
      );
      alert("Données modifiées avec succès.");
      navigate("/documents_direction");
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Erreur lors de mettre à jour le document: " + error.message);
    }
  };

  const handleCancel = () => {
    navigate("/documents_direction");
  };
  return (
      <div className="main-panel">
        <div className={`content-wrapper ${isSidebarOpen ? 'shifted' : ''}`}>
          <div className="card">
            <div className="card-body">
              <h2 className="title text-center">Modifier document pour la direction</h2>
              <br />
              <form className="forms-sample" onSubmit={updateDocument}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="date">Date de la periode:</label>
                      <input
                          name="date"
                          type="date"
                          value={form.date || ""}
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
                          value={form.designation}
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
                          value={form.destinataire}
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
                          value={form.priorite}
                          onChange={handleChange}
                      >
                        <option value="">Sélectionnez une priorité</option>
                        <option value="Normale">Normale</option>
                        <option value="Importante">Importante</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="observations">Observations:</label>
                      <textarea
                          id="observations"
                          name="observations"
                          placeholder="Observations"
                          value={form.observations}
                          onChange={handleChange}
                          className="form-control"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="document_fichier">
                        Document/ Fichier à Insérer:
                      </label>
                      {imageUrl && (
                          <div>
                            <img
                                src={imageUrl}
                                alt="Document"
                                style={{ width: "100px", marginBottom: "10px" }}
                            />
                          </div>
                      )}
                      <input
                          id="document_fichier"
                          name="document_fichier"
                          type="file"
                          onChange={handleFileChange}
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
            </div>
          </div>
        </div>
      </div>
  );
};

export default UpdateDocDirection;
