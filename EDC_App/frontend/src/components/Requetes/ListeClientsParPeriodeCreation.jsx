import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const ListeClientsParPeriodeCreation = ({ isSidebarOpen }) => {
  const [clients, setClients] = useState([]);
  const [dateCreation, setDateCreation] = useState("");
  const [selectedClient, setSelectedClient] = useState(""); // Selected company
  const [clientsList, setClientsList] = useState([]); // List of companies
  const [error, setError] = useState("");

  // Fetch list of companies when component mounts
  useEffect(() => {
    const fetchClientsList = async () => {
      try {
        const response = await axios.get("/api/clients");
        setClientsList(response.data);
      } catch (error) {
        console.error("Error fetching clients list", error);
        setError("An error occurred while fetching the list of companies.");
      }
    };

    fetchClientsList();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(
        "/api/liste-clients-par-periode-creation",
        {
          params: { dateCreation, company: selectedClient },
        }
      );
      setClients(response.data);
      setError("");
    } catch (error) {
      console.error("Error fetching clients", error);
      setError("An error occurred while fetching the clients.");
    }
  };

  const handleClientChange = (e) => {
    setSelectedClient(e.target.value);
  };

  return (
    <div className="main-panel">
      <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <Link style={{ fontSize: "25px" }} to="/requetes">
                  <i className="bi bi-arrow-left-circle"></i>
                </Link>
                <h3 className="text-center">
                  Liste des entreprises par période de création
                </h3>
                <br />
                <br /> <br />
                <div className="d-flex justify-content-center mb-3">
                  {/* Select dropdown for choosing the company */}
                  <select
                    className="form-control w-auto mx-2"
                    style={{ color: "black" }}
                    value={selectedClient}
                    onChange={handleClientChange}
                  >
                    <option value="">Toutes les entreprises</option>
                    {clientsList.map((client) => (
                      <option key={client.code_entreprise} value={client.code_entreprise}>
                        {`${client.code_entreprise} - ${client.identite}`}
                      </option>
                    ))}
                  </select>

                  <input
                    className="form-control w-auto mx-2"
                    type="date"
                    value={dateCreation}
                    onChange={(e) => setDateCreation(e.target.value)}
                  />
                  <button className="btn btn-behance mx-2" onClick={fetchClients}>
                    Rechercher
                  </button>
                </div>
                {error && <p style={{ color: "red" }}>{error}</p>}
                <br />
                {clients.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Code Entreprise</th>
                          <th>Date de Creation</th>
                          <th>Identité</th>
                          <th>Responsable</th>
                          <th>Adresse</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((ent) => (
                          <tr key={ent.id}>
                            <td>{ent.code_entreprise}</td>
                            <td>{new Date(ent.date_creation).toLocaleDateString()}</td>
                            <td>{ent.identite}</td>
                            <td>{ent.responsable}</td>
                            <td>{ent.adresse}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center">Aucune entreprise trouvée pour cette date.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListeClientsParPeriodeCreation;
