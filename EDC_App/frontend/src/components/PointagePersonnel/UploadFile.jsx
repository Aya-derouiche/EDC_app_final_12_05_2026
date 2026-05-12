import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { UserContext } from "../Connexion/UserProvider.jsx";
import { PageLayout, PageHeader, Card, Alert, SubmitBtn } from "../UI.jsx";

const UploadFile = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFile = (f) => {
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) setFile(f);
    else Swal.fire({ icon: "warning", title: "Format invalide", text: "Veuillez sélectionner un fichier Excel (.xlsx, .xls)" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/upload-pointage", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      Swal.fire({ icon: "success", title: "Fichier importé !", text: "Le pointage a été enregistré.", timer: 2000, showConfirmButton: false });
      navigate("/fichePaie");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Erreur", text: err.response?.data?.message || "Impossible d'importer le fichier." });
    } finally { setLoading(false); }
  };

  return (
    <PageLayout>
      <PageHeader title="Import Pointage Personnel" subtitle="Importez un fichier Excel de pointage" />
      <div style={{ maxWidth: 540 }}>
        <Card>
          <div style={{ padding: 28 }}>
            <form onSubmit={handleSubmit}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; handleFile(f); }}
                onClick={() => document.getElementById("fileInput").click()}
                style={{
                  border: `2px dashed ${drag ? "#27ae60" : file ? "#27ae60" : "#cbd5e0"}`,
                  borderRadius: 12, padding: "40px 24px",
                  textAlign: "center", cursor: "pointer",
                  background: drag ? "#f0faf5" : file ? "#f0faf5" : "#f8fafc",
                  transition: "all 0.2s", marginBottom: 20,
                }}
              >
                <input id="fileInput" type="file" accept=".xlsx,.xls" onChange={e => handleFile(e.target.files[0])} style={{ display: "none" }} />
                <div style={{ fontSize: 40, marginBottom: 10 }}>{file ? "📊" : "📁"}</div>
                {file ? (
                  <>
                    <div style={{ fontWeight: 700, color: "#27ae60", fontSize: 15 }}>{file.name}</div>
                    <div style={{ color: "#718096", fontSize: 12.5, marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, color: "#374151", fontSize: 15 }}>Glissez votre fichier ici</div>
                    <div style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}>ou cliquez pour sélectionner</div>
                    <div style={{ marginTop: 12, display: "inline-block", padding: "6px 14px", background: "#f1f5f9", borderRadius: 20, fontSize: 12, color: "#718096" }}>Excel (.xlsx, .xls)</div>
                  </>
                )}
              </div>
              <SubmitBtn loading={loading} label="Importer le fichier" icon="📤" />
              {file && <button type="button" onClick={() => setFile(null)} style={{ marginLeft: 10, padding: "10px 16px", background: "#f1f5f9", border: "1px solid #e8ecf0", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>Annuler</button>}
            </form>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
};

export default UploadFile;
