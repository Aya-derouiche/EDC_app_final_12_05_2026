import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const CommandeDetailleesParPeriode = ({ isSidebarOpen }) => {
  const [commandes, setCommandes] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch the list of clients for the dropdown
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

  const fetchCommandes = async () => {
    if (!startDate || !endDate) {
      setError("Veuillez sélectionner les dates de début et de fin.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("La date de début ne peut pas être supérieure à la date de fin.");
      return;
    }

    try {
      const response = await axios.get("/api/commandes-detaillees", {
        params: { startDate, endDate, company: selectedClient },
      });
      setCommandes(response.data);
      setError("");
    } catch (error) {
      console.error("Error fetching commandes", error);
      setError("Une erreur est survenue lors de la récupération des commandes.");
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
                <h3 className="text-center">Commandes Détailées par Période</h3>
                <br />
                <br />
                <br />

                <div className="d-flex justify-content-center mb-3">
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
                    className="form-control w-auto mx-2"
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
                  <button className="btn btn-behance mx-2" onClick={fetchCommandes}>
                    Rechercher
                  </button>
                </div>
                {error && <p style={{ color: "red" }}>{error}</p>}
                <br />
                {commandes.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date de la commande</th>
                          <th>N° de la commande</th>
                          <th>Code Tiers</th>
                          <th>Montant de la Commande</th>
                          <th>Date de livraison prévue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commandes.map((commande, index) => (
                          <tr key={index}>
                            <td>{new Date(commande.date_commande).toLocaleDateString()}</td>
                            <td>{commande.num_commande}</td>
                            <td>{commande.code_tiers}</td>
                            <td>{commande.montant_commande} DT</td>
                            <td>{new Date(commande.date_livraison_prevue).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center">Aucune commande trouvée pour cette période.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandeDetailleesParPeriode;
