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

const Commandes = () => {
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
        const res = await axios.get("/api/commandes", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      await axios.delete(`/api/commandes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(prev => prev.filter(i => i.id !== id));
      Swal.fire({ icon: "success", title: "Supprimé !", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Erreur", text: "Impossible de supprimer." });
    }
  };

  const filtered = items.filter(a => {
    const q = search.toLowerCase();
    return a.num_commande?.toLowerCase().includes(q) ||
      a.code_tiers?.toLowerCase().includes(q) ||
      a.tiers_saisie?.toLowerCase().includes(q) ||
      a.ajoute_par?.toLowerCase().includes(q);
  });

  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const current = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <PageLayout>
      <PageHeader
        title="Commandes"
        subtitle={`${filtered.length} commande${filtered.length !== 1 ? "s" : ""} trouvé${filtered.length !== 1 ? "s" : ""}`}
        action={user?.role !== "utilisateur" && <AddButton to="/addCommande" label="Nouvelle commande" />}
      />

      {error && <Alert type="danger">{error}</Alert>}

      <Card>
        <div style={{ padding: "16px 20px 0" }}>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </Toolbar>
        </div>
        <div style={{ padding: "0 20px" }}>
          {loading ? <Spinner /> : (
            <>
              <DataTable columns={["Date", "N° commande", "Code tiers", "Tiers", "Montant", "Livraison prévue", "Ajouté par", "Actions"]} empty="Aucune donnée">
                {current.map(a => (
                  <TR key={a.id}>
                    <TD>{a.date_commande ? new Date(a.date_commande).toLocaleDateString('fr-FR') : '—'}</TD>
                    <TD style={{fontFamily:"monospace",fontSize:13}}>{a.num_commande}</TD>
                    <TD style={{fontWeight:500}}>{a.code_tiers}</TD>
                    <TD>{a.tiers_saisie}</TD>
                    <TD style={{fontWeight:600,color:"#1a202c"}}>{(parseFloat(a.montant_commande||0).toLocaleString('fr-FR',{minimumFractionDigits:3})) + ' DT'}</TD>
                    <TD>{a.date_livraison_prevue ? new Date(a.date_livraison_prevue).toLocaleDateString('fr-FR') : '—'}</TD>
                    <TD style={{color:"#718096",fontSize:13}}>{a.ajoute_par}</TD>
                    <TD>
                      <div style={{ display:"flex", gap:6 }}>
                        <ViewBtn to={`/detailsCommande/${a.id}`} />
                        <EditBtn to={`/updateCommande/${a.id}`} />
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

export default Commandes;
