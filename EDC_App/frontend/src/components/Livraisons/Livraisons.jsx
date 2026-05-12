import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider.jsx";
import {
  PageLayout, PageHeader, AddButton, Card,
  Toolbar, SearchInput, DataTable, TR, TD,
  EditBtn, DeleteBtn, ViewBtn, Badge,
  Pagination, Alert, Spinner,
} from "../UI.jsx";

const ITEMS_PER_PAGE = 8;

const Livraisons = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/livraisons", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Données reçues:", res.data);
        setItems(res.data);
      } catch (err) {
        if (err.response?.status === 403) navigate("/");
        else setError("Erreur lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Supprimer cet élément ?",
      text: "Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#a0aec0",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/livraisons/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(prev => prev.filter(i => i.id !== id));
      Swal.fire({ icon: "success", title: "Supprimé !", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Erreur", text: "Impossible de supprimer." });
    }
  };

  const filtered = items.filter(a => {
    const q = search.toLowerCase();
    return a.num_bl?.toLowerCase().includes(q) ||
      a.code_tiers?.toLowerCase().includes(q) ||
      a.tiers_saisie?.toLowerCase().includes(q) ||
      a.reference_commande?.toLowerCase().includes(q) ||
      a.identite?.toLowerCase().includes(q) ||      // Recherche par nom
      a.ajoute_par?.toLowerCase().includes(q);       // Recherche par rôle
  });

  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const current = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Fonction pour afficher le nom avec badge de rôle
  const renderAjoutePar = (item) => {
    const nom = item.identite || "Inconnu";  // Utiliser identite au lieu de nom_ajoute_par
    const role = item.ajoute_par;            // ajoute_par contient déjà le rôle (ex: "comptable")
    
    if (role === "comptable") {
      return (
        <div>
          <span style={{ fontWeight: 500 }}>{nom}</span>
          <span style={{ 
            marginLeft: 8, 
            fontSize: 11, 
            padding: '2px 8px', 
            borderRadius: '12px',
            backgroundColor: '#e3f2fd', 
            color: '#1976d2',
            fontWeight: 500
          }}>Comptable</span>
        </div>
      );
    } else if (role === "utilisateur") {
      return (
        <div>
          <span style={{ fontWeight: 500 }}>{nom}</span>
          <span style={{ 
            marginLeft: 8, 
            fontSize: 11, 
            padding: '2px 8px', 
            borderRadius: '12px',
            backgroundColor: '#fff3e0', 
            color: '#f57c00',
            fontWeight: 500
          }}>Client</span>
        </div>
      );
    }
    return <span>{nom}</span>;
  };

  return (
    <PageLayout>
      <PageHeader
        title="Livraisons"
        subtitle={`${filtered.length} livraison${filtered.length !== 1 ? "s" : ""} trouvé${filtered.length !== 1 ? "s" : ""}`}
        action={user?.role !== "utilisateur" && <AddButton to="/addLivraison" label="Nouvelle livraison" />}
      />

      {error && <Alert type="danger">{error}</Alert>}

      <Card>
        <div style={{ padding: "16px 20px 0" }}>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher par numéro, tiers, ou nom..."
            />
          </Toolbar>
        </div>
        <div style={{ padding: "0 20px" }}>
          {loading ? <Spinner /> : (
            <>
              <DataTable 
                columns={["Date BL", "N° BL", "Code tiers", "Tiers", "Réf. commande", "Montant total", "Ajouté par", "Actions"]} 
                empty="Aucune donnée"
              >
                {current.map(a => (
                  <TR key={a.id}>
                    <TD>{a.date_BL ? new Date(a.date_BL).toLocaleDateString('fr-FR') : '—'}</TD>
                    <TD style={{fontFamily:"monospace",fontSize:13}}>{a.num_bl || '—'}</TD>
                    <TD style={{fontWeight:500}}>{a.code_tiers || '—'}</TD>
                    <TD>{a.tiers_saisie || '—'}</TD>
                    <TD>{a.reference_commande || '—'}</TD>
                    <TD style={{fontWeight:600,color:"#1a202c"}}>
                      {(parseFloat(a.montant_total_BL || a.montant_total_bl || 0).toLocaleString('fr-FR',{minimumFractionDigits:3})) + ' DT'}
                    </TD>
                    <TD style={{color:"#718096",fontSize:13}}>
                      {renderAjoutePar(a)}
                    </TD>
                    <TD>
                      <div style={{ display:"flex", gap:6 }}>
                        <ViewBtn to={`/detailsLivraison/${a.id}`} />
                        <EditBtn to={`/updateLivraison/${a.id}`} />
                        {user?.role !== "utilisateur" && <DeleteBtn onClick={() => handleDelete(a.id)} />}
                      </div>
                    </TD>
                  </TR>
                ))}
              </DataTable>
              {filtered.length > ITEMS_PER_PAGE && (
                <Pagination
                  pageCount={pageCount}
                  currentPage={page}
                  onPageChange={({ selected }) => setPage(selected)}
                  total={filtered.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              )}
            </>
          )}
        </div>
        <div style={{ height: 16 }} />
      </Card>
    </PageLayout>
  );
};

export default Livraisons;