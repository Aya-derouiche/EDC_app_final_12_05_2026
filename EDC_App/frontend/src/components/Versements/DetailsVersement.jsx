import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";

const DetailsVersement = ({ isSidebarOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [versement, setVersement] = useState({
    date_versement: "",
    reference_bordereau_bulletin: "",
    observations: "",
    document_fichier: "",
  });

  const [payements, setPayements] = useState([
    {
      modalite: "",
      num: "",
      banque: "",
      montant: "",
      code_tiers: "",
      tiers_saisie: "",
    },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `/api/versement/${id}`
        );
        const { data } = response;
        setVersement(
          data.versement || {
            date_versement: "",
            reference_bordereau_bulletin: "",
            observations: "",
            document_fichier: "",
          }
        );
        setPayements(data.payements || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [id]);

  function openDocumentInNewWindow(versement) {
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
                <img src="${versement.document_fichier}" alt="Document Image">
                <br></br><br></br>
                <div class="print">
                <button onclick="window.print()" >Print</button>
                <a href="${versement.document_fichier}" download="document_image.jpg"><button>Download</button></a>
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

  const handleCancel = () => {
    navigate("/versements");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="d-flex justify-content-center align-items-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-12">
                    <h3 className="title text-center">Détails du Versement</h3>
                    <br />
                    <ul className="list-arrow" style={{ fontSize: "15px" }}>
                      <li>
                        <strong
                          style={{ color: "#118ab2", fontWeight: "bold" }}
                        >
                          Date de versement:
                        </strong>{" "}
                        {new Date(versement.date_versement).toLocaleDateString()}

                      </li>
                      <li>
                        <strong
                          style={{ color: "#118ab2", fontWeight: "bold" }}
                        >
                          Référence du bordereau ou bulletin:
                        </strong>{" "}
                        {versement.reference_bordereau_bulletin}
                      </li>
                      <li>
                        <strong
                          style={{ color: "#118ab2", fontWeight: "bold" }}
                        >
                          Observations:
                        </strong>{" "}
                        {versement.observations}
                      </li>
                      <li>
                        <strong
                          style={{ color: "#118ab2", fontWeight: "bold" }}
                        >
                          Document / Fichier:
                        </strong>{" "}
                        {versement.document_fichier ? (
                          <button
                            className="btn btn-link"
                            onClick={() => openDocumentInNewWindow(versement)}
                          >
                            Voir Document
                          </button>
                        ) : (
                          <span>Pas de document inséré</span>
                        )}
                      </li>
                    </ul>
                    <h3 className="card-title">Détails des Paiements</h3>
                    <ul className="list-arrow" style={{ fontSize: "15px" }}>
                      {payements.map((payement, index) => (
                        <li key={index}>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Modalité:
                          </strong>{" "}
                          {payement.modalite},{" "}
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Numéro:
                          </strong>{" "}
                          {payement.num},{" "}
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Banque:
                          </strong>{" "}
                          {payement.banque}, <br></br>
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Code Tiers:
                          </strong>{" "}
                          {payement.code_tiers},{" "}
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Tiers à Saisir:
                          </strong>{" "}
                          {payement.tiers_saisie},{" "}
                          <strong
                            style={{ color: "#118ab2", fontWeight: "bold" }}
                          >
                            Montant:
                          </strong>{" "}
                          {payement.montant}
                        </li>
                      ))}
                      <br></br>
                    </ul>
                  </div>
                </div>
                <br></br>
                <div
                  className="btn-group"
                  role="group"
                  style={{ marginLeft: "200px" }}
                >
                  <Link to={`/updateVersement/${id}`} className="mr-2">
                    <button type="button" className="btn btn-success">
                      Modifier
                    </button>
                  </Link>
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
  );
};

export default DetailsVersement;
