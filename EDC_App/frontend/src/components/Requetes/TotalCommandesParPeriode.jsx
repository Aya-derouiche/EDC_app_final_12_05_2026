import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const TotalCommandesParPeriode = ({ isSidebarOpen }) => {
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClient, setSelectedClient] = useState(""); // Selected company
  const [clients, setClients] = useState([]); // List of companies
  const [error, setError] = useState("");

  // Fetch list of companies when component mounts
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get("/api/clients");
        setClients(response.data);
      } catch (error) {
        console.error("Error fetching clients", error);
        setError("An error occurred while fetching the list of companies.");
      }
    };

    fetchClients();
  }, []);

  // Fetch total orders by period and company
  const fetchTotal = async () => {
    try {
      const response = await axios.get("/api/total-commandes-par-periode", {
        params: { startDate, endDate, company: selectedClient },
      });
      if (response.data.length > 0 && response.data[0].total !== null) {
        setTotal(response.data[0].total);
      } else {
        setTotal(0);
      }
    } catch (error) {
      console.error("Error fetching total commandes", error);
      setError("An error occurred while fetching the total commandes.");
    }
  };

  // Handle company selection change
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
              <Link style={{fontSize: "25px"}}  to="/requetes">                
                    <i className="bi bi-arrow-left-circle"></i>
              </Link>
                <h3 className="text-center">
                  Total des commandes par période </h3>
                <br /><br /><br />
              
                <div className="d-flex justify-content-center mb-3">
                  
                  {/* Select dropdown for choosing the company */}
                  <select
                    className="form-control w-auto mx-2"
                    style={{ color: "black" }}
                    value={selectedClient}
                    onChange={handleClientChange}
                  >
                    <option value="">Toutes les entreprises</option>
                    {clients.map((client) => (
                      <option key={client.code_entreprise} value={client.code_entreprise}>
                        {`${client.code_entreprise} - ${client.identite}`}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    className="form-control  w-auto mx-2"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <input
                    className="form-control  w-auto mx-2"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />

                  

                  <button className="btn btn-behance mx-2" onClick={fetchTotal}>
                    Rechercher
                  </button>
                </div>

                {error && <p style={{ color: "red" }}>{error}</p>}
                <br />
                {total === 0 ? (
                  <h3 className="text-center">
                    Total des commandes dans cette période est égale à 0
                  </h3>
                ) : (
                  <h3 className="text-center">
                    Total des commandes dans cette période pour {selectedClient || "toutes les entreprises"} est égale à: {total}
                  </h3>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalCommandesParPeriode;
