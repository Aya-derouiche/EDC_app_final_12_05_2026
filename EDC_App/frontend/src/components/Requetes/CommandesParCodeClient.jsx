import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const CommandesParCodeClient = ({isSidebarOpen}) => {
  const [codeEntreprise, setCodeEntreprise] = useState('');
  const [commandes, setCommandes] = useState([]);
  const [error, setError] = useState('');

  const fetchCommandes = async () => {
    if (!codeEntreprise) {
      setError('Veuillez entrer un code d\'entreprise.');
      return;
    }

    try {
      const response = await axios.get('/api/commandes-par-code-client', {
        params: { code_entreprise: codeEntreprise },
      });
      setCommandes(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching commandes:', error);
      setError('Une erreur est survenue lors de la récupération des commandes.');
    }
  };

  return (
      <div className="main-panel">
        <div className={`content-wrapper ${isSidebarOpen ? "shifted" : ""}`}>
          <div className="row d-flex justify-content-center align-items-center mt-3">
            <div className="col-lg-12  grid-margin stretch-card">
              <div className="card">
                <div className="card-body">
                  <Link style={{ fontSize: "25px" }} to="/requetes">
                    <i className="bi bi-arrow-left-circle"></i>
                  </Link>
                  <h3 className="text-center">Commandes par Code Entreprise</h3>
                  <br />
                  <br />
                  <div className="d-flex justify-content-center mb-3">
                    <input
                        className="form-control form-control-sm w-auto mx-2"
                        type="text"
                        placeholder="Entrer Code Entreprise"
                        value={codeEntreprise}
                        onChange={(e) => setCodeEntreprise(e.target.value)}
                    />
                    <button className="btn btn-behance mx-2" onClick={fetchCommandes}>
                      Rechercher
                    </button>
                  </div>
                  {error && <p style={{ color: 'red' }}>{error}</p>}
                  <br />
                  {commandes.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
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
                      <p className="text-center">Aucune commande trouvée pour ce code entreprise.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default CommandesParCodeClient;
