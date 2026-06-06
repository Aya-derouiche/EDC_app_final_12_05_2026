// client/src/components/Documents/DocumentUploader.jsx

import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { UserContext } from "../Connexion/UserProvider";
import Swal from "sweetalert2";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

const DOC_TYPES = [
  { value: "facture", label: "Facture" },
  { value: "achat", label: "Achat" },
  { value: "livraison", label: "Bon de livraison" },
  { value: "commande", label: "Commande" },
  { value: "recu", label: "Recu" },
  { value: "autres", label: "Autre" },
];

const ImportFileIcon = ({ size = 28, color = "#2563eb" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 16V4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 8L12 4L16 8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 15.5V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V15.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

function getDefaultFormByDocType(docType) {
  switch (docType) {
    case "facture":
      return {
        num_facture: "",
        date_facture: "",
        montant_HT_facture: 0,
        FODEC_sur_facture: 0,
        TVA_facture: 0,
        timbre_facture: 0,
        autre_montant_facture: 0,
        montant_total_facture: 0,
        observations: "",
        etat_payement: "non paye",
      };

    case "achat":
      return {
        type_piece: "",
        num_piece: "",
        date_piece: "",
        tiers_saisie: "",
        montant_HT_piece: 0,
        FODEC_piece: 0,
        TVA_piece: 0,
        timbre_piece: 0,
        autre_montant_piece: 0,
        montant_total_piece: 0,
        observations: "",
        statut: "non reglee",
      };

    case "livraison":
      return {
        date_BL: "",
        num_BL: "",
        lieu_BL: "",
        reference_commande: "",
        numero_client: "",
        contact_client: "",
        emis_par: "",
        tiers_saisie: "",
        fournisseur_nom: "",
        fournisseur_adresse: "",
        fournisseur_tel: "",
        destinataire_nom: "",
        destinataire_adresse: "",
        destinataire_ville: "",
        destinataire_pays: "",
        montant_HT_BL: 0,
        TVA_BL: 0,
        montant_total_BL: 0,
        observations: "",
      };

    case "commande":
      return {
        num_commande: "",
        date_commande: "",
        montant_commande: 0,
        date_livraison_prevue: "",
        observations: "",
      };

    default:
      return {};
  }
}

function mapExtractedToForm(extracted, docType) {
  if (!extracted) return {};

  switch (docType) {
    case "facture":
      return {
        num_facture: extracted.num_facture || "",
        date_facture: extracted.date_facture || "",
        montant_HT_facture: extracted.montant_ht ?? 0,
        FODEC_sur_facture: extracted.fodec ?? 0,
        TVA_facture: extracted.tva ?? 0,
        timbre_facture: extracted.timbre ?? 0,
        autre_montant_facture: extracted.remise ?? 0,
        montant_total_facture: extracted.montant_total ?? 0,
        observations: extracted.observations || "",
        etat_payement: "non paye",
      };

    case "achat":
      return {
        type_piece: extracted.type_piece || "",
        num_piece: extracted.num_piece || "",
        date_piece: extracted.date_piece || "",
        tiers_saisie: extracted.fournisseur?.nom || "",
        montant_HT_piece: extracted.montant_ht ?? 0,
        FODEC_piece: extracted.fodec ?? 0,
        TVA_piece: extracted.tva ?? 0,
        timbre_piece: extracted.timbre ?? 0,
        autre_montant_piece: extracted.autre_montant ?? 0,
        montant_total_piece: extracted.montant_total ?? 0,
        observations: extracted.observations || "",
        statut: "non reglee",
      };

    case "livraison":
      return {
        date_BL: extracted.date_bl || extracted.date || "",
        num_BL:
          extracted.num_bl ||
          extracted.numero_bl ||
          extracted.numero ||
          "",
        lieu_BL: extracted.lieu_bl || extracted.lieu || "",
        reference_commande:
          extracted.reference_commande || extracted.num_commande || "",
        numero_client:
          extracted.numero_client || extracted.client_numero || "",
        contact_client:
          extracted.contact_client || extracted.client_contact || "",
        emis_par: extracted.emis_par || extracted.livre_par || "",
        tiers_saisie:
          extracted.tiers_saisie ||
          extracted.fournisseur_nom ||
          extracted.fournisseur?.nom ||
          extracted.destinataire_nom ||
          "",
        fournisseur_nom:
          extracted.fournisseur_nom || extracted.fournisseur?.nom || "",
        fournisseur_adresse:
          extracted.fournisseur_adresse ||
          extracted.fournisseur?.adresse ||
          "",
        fournisseur_tel:
          extracted.fournisseur_tel ||
          extracted.fournisseur?.tel ||
          extracted.fournisseur?.telephone ||
          "",
        destinataire_nom:
          extracted.destinataire_nom ||
          extracted.destinataire?.nom ||
          extracted.client?.nom ||
          "",
        destinataire_adresse:
          extracted.destinataire_adresse ||
          extracted.destinataire?.adresse ||
          extracted.client?.adresse ||
          "",
        destinataire_ville:
          extracted.destinataire_ville ||
          extracted.destinataire?.ville ||
          extracted.client?.ville ||
          "",
        destinataire_pays:
          extracted.destinataire_pays ||
          extracted.destinataire?.pays ||
          extracted.client?.pays ||
          "",
        montant_HT_BL:
          extracted.montant_ht ?? extracted.montant_ht_bl ?? 0,
        TVA_BL: extracted.tva ?? extracted.tva_bl ?? 0,
        montant_total_BL:
          extracted.montant_total ??
          extracted.montant_total_bl ??
          0,
        observations:
          extracted.observations ||
          extracted.informations_additionnelles ||
          "",
      };

    case "commande":
      return {
        num_commande: extracted.num_commande || "",
        date_commande: extracted.date_commande || "",
        montant_commande: extracted.montant_total ?? 0,
        date_livraison_prevue:
          extracted.date_livraison_prevue || "",
        observations: extracted.observations || "",
      };

    default:
      return {};
  }
}

const DocumentUploader = ({
  onUploadSuccess,
  docType: defaultDocType = "facture",
  codeTiers: initialCodeTiers = null,
  entiteLiee = null,
  entiteId = null,
}) => {
  const { user } = useContext(UserContext);

  const fileRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tiersList, setTiersList] = useState([]);
  const [selectedTiers, setSelectedTiers] = useState(
    initialCodeTiers || ""
  );
  const [docType, setDocType] = useState(defaultDocType);
  const [step, setStep] = useState("upload");
  const [scanData, setScanData] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) return;

        const response = await axios.get(
          `${API_BASE_URL}/api/code_tiers`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setTiersList(response.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTiers();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setSelectedFile(file);
      setError("");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if (file) {
      setSelectedFile(file);
      setError("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUploadAndScan = async () => {
    if (!selectedFile) {
      Swal.fire({
        icon: "warning",
        title: "Attention",
        text: "Veuillez sélectionner un fichier",
      });

      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Vous n'êtes pas authentifié.",
      });

      return;
    }

    setUploading(true);
    setError("");

    const formDataObj = new FormData();

    formDataObj.append("file", selectedFile);
    formDataObj.append("doc_type", docType);
    formDataObj.append(
      "code_entreprise",
      user?.code_entreprise || "general"
    );
    formDataObj.append("code_tiers", selectedTiers || "");
    formDataObj.append("entite_liee", entiteLiee || "");
    formDataObj.append("entite_id", entiteId || "");
    formDataObj.append("uploaded_by", user?.id || "");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/documents/upload-and-scan`,
        formDataObj,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const mapped = mapExtractedToForm(
        response.data.extractedData,
        docType
      );

      const defaults = getDefaultFormByDocType(docType);

      setScanData(response.data);

      setConfidence(response.data.confidence_score || 0);

      setFormData({
        ...defaults,
        ...mapped,
        document_url:
          response.data.document?.minio_secure_url || "",
        document_id: response.data.document?.id,
      });

      setStep("review");
    } catch (err) {
      setError(err.response?.data?.error || err.message);

      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          err.response?.data?.error ||
          "Erreur lors de l'upload",
      });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setStep("upload");
    setScanData(null);
    setFormData({});
    setError("");
    setConfidence(0);
  };

  if (step === "done") {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>

        <h3
          style={{
            color: "#15803d",
            margin: "12px 0 4px",
          }}
        >
          Document validé
        </h3>

        <p style={{ color: "#6b7280" }}>
          L'enregistrement comptable a été créé
          automatiquement.
        </p>

        <button
          onClick={reset}
          className="btn btn-primary mt-3"
        >
          Uploader un autre document
        </button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="card p-4">
        <h3 className="mb-3">
          Vérification des données extraites par l'IA
        </h3>

        <div className="mb-3">
          <span className="badge bg-success">
            Score de confiance :{" "}
            {Math.round(confidence * 100)}%
          </span>
        </div>

        <div className="row">
          <div className="col-md-6">
            {scanData?.document?.minio_secure_url && (
              selectedFile?.type === "application/pdf" ? (
                <iframe
                  src={scanData.document.minio_secure_url}
                  title="preview"
                  style={{
                    width: "100%",
                    height: 300,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                />
              ) : (
                <img
                  src={scanData.document.minio_secure_url}
                  alt="document"
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    maxHeight: 300,
                    objectFit: "contain",
                  }}
                />
              )
            )}
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">
                Tiers *
              </label>

              <select
                className="form-select"
                value={selectedTiers}
                onChange={(e) =>
                  setSelectedTiers(e.target.value)
                }
              >
                <option value="">
                  -- Sélectionnez un tiers --
                </option>

                {tiersList.map((tier) => (
                  <option
                    key={tier.id || tier.code_tiers}
                    value={tier.code_tiers}
                  >
                    {tier.code_tiers} - {tier.identite}
                  </option>
                ))}
              </select>
            </div>

            {Object.entries(formData)
              .filter(
                ([k]) =>
                  !k.startsWith("_") &&
                  k !== "document_url" &&
                  k !== "document_id"
              )
              .map(([key, val]) => (
                <div key={key} className="mb-2">
                  <label className="form-label small text-muted">
                    {key.replace(/_/g, " ")}
                  </label>

                  <input
                    type={
                      key.includes("date")
                        ? "date"
                        : "text"
                    }
                    className="form-control form-control-sm"
                    value={val ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger mt-3">
            {error}
          </div>
        )}

        <div className="d-flex gap-2 mt-3">
          <button
            className="btn btn-success"
            disabled={uploading}
          >
            {uploading
              ? "Enregistrement..."
              : "Valider et créer"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={reset}
            disabled={uploading}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="mb-4">
        Importer un document
      </h3>

      <div className="mb-3">
        <label className="form-label">
          Type de document
        </label>

        <select
          className="form-select"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          {DOC_TYPES.map((t) => (
            <option
              key={t.value}
              value={t.value}
            >
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">
          Tiers (optionnel)
        </label>

        <select
          className="form-select"
          value={selectedTiers}
          onChange={(e) =>
            setSelectedTiers(e.target.value)
          }
        >
          <option value="">
            -- Sélectionnez un tiers --
          </option>

          {tiersList.map((tier) => (
            <option
              key={tier.id || tier.code_tiers}
              value={tier.code_tiers}
            >
              {tier.code_tiers} - {tier.identite}
            </option>
          ))}
        </select>
      </div>

      <div
        className="drop-zone text-center p-4 border rounded"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileRef.current?.click()}
        style={{
          cursor: "pointer",
          backgroundColor: selectedFile
            ? "#e8f0fe"
            : "#f8f9fa",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="d-none"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.xls,.xlsx,.csv"
        />

        {selectedFile ? (
          <>
            <div style={{ fontSize: 32 }}>
              <ImportFileIcon size={34} color="#2563eb" />
            </div>

            <p className="fw-bold mt-2 mb-1">
              {selectedFile.name}
            </p>

            <p className="small text-muted">
              {(
                selectedFile.size /
                1024 /
                1024
              ).toFixed(2)}{" "}
              MB
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32 }}>
              <ImportFileIcon size={34} color="#2563eb" />
            </div>

            <p className="fw-bold mt-2 mb-1">
              Glissez-déposez votre fichier ici
            </p>

            <p className="small text-muted">
              PDF, Image, Excel, CSV - max 20 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="alert alert-danger mt-2">
          {error}
        </div>
      )}

      <button
        className="btn btn-primary mt-3 w-100"
        onClick={handleUploadAndScan}
        disabled={!selectedFile || uploading}
      >
        {uploading
          ? "⏳ Analyse en cours par l'IA..."
          : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ImportFileIcon size={18} color="#ffffff" />
              Uploader et analyser avec l'IA
            </span>
          )}
      </button>
    </div>
  );
};

export default DocumentUploader;
