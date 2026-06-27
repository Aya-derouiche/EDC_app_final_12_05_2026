import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider.jsx";
import AddUser from "./AddUser.jsx";
import {
  PageLayout, PageHeader, Card,
  Toolbar, SearchInput, DataTable, TR, TD,
  EditBtn, DeleteBtn, Badge,
  Pagination, Alert, Spinner,
} from "../UI.jsx";

const ITEMS_PER_PAGE = 8;
const USERS_ALLOWED = {
  identite: "ines",
  position: "comptable senior",
  role: "comptable",
};

function canViewUsers(user) {
  const identite = String(user?.identite || "").trim().toLowerCase();
  const position = String(user?.position || "").trim().toLowerCase();
  const role = String(user?.role || "").trim().toLowerCase();
  return (
    identite === USERS_ALLOWED.identite &&
    position === USERS_ALLOWED.position &&
    role === USERS_ALLOWED.role
  );
}

const Utilisateurs = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddCard, setShowAddCard] = useState(false);

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 403) navigate("/");
      else setError("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canViewUsers(user)) {
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [navigate, user]);

  const allowed = canViewUsers(user);

  if (!allowed) {
    return (
      <PageLayout>
        <PageHeader title="Utilisateurs" subtitle="Accès restreint" />
        <Card>
          <div style={{ padding: 24, color: "#64748b", fontSize: 15 }}>
            Cette liste est réservée à <strong>ines</strong>.
          </div>
        </Card>
      </PageLayout>
    );
  }

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
      await axios.delete(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
      Swal.fire({ icon: "success", title: "Supprimé !", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Erreur", text: "Impossible de supprimer." });
    }
  };

  const filtered = items.filter((a) => {
    const q = search.toLowerCase();
    return a.code_user?.toLowerCase().includes(q) ||
      a.identite?.toLowerCase().includes(q) ||
      a.position?.toLowerCase().includes(q) ||
      a.role?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q);
  });

  const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const current = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <PageLayout>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${filtered.length} utilisateur${filtered.length !== 1 ? "s" : ""} trouvé${filtered.length !== 1 ? "s" : ""}`}
        action={allowed && (
          <button
            type="button"
            onClick={() => setShowAddCard(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 20px",
              background: "#27ae60",
              color: "#fff",
              borderRadius: 9,
              border: "none",
              fontSize: 13.5,
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(39,174,96,0.3)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nouvel utilisateur
          </button>
        )}
      />

      {error && <Alert type="danger">{error}</Alert>}

      <Card>
        <div style={{ padding: "16px 20px 0" }}>
          <Toolbar>
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </Toolbar>
        </div>
        <div style={{ padding: "0 20px" }}>
          {loading ? <Spinner /> : (
            <>
              <DataTable columns={["Code", "Identité", "Position", "Rôle", "Tél.", "Email", "Actions"]} empty="Aucune donnée">
                {current.map((a) => (
                  <TR key={a.id}>
                    <TD style={{ fontFamily: "monospace", fontSize: 13 }}>{a.code_user}</TD>
                    <TD style={{ fontWeight: 500 }}>{a.identite}</TD>
                    <TD>{a.position || "—"}</TD>
                    <TD><Badge label={a?.role || "—"} color={a.role === "comptable" ? "success" : "secondary"} /></TD>
                    <TD>{a.tel || "—"}</TD>
                    <TD>{a.email || "—"}</TD>
                    <TD>
                      <div style={{ display: "flex", gap: 6 }}>
                        <EditBtn to={`/updateUser/${a.id}`} />
                        <DeleteBtn onClick={() => handleDelete(a.id)} />
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

      {showAddCard && (
        <div
          style={{
            position: "fixed",
            top: "62px",
            left: "255px",
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "28px 32px",
          }}
          onClick={() => setShowAddCard(false)}
        >
          <div
            style={{ width: "100%", maxWidth: "1200px", maxHeight: "calc(100vh - 62px - 56px)", overflowY: "auto", borderRadius: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <AddUser embedded onClose={() => setShowAddCard(false)} onSuccess={fetchUsers} />
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Utilisateurs;
