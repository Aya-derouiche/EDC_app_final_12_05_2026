import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";


const UpdateEntreprise = ({ isSidebarOpen }) => {
  const { id } = useParams();

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

  const navigate = useNavigate();

  const handleClick = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/entreprises/${id}`, entreprise);
      Swal.fire({
        icon: "success",
        title: "Succès",
        text: "Entreprise mis à jour avec succès.",
      });
      navigate("/entreprises");
    } catch (err) {
      console.log(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "La mise à jour de l'entreprise a échoué.",
      });
    }
    
  };

  useEffect(() => {
    axios
      .get(`/api/entreprises/${id}`)
      .then((res) => {
        const data = res.data[0];
        setEntreprise({
          code_entreprise: data.code_entreprise,
          date_creation: data.date_creation
            ? data.date_creation.split("T")[0]
            : "",
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

  const handleCancel = () => {
    navigate("/entreprises");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="card">
          <div className="card-body">
            <h2 className="text-center">Modifier une Entreprise</h2>
            <br></br>
            <form className="forms-sample">
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Code Entreprise:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="code_entreprise"
                      value={entreprise?.code_entreprise ?? ""}
                      onChange={(e) =>
                        setEntreprise({
                          ...entreprise,
                          code_entreprise: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Date de Création:</label>
                    <input
                      type="date"
                      className="form-control"
                      name="date_creation"
                      value={entreprise?.date_creation ?? ""}
                      onChange={(e) =>
                        setEntreprise({
                          ...entreprise,
                          date_creation: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Identité:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="identite"
                      value={entreprise?.identite ?? ""}
                      onChange={(e) =>
                        setEntreprise({
                          ...entreprise,
                          identite: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>MF/CIN:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="MF_CIN"
                      value={entreprise?.MF_CIN ?? ""}
                      onChange={(e) =>
                        setEntreprise({ ...entreprise, MF_CIN: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Responsable:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="responsable"
                      value={entreprise?.responsable ?? ""}
                      onChange={(e) =>
                        setEntreprise({
                          ...entreprise,
                          responsable: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>CNSS:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="cnss"
                      value={entreprise?.cnss ?? ""}
                      onChange={(e) =>
                        setEntreprise({ ...entreprise, cnss: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Adresse:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="adresse"
                      value={entreprise?.adresse ?? ""}
                      onChange={(e) =>
                        setEntreprise({
                          ...entreprise,
                          adresse: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Telephone:</label>
                    <input
                      type="number"
                      className="form-control"
                      name="tel"
                      value={entreprise?.tel ?? ""}
                      onChange={(e) =>
                        setEntreprise({ ...entreprise, tel: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={entreprise?.email ?? ""}
                      onChange={(e) =>
                        setEntreprise({ ...entreprise, email: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <br></br>
              <div className="d-flex justify-content-center">
                <button
                  type="submit"
                  className="btn btn-primary mr-2"
                  onClick={handleClick}
                >
                  Submit
                </button>
                &nbsp; &nbsp;
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

export default UpdateEntreprise;
