import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../Connexion/UserProvider.jsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const token = () => localStorage.getItem("token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

// ── Stat card ──────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, to }) => (
  <Link to={to} style={{ textDecoration: "none" }}>
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "24px 28px",
      display: "flex",
      alignItems: "center",
      gap: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      cursor: "pointer",
      transition: "transform .18s, box-shadow .18s",
      borderLeft: `5px solid ${color}`,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.13)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: color + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  </Link>
);

// ── Quick action button ────────────────────────────────────────────
const QuickBtn = ({ icon, label, to, color }) => (
  <Link to={to} style={{ textDecoration: "none" }}>
    <div style={{
      background: color,
      borderRadius: 12,
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: "#fff",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      transition: "opacity .18s",
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label}
    </div>
  </Link>
);

export default function Home({ isSidebarOpen }) {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [stats, setStats]               = useState({ totalUsers: 0, totalOrders: 0, totalDeliveries: 0, unpaidInvoices: 0 });
  const [ordersPerPeriod, setOrdersPerPeriod] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => {
    if (!token()) { navigate("/"); return; }

    const fetchAll = async () => {
      setLoading(true);
      try {
        // user data
        const homeRes = await axios.get("/api/home", { headers: authHeaders() });
        setUser(homeRes.data.user);

        // statistics (no auth needed)
        const statsRes = await axios.get("/api/statistics");
        setStats(statsRes.data);

        // orders per period (auth needed)
        const ordersRes = await axios.get("/api/orders-per-period", { headers: authHeaders() });
        if (ordersRes.data?.ordersPerPeriod) setOrdersPerPeriod(ordersRes.data.ordersPerPeriod);
      } catch (err) {
        console.error("Erreur dashboard:", err);
        setError("Erreur de chargement des données.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [navigate, setUser]);

  /* ── Chart data ── */
  const statCards = [
    { icon: "👥", label: "Utilisateurs",        value: stats.totalUsers,      color: "#6366f1", to: "/users" },
    { icon: "📦", label: "Commandes",            value: stats.totalOrders,     color: "#0ea5e9", to: "/commandes" },
    { icon: "🚚", label: "Livraisons prévues",   value: stats.totalDeliveries, color: "#10b981", to: "/livraisons" },
    { icon: "⚠️", label: "Factures non payées",  value: stats.unpaidInvoices,  color: "#f59e0b", to: "/facturations" },
  ];

  const months = ordersPerPeriod.map(o => o.label);
  const counts  = ordersPerPeriod.map(o => o.count);

  const lineData = {
    labels: months,
    datasets: [{
      label: "Commandes",
      data: counts,
      fill: true,
      backgroundColor: "rgba(99,102,241,0.12)",
      borderColor: "#6366f1",
      borderWidth: 2.5,
      pointBackgroundColor: "#6366f1",
      pointRadius: 5,
      tension: 0.35,
    }],
  };

  const doughnutData = {
    labels: ["Utilisateurs", "Commandes", "Livraisons", "Factures non payées"],
    datasets: [{
      data: [stats.totalUsers, stats.totalOrders, stats.totalDeliveries, stats.unpaidInvoices],
      backgroundColor: ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b"],
      borderColor: "#fff",
      borderWidth: 3,
    }],
  };

  const barData = {
    labels: months,
    datasets: [{
      label: "Commandes / mois",
      data: counts,
      backgroundColor: months.map((_, i) =>
        `hsla(${200 + i * 22},70%,60%,0.75)`
      ),
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const chartOpts = (yLabel) => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false }, tooltip: { mode: "index" } },
    scales: {
      x: { grid: { display: false }, title: { display: true, text: "Période" } },
      y: { beginAtZero: true, title: { display: true, text: yLabel },
           ticks: { precision: 0 } },
    },
  });

  const doughnutOpts = {
    responsive: true,
    cutout: "65%",
    plugins: {
      legend: { position: "bottom", labels: { padding: 16, font: { size: 13 } } },
    },
  };

  if (!user) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f3f4f8",
      padding: "28px 32px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      marginLeft: isSidebarOpen ? 240 : 0,
      transition: "margin-left .25s",
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
          Bonjour, {user?.identite || "Utilisateur"} 👋
        </h1>
        <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>
          Voici un aperçu de l'activité de votre compte
        </p>
      </div>

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10, padding: "12px 16px", color: "#dc2626",
          marginBottom: 20, fontSize: 14,
        }}>{error}</div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
          <div style={{
            width: 48, height: 48, border: "4px solid #e5e7eb",
            borderTopColor: "#6366f1", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* ── Stat cards (comptable only) ── */}
          {user.role === "comptable" && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
              marginBottom: 32,
            }}>
              {statCards.map(c => <StatCard key={c.label} {...c} />)}
            </div>
          )}

          {/* ── Quick actions ── */}
          <div style={{
            background: "#fff", borderRadius: 16,
            padding: "20px 24px", marginBottom: 28,
            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 16px" }}>
              ⚡ Actions rapides
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <QuickBtn icon="📦" label="Nouvelle commande"  to="/addCommande"     color="#6366f1" />
              <QuickBtn icon="🚚" label="Nouvelle livraison" to="/addLivraison"    color="#0ea5e9" />
              <QuickBtn icon="🧾" label="Nouvelle facture"   to="/addFacture"      color="#10b981" />
              <QuickBtn icon="💰" label="Nouveau règlement"  to="/addReglement"    color="#f59e0b" />
              <QuickBtn icon="🏢" label="Nouveau tiers"      to="/addTier"         color="#8b5cf6" />
              {user.role === "comptable" && (
                <QuickBtn icon="👤" label="Nouvel utilisateur" to="/addUser"       color="#ec4899" />
              )}
            </div>
          </div>

          {/* ── Charts row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, marginBottom: 28 }}>

            {/* Line / Bar chart */}
            <div style={{
              background: "#fff", borderRadius: 16,
              padding: "20px 24px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: 0 }}>
                  📈 Commandes par période
                </h3>
                <span style={{
                  fontSize: 12, background: "#ede9fe", color: "#6366f1",
                  borderRadius: 20, padding: "3px 12px", fontWeight: 600,
                }}>
                  {months.length > 0 ? `${months.length} périodes` : "Aucune donnée"}
                </span>
              </div>
              {ordersPerPeriod.length > 0 ? (
                <Line data={lineData} options={chartOpts("Commandes")} />
              ) : (
                <div style={{
                  height: 200, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", color: "#9ca3af",
                }}>
                  <span style={{ fontSize: 40, marginBottom: 8 }}>📊</span>
                  <span>Aucune commande enregistrée</span>
                </div>
              )}
            </div>

            {/* Doughnut */}
            {user.role === "comptable" && (
              <div style={{
                background: "#fff", borderRadius: 16,
                padding: "20px 24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 16px" }}>
                  🍩 Vue d'ensemble
                </h3>
                <Doughnut data={doughnutData} options={doughnutOpts} />
              </div>
            )}
          </div>

          {/* Bar chart (comptable) */}
          {user.role === "comptable" && ordersPerPeriod.length > 0 && (
            <div style={{
              background: "#fff", borderRadius: 16,
              padding: "20px 24px", marginBottom: 28,
              boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 16px" }}>
                📊 Volume mensuel des commandes
              </h3>
              <Bar data={barData} options={chartOpts("Nombre")} />
            </div>
          )}

          {/* ── Info cards row ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}>
            <InfoCard
              title="📋 Modules disponibles"
              items={[
                { label: "Commandes",       to: "/commandes"            },
                { label: "Facturations",    to: "/facturations"         },
                { label: "Livraisons",      to: "/livraisons"           },
                { label: "Règlements émis", to: "/reglements_emis"      },
                { label: "Règlements reçus",to: "/reglements_recus"     },
                { label: "Versements",      to: "/versements"           },
              ]}
            />
            <InfoCard
              title="🏢 Gestion"
              items={[
                { label: "Tiers",             to: "/tiers"                    },
                { label: "Entreprises",       to: "/entreprises"              },
                { label: "Achats",            to: "/achats"                   },
                { label: "Doc. comptabilité", to: "/documents_comptabilite"   },
                { label: "Doc. direction",    to: "/documents_direction"      },
                { label: "Pointage",          to: "/fichePaie"                },
              ]}
            />
            {user.role === "comptable" && (
              <InfoCard
                title="⚙️ Administration"
                items={[
                  { label: "Utilisateurs",    to: "/users"          },
                  { label: "Configurations",  to: "/configurations" },
                  { label: "Requêtes SQL",    to: "/requetes"       },
                  { label: "Mon profil",      to: "/profile"        },
                ]}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Info card with links ──────────────────────────────────────────
function InfoCard({ title, items }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      padding: "20px 24px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 14px" }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(({ label, to }) => (
          <Link key={to} to={to} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderRadius: 8,
            color: "#4b5563", textDecoration: "none", fontSize: 14,
            transition: "background .15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#f3f4f8"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span>{label}</span>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
