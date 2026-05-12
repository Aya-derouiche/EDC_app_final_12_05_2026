import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider.jsx";
import api from "../../api/axios";
import {
  PageLayout, PageHeader, AddButton, Card,
  Toolbar, SearchInput, DataTable, TR, TD,
  EditBtn, DeleteBtn, Badge,
  Pagination, Alert, Spinner,
} from "../UI.jsx";

const ITEMS_PER_PAGE = 8;

const DocumentComptabilite = () => {
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
      setError("");
      try {
        const res = await api.get("/v1/documents");
        setItems(Array.isArray(res.data) ? res.data : []);
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
      title: "Suppression non disponible",
      text: "La suppression document n'est pas encore exposée sur cette API.",
      icon: "info",
      confirmButtonText: "OK",
    });
    if (!result.isConfirmed) return;
    void id;
  };

  const filtered = items.filter((a) => {
    const q = search.toLowerCase();
    return (
      String(a.nature || "").toLowerCase().includes(q) ||
      String(a.designation || "").toLowerCase().includes(q) ||
      String(a.destinataire || "").toLowerCase().includes(q) ||
      String(a.priorite || "").toLowerCase().includes(q) ||
      String(a.ajoute_par_nom || "").toLowerCase().includes(q)
    );
  });

  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const current = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <PageLayout>
      <PageHeader
        title="Documents Comptabilité"
        subtitle={`${filtered.length} document${filtered.length !== 1 ? "s" : ""} trouvé${filtered.length !== 1 ? "s" : ""}`}
        action={user?.role !== "utilisateur" && <AddButton to="/addDocCompta" label="Nouveau document" />}
      />

      {error && <Alert type="danger">{error}</Alert>}

      <Card>
        <div style={{ padding: "16px 20px 0" }}>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </Toolbar>
        </div>
        <div style={{ padding: "0 20px" }}>
          {loading ? <Spinner /> : (
            <>
              <DataTable columns={["Date", "Nature", "Désignation", "Destinataire", "Priorité", "Ajouté par", "Actions"]} empty="Aucune donnée">
                {current.map((a) => (
                  <TR key={a.id}>
                    <TD>{a.date ? new Date(a.date).toLocaleDateString("fr-FR") : "—"}</TD>
                    <TD>{a.nature || "—"}</TD>
                    <TD>{a.designation || "—"}</TD>
                    <TD>{a.destinataire || "—"}</TD>
                    <TD><Badge label={a.priorite || "—"} color={(a.priorite === "Haute" ? "danger" : "default")} /></TD>
                    <TD style={{ color: "#718096", fontSize: 13 }}>{a.ajoute_par_nom || "—"}</TD>
                    <TD>
                      <div style={{ display: "flex", gap: 6 }}>
                        <EditBtn to={`/updateDocCompta/${a.id}`} />
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

export default DocumentComptabilite;
