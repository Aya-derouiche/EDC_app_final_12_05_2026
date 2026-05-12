import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { UserContext } from "../Connexion/UserProvider";
import { toast } from "react-toastify";

const DetailsReglementRecu = ({ isSidebarOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const initialReglementState = {
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `/api/reglements_recus/${id}`
        );
        const { data } = response;
        setReglement(data.reglement);
        setPayements(data.payements || []);
        setFactures(data.factures || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [id]);

  const handleCancel = () => {
    navigate("/reglements_recus");
  };

  function openDocumentInNewWindow(facture) {
    var newWindow = window.open("", "_blank");

    if (newWindow) {
      newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Document</title>
                <style>  
                img {
                    margin-left: 400px;
                }
                .print{
                  margin-left: 500px;
                }
            </style>
            </head>
            <body>
                <img src="${facture.document_fichier}" alt="Document Image">
                <br></br><br></br>
                <div class="print">
                <button onclick="window.print()" >Print</button>
                <a href="${facture.document_fichier}" download="document_image.jpg"><button>Download</button></a>
                </div>
            </body>
            </html>
        `);
      newWindow.document.close();
    } else {
      alert(
        "The new window could not be opened. Please check your browser settings."
      );
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete("/api/reglements_recus/" + id);
      toast.success("Règlement supprimé avec succès");
      navigate("/reglements_recus");
    } catch (err) {
      console.log(err);
      toast.error("Erreur lors de la suppression du Règlement.");
    }
  };

  const confirmDelete = (id) => {
    const confirmDelete = window.confirm(
      "Voulez-vous vraiment supprimer ce Règlement ?"
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
                        Détails du Règlement Reçus
                      </h3>
                      <br />
                      <ul className="list-arrow" style={{ fontSize: "15px" }}>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Code Tiers:
                          </strong>{" "}
                          {reglement.code_tiers}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Tiers Saisie:
                          </strong>{" "}
                          {reglement.tiers_saisie}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Montant Total à Régler:
                          </strong>{" "}
                          {reglement.montant_total_a_regler}
                        </li>
                        <li>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Observations:
                          </strong>{" "}
                          {reglement.observations}
                        </li>
                      </ul>
                      <h3 className="card-title">Paiements:</h3>
                      <ul className="list-star" style={{ fontSize: "15px" }}>
                        {payements.map((payement, index) => (
                          <li key={index}>
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              Modalité:
                            </strong>{" "}
                            {payement.modalite},
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              {" "}
                              Numéro:
                            </strong>{" "}
                            {payement.num},
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              {" "}
                              Banque:
                            </strong>{" "}
                            {payement.banque},
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              {" "}
                              Date d'échéance:
                            </strong>
                            {new Date(
                              payement.date_echeance
                            ).toLocaleDateString()}
                            , ,
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              {" "}
                              Montant:
                            </strong>{" "}
                            {payement.montant}
                          </li>
                        ))}
                      </ul>
                      <h3 className="card-title">Factures:</h3>
                      <ul className="list-star" style={{ fontSize: "14.5px" }}>
                        {factures.map((facture, index) => (
                          <li key={index}>
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              Numéro Facture:
                            </strong>{" "}
                            {facture.num_facture},
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              {" "}
                              Date Facture:
                            </strong>{" "}
                            {new Date(
                              facture.date_facture
                            ).toLocaleDateString()}
                            ,
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              {" "}
                              Montant Total Facture:
                            </strong>{" "}
                            {facture.montant_total_facture}, <br></br>
                            <strong
                              style={{ color: "#118ab2", fontWeight: "bold" }}
                            >
                              Document / Fichier:
                            </strong>
                            {facture.document_fichier ? (
                              <button
                                className="btn btn-link"
                                onClick={() => openDocumentInNewWindow(facture)}
                              >
                                Voir Document
                              </button>
                            ) : (
                              <span>Pas de document inséré</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="d-flex justify-content-center">
                    {user.role !== "comptable" && (
                      <>
                        <Link
                          to={`/updateReglementRecu/${id}`}
                          className="mr-2"
                        >
                          <button type="button" className="btn btn-success">
                            Modifier
                          </button>
                        </Link>

                        <button
                          type="button"
                          className="btn btn-danger mr-2"
                          onClick={() => confirmDelete(reglement.id)}
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
  );
};

export default DetailsReglementRecu;
