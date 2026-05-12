import React from "react";
import { Link } from "react-router-dom";
import { PageLayout, PageHeader, Card } from "../UI.jsx";

const REQUETES = [
  { icon: "📊", title: "Total Commandes par Période", desc: "Visualisez le volume de commandes sur une période sélectionnée", to: "/TotalCommandesParPeriode", color: "#6366f1" },
  { icon: "👥", title: "Clients par Période de Création", desc: "Liste des clients créés sur une période donnée", to: "/ListeClientsParPeriodeCreation", color: "#0ea5e9" },
  { icon: "🧾", title: "État de Facturation", desc: "Aperçu de l'état de facturation par tiers", to: "/EtatDeFacturation", color: "#27ae60" },
  { icon: "💰", title: "Versements par Période", desc: "Détail des versements effectués sur une période", to: "/EtatVersementParPeriode", color: "#f59e0b" },
  { icon: "🚚", title: "Livraisons Prévues", desc: "Calendrier des livraisons à venir", to: "/LivraisonsPrevues", color: "#8b5cf6" },
  { icon: "📋", title: "Commandes Détaillées par Période", desc: "Vue détaillée des commandes avec toutes les lignes", to: "/CommandeDetailleesParPeriode", color: "#ec4899" },
  { icon: "🏢", title: "Commandes par Code Client", desc: "Analyse des commandes regroupées par client", to: "/CommandesParCodeClient", color: "#14b8a6" },
  { icon: "⚠", title: "Factures Non Payées", desc: "Liste des factures en attente de paiement", to: "/FacturesNonPayee", color: "#e74c3c" },
];

const Requetes = () => (
  <PageLayout>
    <PageHeader title="Requêtes & Rapports" subtitle="Accédez aux rapports et analyses avancés" />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
      {REQUETES.map(r => (
        <Link key={r.to} to={r.to} style={{ textDecoration: "none" }}>
          <Card style={{ cursor: "pointer", transition: "all 0.18s", borderLeft: `4px solid ${r.color}` }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.07)"; }}
          >
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: r.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{r.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1a202c", lineHeight: 1.3 }}>{r.title}</div>
                  <div style={{ fontSize: 12.5, color: "#718096", marginTop: 4, lineHeight: 1.5 }}>{r.desc}</div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: r.color }}>Accéder →</span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  </PageLayout>
);

export default Requetes;
