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

const statusColor = (s) => {
  if (!s) return "secondary";
  const l = s.toLowerCase();
  if (l.includes("payé") || l.includes("valid")) return "success";
  if (l.includes("annul")) return "danger";
  if (l.includes("attent") || l.includes("cours")) return "warning";
  return "info";
};

const Achats = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [achats, setAchats] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }
    const fetchAchats = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/achats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAchats(res.data);
      } catch (err) {
        if (err.response?.status === 403) navigate("/");
        else setError("Erreur lors du chargement des achats.");
      } finally {
        setLoading(false);
      }
    };
    fetchAchats();
  }, [navigate]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Supprimer cet achat ?",
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
      await axios.delete(`/api/achats/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setAchats(prev => prev.filter(a => a.id !== id));
      Swal.fire({ icon: "success", title: "Supprimé !", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Erreur", text: "Impossible de supprimer cet achat." });
    }
  };

  const filtered = achats.filter(a => {
    const q = search.toLowerCase();
    return (
      a.identite?.toLowerCase().includes(q) ||
      a.code_tiers?.toLowerCase().includes(q) ||
      a.num_piece?.toLowerCase().includes(q) ||
      a.type_piece?.toLowerCase().includes(q) ||
      a.statut?.toLowerCase().includes(q) ||
      a.ajoute_par?.toLowerCase().includes(q)
    );
  });

  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const current = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const cols = ["Date saisie", "Code tiers", "Tiers", "N° pièce", "Type", "Montant total", "Statut", "Ajouté par", "Actions"];

  return (
    <PageLayout>
      <PageHeader
        title="Achats de Biens et Services"
        subtitle={`${filtered.length} achat${filtered.length !== 1 ? "s" : ""} trouvé${filtered.length !== 1 ? "s" : ""}`}
        action={user?.role !== "utilisateur" && <AddButton to="/addAchat" label="Nouvel achat" />}
      />

      {error && <Alert type="danger">{error}</Alert>}

      <Card>
        <div style={{ padding: "16px 20px 0" }}>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Rechercher par tiers, N° pièce, statut..."
            />
          </Toolbar>
        </div>

        <div style={{ padding: "0 20px" }}>
          {loading ? <Spinner /> : (
            <>
              <DataTable columns={cols} empty="Aucun achat enregistré">
                {current.map(a => (
                  <TR key={a.id}>
                    <TD>{a.date_saisie ? new Date(a.date_saisie).toLocaleDateString("fr-FR") : "—"}</TD>
                    <TD style={{ fontWeight: 500 }}>{a.code_tiers}</TD>
                    <TD>{a.identite || a.tiers_saisie}</TD>
                    <TD style={{ fontFamily: "monospace", fontSize: 13 }}>{a.num_piece}</TD>
                    <TD><Badge label={a.type_piece} color="info" /></TD>
                    <TD style={{ fontWeight: 600, color: "#1a202c" }}>
                      {parseFloat(a.montant_total_piece || 0).toLocaleString("fr-FR", { minimumFractionDigits: 3 })} DT
                    </TD>
                    <TD><Badge label={a.statut} color={statusColor(a.statut)} /></TD>
                    <TD style={{ color: "#718096", fontSize: 13 }}>{a.ajoute_par}</TD>
                    <TD>
                      <div style={{ display: "flex", gap: 6 }}>
                        <ViewBtn to={`/detailsAchat/${a.id}`} />
                        {user?.role !== "utilisateur" && (
                          <>
                            <EditBtn to={`/updateAchat/${a.id}`} />
                            <DeleteBtn onClick={() => handleDelete(a.id)} />
                          </>
                        )}
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

export default Achats;
