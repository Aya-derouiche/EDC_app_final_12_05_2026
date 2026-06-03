import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserContext } from "../Connexion/UserProvider.jsx";

const SIDEBAR_W = 255;

const NAV_ITEMS = [
  { icon: "⌂", label: "Dashboard", to: "/home" },
  { icon: "🏢", label: "Entreprises", to: "/entreprises" },
  { icon: "👥", label: "Utilisateurs", to: "/users" },
  { icon: "🤝", label: "Tiers", to: "/tiers" },
  { icon: "🛒", label: "Achats", to: "/achats" },
  { icon: "📋", label: "Commandes", to: "/commandes" },
  { icon: "🚚", label: "Livraisons", to: "/livraisons" },
  { icon: "🧾", label: "Facturations", to: "/facturations" },
  { icon: "📤", label: "Importer un fichier", to: "/documents/upload" },
  { icon: "↑", label: "Règlements Émis", to: "/reglements_emis" },
  { icon: "↓", label: "Règlements Reçus", to: "/reglements_recus" },
  { icon: "💰", label: "Versements", to: "/versements" },
  { icon: "👁", label: "Pointage Personnel", to: "/fichePaie" },
  { icon: "📁", label: "Docs Comptabilité", to: "/documents_comptabilite" },
  { icon: "📂", label: "Docs Direction", to: "/documents_direction" },
];

const ADMIN_ITEMS = [{ icon: "🔍", label: "Requêtes", to: "/requetes" }];

const NavItem = ({ icon, label, to, active }) => (
  <Link
    to={to}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "10px 16px",
      borderRadius: 9,
      margin: "2px 10px",
      textDecoration: "none",
      color: active ? "#fff" : "#a0aec0",
      background: active ? "#27ae60" : "transparent",
      fontWeight: active ? 600 : 400,
      fontSize: 13.5,
      transition: "all 0.18s",
      cursor: "pointer",
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = "#252d3d";
        e.currentTarget.style.color = "#fff";
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#a0aec0";
      }
    }}
  >
    <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
  </Link>
);

const SectionLabel = ({ label }) => (
  <div
    style={{
      padding: "18px 20px 6px",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.2,
      color: "#4a5568",
      textTransform: "uppercase",
    }}
  >
    {label}
  </div>
);

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { user } = useContext(UserContext);
  const location = useLocation();

  return (
    <>
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 99,
            display: "none",
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_W,
          background: "#1a1f2e",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            height: 62,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            borderBottom: "1px solid #252d3d",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "linear-gradient(135deg,#27ae60,#1e8449)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            E
          </div>
          <div style={{ marginLeft: 10 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>EDC</div>
            <div style={{ color: "#4a5568", fontSize: 11 }}>Gestion comptable</div>
          </div>
        </div>

        <nav style={{ flex: 1, paddingBottom: 20 }}>
          <SectionLabel label="Navigation" />
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} active={location.pathname === item.to} />
          ))}

          {user?.role !== "utilisateur" && (
            <>
              <SectionLabel label="Administration" />
              {ADMIN_ITEMS.map((item) => (
                <NavItem key={item.to} {...item} active={location.pathname === item.to} />
              ))}
            </>
          )}
        </nav>

        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid #252d3d",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#27ae60",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {user?.identite?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.identite || "Utilisateur"}
            </div>
            <div style={{ color: "#4a5568", fontSize: 11 }}>{user?.role || ""}</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
