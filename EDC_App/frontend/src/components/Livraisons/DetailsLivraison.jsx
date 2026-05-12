import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import React, { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { UserContext } from "../Connexion/UserProvider";

const initialLivraison = {
  id: null,
  date_BL: "",
  num_BL: "",
  code_tiers: "",
  tiers_saisie: "",
  reference_commande: "",
  montant_HT_BL: "",
  TVA_BL: "",
  montant_total_BL: "",
  observations: "",
  document_fichier: "",
  document_fichier_url: "",
};

const DetailsLivraison = ({ isSidebarOpen }) => {
  const { id } = useParams();
  const { user } = useContext(UserContext);

  const navigate = useNavigate();

  const [livraison, setLivraison] = useState(initialLivraison);

  useEffect(() => {
    axios
      .get(`/api/livraison/${id}`)
      .then((res) => {
        const raw = Array.isArray(res.data) ? res.data[0] : res.data;

        if (!raw) {
          toast.error("Livraison introuvable.");
          navigate("/livraisons");
          return;
        }

        setLivraison({
          id: raw.id ?? null,
          date_BL: raw.date_BL ?? "",
          num_BL: raw.num_BL ?? raw.num_bl ?? "",
          code_tiers: raw.code_tiers ?? "",
          tiers_saisie: raw.tiers_saisie ?? "",
          reference_commande: raw.reference_commande ?? "",
          montant_HT_BL: raw.montant_HT_BL ?? raw.montant_HT_bl ?? "",
          TVA_BL: raw.TVA_BL ?? raw.tva_BL ?? raw.tva_bl ?? "",
          montant_total_BL: raw.montant_total_BL ?? raw.montant_total_bl ?? "",
          observations: raw.observations ?? "",
          document_fichier: raw.document_fichier ?? "",
          document_fichier_url: raw.document_fichier_url ?? "",
        });
      })
      .catch((err) => {
        console.log(err);
        toast.error("Erreur lors du chargement de la livraison.");
      });
  }, [id, navigate]);

  const handleCancel = () => {
    navigate("/livraisons");
  };

  function openDocumentInNewWindow(livraison) {
    const newWindow = window.open("", "_blank");

    if (!newWindow) {
      alert("The new window could not be opened. Please check your browser settings.");
      return;
    }

    const rawSrc = `${livraison?.document_fichier_url || livraison?.document_fichier || ""}`.trim();
    const showMessage = (title, text) => {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Document</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            .box { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
            h3 { margin: 0 0 8px; color: #b45309; }
          </style>
        </head>
        <body>
          <div class="box">
            <h3>${title}</h3>
            <p>${text}</p>
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
    };

    if (!rawSrc || rawSrc === "null" || rawSrc === "undefined") {
      showMessage("Document introuvable", "Aucun document n'est enregistré pour cette livraison.");
      return;
    }

    const isDataUrl = rawSrc.startsWith("data:");
    const lowerDoc = rawSrc.toLowerCase();
    const isFakePath = lowerDoc.includes("fakepath") || /^[a-zA-Z]:\\/.test(rawSrc) || rawSrc.includes("\\");

    if (isFakePath) {
      showMessage("Document invalide", "Ce document a été enregistré avec un faux chemin navigateur (fakepath). Ouvrez Modifier, re-sélectionnez le fichier puis Enregistrer.");
      return;
    }

    const isPdf = rawSrc.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(rawSrc);
    const documentUrl = (isDataUrl || rawSrc.startsWith("http://") || rawSrc.startsWith("https://"))
      ? rawSrc
      : `${window.location.origin}/${rawSrc.replace(/^\/+/, "")}`;

    const mediaHtml = isPdf
      ? `<iframe src="${documentUrl}" style="width:100%;height:78vh;border:none;"></iframe>`
      : `<img src="${documentUrl}" alt="Document Image" style="max-width:100%;height:auto;display:block;margin:0 auto;" onerror="document.body.insertAdjacentHTML('beforeend','<p style=\"color:#b91c1c;\">Le fichier est introuvable ou inaccessible.</p>')" />`;

    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 16px; }
          .actions { margin: 16px 0; display:flex; gap:8px; }
        </style>
      </head>
      <body>
        <div class="actions">
          <button onclick="window.print()">Print</button>
          <a href="${documentUrl}" download="document"><button>Download</button></a>
        </div>
        ${mediaHtml}
      </body>
      </html>
    `);
    newWindow.document.close();
  }
const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/livraison/${id}`);
      toast.success("Livraison supprimÃ©e avec succÃ¨s !");
      navigate("/livraisons"); // Navigate back after deletion
    } catch (err) {
      if (err.response && err.response.status === 500) {
        // Si l'erreur est une contrainte de clÃ© Ã©trangÃ¨re ou un problÃ¨me serveur
        toast.error(
          "Impossible de supprimer cette livraison. Elle est liÃ©e Ã  d'autres donnÃ©es."
        );
      } else {
        // Autres erreurs possibles
        toast.error("Erreur lors de la suppression de la livraison.");
      }
      console.error("Error deleting livraison:", err);
    }
  };

  const confirmDelete = (id) => {
    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer cette livraison ?"
    );
    if (confirmDelete) {
      handleDelete(id);
    }
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card">
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-12">
                      <h3 className="title text-center">
                        DÃ©tails de la Livraison
                      </h3>
                      <br />
                      <ul className="list-arrow" style={{ fontSize: "15px" }}>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Date du Bon de Livraison:
                          </strong>
                          {livraison.date_BL
                            ? new Date(livraison.date_BL).toLocaleDateString()
                            : " - "}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            NÂ° du Bon de Livraison:
                          </strong>{" "}
                          {livraison.num_BL}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Code Tiers:
                          </strong>{" "}
                          {livraison.code_tiers}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Tiers Ã  Saisir:
                          </strong>{" "}
                          {livraison.tiers_saisie}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            RÃ©fÃ©rence Commande:
                          </strong>{" "}
                          {livraison.reference_commande}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Montant HT du Bon de Livraison:
                          </strong>{" "}
                          {livraison.montant_HT_BL}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            TVA du Bon de Livraison:
                          </strong>{" "}
                          {livraison.TVA_BL}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Montant Total du Bon de Livraison:
                          </strong>{" "}
                          {livraison.montant_total_BL}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Observations:
                          </strong>{" "}
                          {livraison.observations}
                        </li>{" "}
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Document / Fichier Ã  InsÃ©rer:
                          </strong>{" "}
                          <button
                            onClick={() => openDocumentInNewWindow(livraison)}
                            className="btn btn-btn-outline-dribbble"
                          >
                            Voir Document
                          </button>
                        </li>
                      </ul>
                      <div className="d-flex justify-content-center">
                        {user.role !== "comptable" && (
                          <>
                            <Link
                              to={`/updateLivraison/${id}`}
                              className="mr-2"
                            >
                              <button type="button" className="btn btn-success">
                                Modifier
                              </button>
                            </Link>
                            <button
                              type="button"
                              className="btn btn-danger mr-2"
                              onClick={() => confirmDelete(livraison.id)}
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="btn btn-warning mr-2"
                          onClick={handleCancel}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsLivraison;








