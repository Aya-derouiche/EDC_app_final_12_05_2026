import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { UserContext } from "../Connexion/UserProvider.jsx";
import { PageLayout, PageHeader, AddButton, Card, Toolbar, SearchInput, DataTable, TR, TD, Pagination, Spinner, Alert } from "../UI.jsx";

const ITEMS = 8;

const FichePaie = () => {
  const { user } = useContext(UserContext);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get("/api/pointage-personnel", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setData(r.data))
      .catch(() => setError("Erreur de chargement du pointage."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(d => {
    const q = search.toLowerCase();
    return d["CODE TIERS"]?.toLowerCase().includes(q) ||
      d["IDENTITE DU TIERS"]?.toLowerCase().includes(q) ||
      d["TYPE DE PAIE"]?.toLowerCase().includes(q);
  });

  const pageCount = Math.ceil(filtered.length / ITEMS);
  const current = filtered.slice(page * ITEMS, (page + 1) * ITEMS);

  const cols = ["Code tiers", "Identité", "Type de paie", "Jours travaillés", "J. supp.", "J. absence", "Supplément", "Avances", "Observations"];

  return (
    <PageLayout>
      <PageHeader
        title="Pointage Personnel"
        subtitle={`${filtered.length} entrée${filtered.length !== 1 ? "s" : ""}`}
        action={user?.role !== "utilisateur" && <AddButton to="/uploadFile" label="Importer Excel" />}
      />
      {error && <Alert type="danger">{error}</Alert>}
      <Card>
        <div style={{ padding: "16px 20px 0" }}>
          <Toolbar>
            <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Rechercher par code, identité..." />
          </Toolbar>
        </div>
        <div style={{ padding: "0 20px" }}>
          {loading ? <Spinner /> : (
            <>
              <DataTable columns={cols} empty="Aucun pointage enregistré">
                {current.map((d, i) => (
                  <TR key={i}>
                    <TD style={{ fontFamily: "monospace", fontSize: 13 }}>{d["CODE TIERS"]}</TD>
                    <TD style={{ fontWeight: 500 }}>{d["IDENTITE DU TIERS"]}</TD>
                    <TD>{d["TYPE DE PAIE"]}</TD>
                    <TD>{d["NBRES DE JOURS OU D'H TRAVAILLES"] || "—"}</TD>
                    <TD>{d["NBRES DE JOURS OU D'H SUPP."] || "—"}</TD>
                    <TD>{d["NBRES DE JOURS OU D'H D'ABSENCE"] || "—"}</TD>
                    <TD>{d["SUPPLEMENT RECU"] ? `${parseFloat(d["SUPPLEMENT RECU"]).toLocaleString("fr-FR")} DT` : "—"}</TD>
                    <TD>{d["AVANCES SUR SALAIRES"] ? `${parseFloat(d["AVANCES SUR SALAIRES"]).toLocaleString("fr-FR")} DT` : "—"}</TD>
                    <TD style={{ color: "#718096", fontSize: 12.5 }}>{d["OBSERVATIONS"] || "—"}</TD>
                  </TR>
                ))}
              </DataTable>
              {filtered.length > ITEMS && (
                <Pagination pageCount={pageCount} currentPage={page} onPageChange={({ selected }) => setPage(selected)} total={filtered.length} itemsPerPage={ITEMS} />
              )}
            </>
          )}
        </div>
        <div style={{ height: 16 }} />
      </Card>
    </PageLayout>
  );
};

export default FichePaie;
