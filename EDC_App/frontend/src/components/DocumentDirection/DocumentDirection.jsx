import React, { useEffect, useState, useContext } from "react";
import api from "../../api/axios";
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

const DocumentDirection = () => {
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
        const res = await api.get("/v1/documents-direction");
        setItems(res.data);
      } catch (err) {
        if (err.response?.status === 403) navigate("/");
        else setError("Erreur lors du chargement des donnÃ©es.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Supprimer cet Ã©lÃ©ment ?",
      text: "Cette action est irrÃ©versible.",
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
      await api.delete(`/v1/documents-direction/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      Swal.fire({ icon: "success", title: "SupprimÃ© !", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Erreur", text: "Impossible de supprimer." });
    }
  };

  const filtered = items.filter(a => {
    const q = search.toLowerCase();
    return a.nature?.toLowerCase().includes(q) ||
      a.designation?.toLowerCase().includes(q) ||
      a.destinataire?.toLowerCase().includes(q) ||
      a.priorite?.toLowerCase().includes(q) ||
      String(a.ajoute_par_nom || a.ajoute_par || "").toLowerCase().includes(q);
  });

  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const current = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <PageLayout>
      <PageHeader
        title="Documents Direction"
        subtitle={`${filtered.length} document${filtered.length !== 1 ? "s" : ""} trouvÃ©${filtered.length !== 1 ? "s" : ""}`}
        action={user?.role !== "utilisateur" && <AddButton to="/addDocDirection" label="Nouveau document" />}
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
              <DataTable columns={["Date", "Nature", "DÃ©signation", "Destinataire", "PrioritÃ©", "AjoutÃ© par", "Actions"]} empty="Aucune donnÃ©e">
                {current.map(a => (
                  <TR key={a.id}>
                    <TD>{a.date ? new Date(a.date).toLocaleDateString('fr-FR') : 'â€”'}</TD>
                    <TD>{a.nature || 'â€”'}</TD>
                    <TD>{a.designation || 'â€”'}</TD>
                    <TD>{a.destinataire || 'â€”'}</TD>
                    <TD><Badge label={a ? a.priorite : "â€”"} color={(a.priorite==='Haute'?'danger':'default')} /></TD>
                    <TD style={{color:"#718096",fontSize:13}}>{a.ajoute_par_nom || a.ajoute_par || "—"}</TD>
                    <TD>
                      <div style={{ display:"flex", gap:6 }}>
                        
                        <EditBtn to={`/updateDocDirection/${a.id}`} />
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

export default DocumentDirection;




