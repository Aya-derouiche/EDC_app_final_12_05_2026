import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { PageLayout, PageHeader, Card, FormField, Input, SubmitBtn, Alert, DataTable, TR, TD, DeleteBtn, Badge, Spinner } from "../UI.jsx";

const Configurations = () => {
  const [banques, setBanques] = useState([]);
  const [taux, setTaux] = useState([]);
  const [newBanque, setNewBanque] = useState("");
  const [newTaux, setNewTaux] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const token = () => localStorage.getItem("token");
  const headers = () => ({ Authorization: `Bearer ${token()}` });

  useEffect(() => {
    Promise.all([
      axios.get("/api/banques", { headers: headers() }),
      axios.get("/api/taux-retenue-source", { headers: headers() }),
    ]).then(([b, t]) => { setBanques(b.data); setTaux(t.data); }).finally(() => setLoading(false));
  }, []);

  const addBanque = async (e) => {
    e.preventDefault();
    if (!newBanque.trim()) return;
    try {
      const res = await axios.post("/api/banques", { name: newBanque }, { headers: headers() });
      setBanques(prev => [...prev, res.data]);
      setNewBanque(""); setMsg("Banque ajoutée !");
      setTimeout(() => setMsg(""), 2000);
    } catch { Swal.fire({ icon: "error", title: "Erreur", text: "Impossible d'ajouter la banque." }); }
  };

  const deleteBanque = async (id) => {
    const ok = await Swal.fire({ title: "Supprimer ?", icon: "warning", showCancelButton: true, confirmButtonColor: "#e74c3c", cancelButtonText: "Annuler", confirmButtonText: "Supprimer" });
    if (!ok.isConfirmed) return;
    await axios.delete(`/api/banques/${id}`, { headers: headers() });
    setBanques(prev => prev.filter(b => b.id !== id));
  };

  const addTaux = async (e) => {
    e.preventDefault();
    if (!newTaux) return;
    try {
      const res = await axios.post("/api/taux-retenue-source", { taux: parseFloat(newTaux) }, { headers: headers() });
      setTaux(prev => [...prev, res.data]);
      setNewTaux(""); setMsg("Taux ajouté !");
      setTimeout(() => setMsg(""), 2000);
    } catch { Swal.fire({ icon: "error", title: "Erreur", text: "Impossible d'ajouter le taux." }); }
  };

  const deleteTaux = async (id) => {
    const ok = await Swal.fire({ title: "Supprimer ?", icon: "warning", showCancelButton: true, confirmButtonColor: "#e74c3c", cancelButtonText: "Annuler", confirmButtonText: "Supprimer" });
    if (!ok.isConfirmed) return;
    await axios.delete(`/api/taux-retenue-source/${id}`, { headers: headers() });
    setTaux(prev => prev.filter(t => t.id !== id));
  };

  if (loading) return <PageLayout><Spinner /></PageLayout>;

  return (
    <PageLayout>
      <PageHeader title="Configurations" subtitle="Gérez les paramètres de l'application" />
      {msg && <Alert type="success">{msg}</Alert>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Banques */}
        <Card>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#1a202c" }}>🏦 Banques</h2>
          </div>
          <div style={{ padding: 20 }}>
            <form onSubmit={addBanque} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <Input value={newBanque} onChange={e => setNewBanque(e.target.value)} placeholder="Nom de la banque" style={{ flex: 1 }} />
              <button type="submit" style={{ padding: "10px 16px", background: "#27ae60", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}>+ Ajouter</button>
            </form>
            <DataTable columns={["Banque", "Statut", ""]}>
              {banques.map(b => (
                <TR key={b.id}>
                  <TD style={{ fontWeight: 500 }}>{b.name}</TD>
                  <TD><Badge label={b.active ? "Active" : "Inactive"} color={b.active ? "success" : "secondary"} /></TD>
                  <TD><DeleteBtn onClick={() => deleteBanque(b.id)} /></TD>
                </TR>
              ))}
            </DataTable>
          </div>
        </Card>
        {/* Taux */}
        <Card>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#1a202c" }}>📊 Taux de retenue à la source</h2>
          </div>
          <div style={{ padding: 20 }}>
            <form onSubmit={addTaux} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <Input type="number" step="0.001" min="0" max="100" value={newTaux} onChange={e => setNewTaux(e.target.value)} placeholder="Taux (%)" style={{ flex: 1 }} />
              <button type="submit" style={{ padding: "10px 16px", background: "#27ae60", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}>+ Ajouter</button>
            </form>
            <DataTable columns={["Taux (%)", ""]}>
              {taux.map(t => (
                <TR key={t.id}>
                  <TD style={{ fontWeight: 600 }}>{parseFloat(t.taux).toFixed(3)} %</TD>
                  <TD><DeleteBtn onClick={() => deleteTaux(t.id)} /></TD>
                </TR>
              ))}
            </DataTable>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Configurations;
