import React, { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "../Connexion/UserProvider.jsx";
import { PageLayout, PageHeader, Card, FormRow, FormField, Input, Textarea, SubmitBtn, Alert, SectionDivider } from "../UI.jsx";

const Profile = () => {
  const { user, setUser } = useContext(UserContext);
  const [form, setForm] = useState({ identite: user?.identite || "", position: user?.position || "", tel: user?.tel || "", email: user?.email || "", mot_de_passe: "", new_password: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(""); setErr("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`/api/users/${user.id}`, form, { headers: { Authorization: `Bearer ${token}` } });
      setMsg("Profil mis à jour avec succès !");
      setUser(prev => ({ ...prev, ...form }));
    } catch { setErr("Erreur lors de la mise à jour."); }
    finally { setLoading(false); }
  };

  return (
    <PageLayout>
      <PageHeader title="Mon Profil" subtitle="Gérez vos informations personnelles" />
      <div style={{ maxWidth: 640 }}>
        {msg && <Alert type="success">{msg}</Alert>}
        {err && <Alert type="danger">{err}</Alert>}
        <Card>
          <div style={{ padding: 24 }}>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#27ae60,#1e8449)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff" }}>
                {user?.identite?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a202c" }}>{user?.identite}</div>
                <div style={{ fontSize: 13, color: "#718096", marginTop: 2 }}>{user?.role} · {user?.code_entreprise}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <SectionDivider label="Informations personnelles" />
              <FormRow cols={2}>
                <FormField label="Identité"><Input name="identite" value={form.identite} onChange={handleChange} /></FormField>
                <FormField label="Position"><Input name="position" value={form.position} onChange={handleChange} /></FormField>
                <FormField label="Téléphone"><Input name="tel" value={form.tel} onChange={handleChange} /></FormField>
                <FormField label="Email"><Input name="email" type="email" value={form.email} onChange={handleChange} /></FormField>
              </FormRow>
              <SectionDivider label="Changer le mot de passe" />
              <FormRow cols={2}>
                <FormField label="Mot de passe actuel"><Input name="mot_de_passe" type="password" value={form.mot_de_passe} onChange={handleChange} placeholder="••••••••" /></FormField>
                <FormField label="Nouveau mot de passe"><Input name="new_password" type="password" value={form.new_password} onChange={handleChange} placeholder="••••••••" /></FormField>
              </FormRow>
              <div style={{ marginTop: 8 }}>
                <SubmitBtn loading={loading} label="Mettre à jour" icon="💾" />
              </div>
            </form>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Profile;
