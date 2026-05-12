import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const EtatVersementParPeriode = ({ isSidebarOpen }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClient, setSelectedClient] = useState(""); // Selected company
  const [clients, setClients] = useState([]); // List of companies
  const [totalVersement, setTotalVersement] = useState(0); // Total versement amount
  const [error, setError] = useState("");

  // Fetch list of companies on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get("/api/clients");
        setClients(response.data);
      } catch (error) {
        console.error("Error fetching clients", error);
        setError("Une erreur est survenue lors de la récupération de la liste des entreprises.");
      }
    };

    fetchClients();
  }, []);

  // Fetch versement data by date range and company
  const fetchVersement = async () => {
    if (!startDate || !endDate) {
      setError("Veuillez sélectionner les dates de début et de fin.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("La date de début ne peut pas être supérieure à la date de fin.");
      return;
    }

    try {
      const response = await axios.get("/api/etat-versement-par-periode", {
        params: { startDate, endDate, company: selectedClient },
      });
      setTotalVersement(response.data[0]?.totalVersement || 0);
      setError("");
    } catch (error) {
      console.error("Error fetching versements", error);
      setError("Une erreur est survenue lors de la récupération des versements.");
    }
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
                <h2 className="text-center">Etat de versement par période</h2>
                <br />
                <br />
                <br />
                <div className="d-flex justify-content-center mb-3">
                  {/* Select company */}
                  <select
                    className="form-control w-auto mx-2"
                    value={selectedClient}
                    style={{color: "black"}}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">Toutes les entreprises</option>
                    {clients.map((client) => (
                      <option key={client.code_entreprise} value={client.code_entreprise}>
                        {`${client.code_entreprise} - ${client.identite}`}
                      </option>
                    ))}
                  </select>

                  {/* Start date */}
                  <input
                    className="form-control w-auto mx-2"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />

                  {/* End date */}
                  <input
                    className="form-control w-auto mx-2"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />

                  <button className="btn btn-behance mx-2" onClick={fetchVersement}>
                    Rechercher
                  </button>
                </div>

                {error && <p style={{ color: "red" }}>{error}</p>}
                <br />

                {/* Display total versement */}
                <h3 className="text-center">
                  Total des versements: {totalVersement} DT
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EtatVersementParPeriode;
