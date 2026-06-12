import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider";
import api from "../../api/axios";

const AddDocCompta = ({ isSidebarOpen }) => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [form, setForm] = useState({
    date: "",
    nature: "",
    designation: "",
    destinataire: "",
    priorite: "",
    observations: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const selectedFileType = useMemo(() => selectedFile?.type || "", [selectedFile]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "document_fichier") {
      const file = files?.[0] || null;
      setSelectedFile(file);
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      Swal.fire({
        icon: "warning",
        title: "Fichier requis",
        text: "Veuillez sélectionner un document à analyser.",
      });
      return;
    }

    setUploading(true);

    const payload = new FormData();
    payload.append("file", selectedFile);
    payload.append("documentType", form.nature || "Document");
    payload.append("date", form.date || "");
    payload.append("nature", form.nature || "");
    payload.append("designation", form.designation || "");
    payload.append("destinataire", form.destinataire || "");
    payload.append("priorite", form.priorite || "");
    payload.append("observations", form.observations || "");

    try {
      const response = await api.post("/v1/documents/upload", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const scanConfidence = Math.round((response.data?.confidence_score || 0) * 100);

      if (user?.role === "comptable") {
        const notificationMessage = `${user.identite} a ajouté un nouveau document pour la comptabilité`;
        await axios.post("/api/notifications", {
          userId: user.id,
          message: notificationMessage,
        });
      }

      Swal.fire({
        icon: response.data?.scan_success ? "success" : "info",
        title: response.data?.scan_success ? "Succès" : "Document enregistré",
        text: response.data?.scan_success
          ? `Document uploadé et analysé avec succès. Confiance OCR : ${scanConfidence}%`
          : "Document enregistré. L'OCR n'a pas pu extraire de données automatiquement, mais le fichier a bien été sauvegardé.",
      });

      navigate("/documents_comptabilite");
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Une erreur est survenue lors de l'ajout du document.";

      console.error("Error creating document:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    navigate("/documents_comptabilite");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="card">
          <div className="card-body">
            <h2 className="text-center">Ajouter Document pour la Comptabilité</h2>
            <br />
            <form className="forms-sample" onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="date">Date de la période:</label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      onChange={handleChange}
                      value={form.date}
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
                    <label htmlFor="document_fichier">
                      Document / Fichier à insérer:
                    </label>
                    <input
                      id="document_fichier"
                      name="document_fichier"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff"
                      onChange={handleChange}
                      className="form-control"
                    />
                    {selectedFile && (
                      <small className="text-muted d-block mt-2">
                        Fichier sélectionné: {selectedFile.name}
                      </small>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
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
              </div>

              {selectedFile && (
                <div className="mt-3">
                  <h6 className="mb-2">Aperçu du document</h6>
                  {selectedFileType === "application/pdf" ? (
                    <iframe
                      src={previewUrl}
                      title="aperçu-document"
                      style={{
                        width: "100%",
                        height: 360,
                        border: "1px solid #ddd",
                        borderRadius: 8,
                      }}
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="aperçu-document"
                      style={{
                        width: "100%",
                        maxHeight: 360,
                        objectFit: "contain",
                        border: "1px solid #ddd",
                        borderRadius: 8,
                      }}
                    />
                  )}
                </div>
              )}

              <br />

              <div className="d-flex justify-content-center">
                <button
                  type="submit"
                  className="btn btn-primary mr-2"
                  disabled={uploading}
                >
                  {uploading ? "Analyse en cours..." : "Ajouter"}
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleCancel}
                  disabled={uploading}
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
