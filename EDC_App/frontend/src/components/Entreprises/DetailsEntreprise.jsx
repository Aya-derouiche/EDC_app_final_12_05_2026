import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../Connexion/UserProvider";

const DetailsEntreprise = ({ isSidebarOpen }) => {
  const { id } = useParams();
  const { user } = useContext(UserContext);

  const [entreprise, setEntreprise] = useState({
    code_entreprise: "",
    date_creation: "",
    identite: "",
    MF_CIN: "",
    responsable: "",
    cnss: "",
    tel: "",
    email: "",
    adresse: "",
  });

  useEffect(() => {
    axios
      .get("/api/entreprises/" + id)
      .then((res) => {
        const data = res.data[0];
        setEntreprise({
          code_entreprise: data.code_entreprise,
          date_creation: data.date_creation,
          identite: data.identite,
          MF_CIN: data["MF/CIN"],
          responsable: data.responsable,
          cnss: data.cnss,
          tel: data.tel,
          email: data.email,
          adresse: data.adresse,
        });
      })
      .catch((err) => console.log(err));
  }, [id]);

  const navigate = useNavigate();

  const handleCancel = () => {
    navigate("/entreprises");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="d-flex justify-content-center align-items-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h3 className="text-center mb-4">
                  Détails de l'Entreprise
                </h3>
                <ul className="list-arrow" style={{ fontSize: "19px" }}>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      Code Entreprise:
                    </strong>{" "}
                    {entreprise.code_entreprise}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      Date de Création:
                    </strong>{" "}
                    {new Date(entreprise.date_creation).toLocaleDateString()}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      Identité:
                    </strong>{" "}
                    {entreprise.identite}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      MF/CIN:
                    </strong>{" "}
                    {entreprise.MF_CIN}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      Responsable:
                    </strong>{" "}
                    {entreprise.responsable}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      CNSS:
                    </strong>{" "}
                    {entreprise.cnss}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      Téléphone:
                    </strong>{" "}
                    {entreprise.tel}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      Email:
                    </strong>{" "}
                    {entreprise.email}
                  </li>
                  <li>
                    <strong style={{ color: "#118ab2", fontWeight: "bold" }}>
                      Adresse:
                    </strong>{" "}
                    {entreprise.adresse}
                  </li>
                </ul>
                <div className="d-flex justify-content-center">
                {user.role !== "utilisateur" && (
                  <Link
                    to={`/updateEntreprise/${id}`}
                    className="btn btn-success mr-2"
                  >
                    Modifier
                  </Link>
                )}
                  <button
                    type="button"
                    className="btn btn-warning"
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

export default DetailsEntreprise;
