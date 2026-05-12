import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const UpdateUser = ({ isSidebarOpen }) => {
  const { id } = useParams();
  const [user, setUser] = useState({
    code_entreprise: "",
    code_user: "",
    identite: "",
    position: "",
    tel: "",
    email: "",
    mot_de_passe: "",
    role: "",
  });

  const [entrepriseCodes, setEntrepriseCodes] = useState([]);
  const navigate = useNavigate();

  const handleClick = async (e) => {
    e.preventDefault();
    if (!id) {
      console.log("ID de l'utilisateur non valide");
      return;
    }
    try {
      await axios.put(`/api/users/${id}`, user);
      Swal.fire({
        icon: "success",
        title: "Succès",
        text: "Utilisateur mis à jour avec succès.",
      });
      navigate("/users");
    } catch (err) {
      console.log(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "La mise à jour de l'Utilisateur a échoué.",
      });
    }
  };

  useEffect(() => {
    const fetchEntrepriseCodes = async () => {
      try {
        const res = await axios.get("/api/code_entreprises");
        setEntrepriseCodes(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchEntrepriseCodes();
  }, []);

  useEffect(() => {
    if (!id) {
      console.log("ID de l'utilisateur non valide");
      return;
    }
    axios
      .get(`/api/users/${id}`)
      .then((res) => {
        const data = res.data;
        setUser({
          code_entreprise: data.code_entreprise || "",
          code_user: data.code_user || "",
          identite: data.identite || "",
          position: data.position || "",
          tel: data.tel || "",
          email: data.email || "",
          mot_de_passe: "",
          role: data.role || "",
        });
      })
      .catch((err) => console.log(err));
  }, [id]);

  const handleCancel = () => {
    navigate("/users");
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="card">
          <div className="card-body">
            <h2 className="text-center">Modifier un Utilisateur</h2>
            <br /> <br />
            <form className="forms-sample">
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Code Entreprise:</label>
                    <select
                      className="form-control form-control-lg"
                      name="code_entreprise"
                      style={{ color: "black" }}
                      value={user.code_entreprise}
                      onChange={(e) =>
                        setUser({ ...user, code_entreprise: e.target.value })
                      }
                      disabled={user.code_entreprise === ""}
                    >
                      <option value="" style={{ color: "black" }}>
                        Code Entreprise
                      </option>
                      {entrepriseCodes.map((entrepriseCode) => (
                        <option
                          key={entrepriseCode.code_entreprise}
                          value={entrepriseCode.code_entreprise}
                          style={{ color: "black" }}
                        >
                          {entrepriseCode.code_entreprise}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Code Utilisateur:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Code Utilisateur"
                      value={user.code_user}
                      onChange={(e) =>
                        setUser({ ...user, code_user: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Rôle:</label>
                    <select
                      className="form-control"
                      name="role"
                      value={user.role} // Valeur actuelle du rôle
                      onChange={(e) =>
                        setUser({ ...user, role: e.target.value })
                      } // Mise à jour du rôle dans l'état
                      style={{ color: "black" }}
                    >
                      <option value="">Sélectionnez un rôle</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="comptable">Comptable</option>
                      <option value="utilisateur">Utilisateur</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Identité:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Identité"
                      value={user.identite}
                      onChange={(e) =>
                        setUser({ ...user, identite: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Position:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Position"
                      value={user.position}
                      onChange={(e) =>
                        setUser({ ...user, position: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Mot de passe:</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Mot de passe"
                      value={user.mot_de_passe}
                      onChange={(e) =>
                        setUser({ ...user, mot_de_passe: e.target.value })
                      }
                    />
                    <span style={{ fontSize: "12px" }}>
                      NB: laissez vide si vous ne voulez pas le changer
                    </span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Téléphone:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Téléphone"
                      value={user.tel}
                      onChange={(e) =>
                        setUser({ ...user, tel: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Email"
                      value={user.email}
                      onChange={(e) =>
                        setUser({ ...user, email: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <br />
              <div className="d-flex justify-content-center">
                <button
                  type="submit"
                  className="btn btn-primary mr-2"
                  onClick={handleClick}
                >
                  Submit
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

export default UpdateUser;
