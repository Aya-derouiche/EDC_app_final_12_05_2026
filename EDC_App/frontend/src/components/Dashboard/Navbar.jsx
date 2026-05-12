import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../Connexion/UserProvider.jsx";
import axios from "axios";

const SIDEBAR_W = 255;

const Navbar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState([]);
  const [search, setSearch] = useState("");
  const notifRef = useRef(null);
  const settRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`/api/notifications/${user.id}`);
      setNotifications(res.data);
      setUnread(res.data.filter(n => !n.read));
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (settRef.current && !settRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async () => {
    try {
      await axios.post("/api/notifications/markAsRead", { userId: user.id });
      setUnread([]);
    } catch {}
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnread(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const handleNotifClick = (msg) => {
    const routes = [
      [/règlement emi/i, "/reglements_emis"],
      [/achat/i, "/achats"],
      [/tier/i, "/tiers"],
      [/commande/i, "/commandes"],
      [/livraison/i, "/livraisons"],
      [/règlement reçu/i, "/reglements_recus"],
      [/facture/i, "/facturations"],
      [/versement/i, "/versements"],
      [/pointage/i, "/fichePaie"],
      [/comptabilit/i, "/documents_comptabilite"],
      [/direction/i, "/documents_direction"],
    ];
    for (const [pattern, route] of routes) {
      if (pattern.test(msg)) { navigate(route); break; }
    }
    setNotifOpen(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <header style={{
      position: "fixed",
      top: 0,
      left: SIDEBAR_W,
      right: 0,
      height: 62,
      background: "#fff",
      borderBottom: "1px solid #e8ecf0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      zIndex: 90,
      gap: 16,
    }}>

      {/* Left: hamburger + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "6px 8px", borderRadius: 7, color: "#718096",
            fontSize: 20, display: "flex", alignItems: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f4f6f9"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          ☰
        </button>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "#a0aec0", fontSize: 14, pointerEvents: "none",
          }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "8px 14px 8px 34px",
              border: "1.5px solid #e8ecf0",
              borderRadius: 8,
              fontSize: 13,
              width: 220,
              outline: "none",
              background: "#f8fafc",
              color: "#1a202c",
              transition: "all 0.2s",
            }}
            onFocus={e => { e.target.style.borderColor = "#27ae60"; e.target.style.background = "#fff"; }}
            onBlur={e => { e.target.style.borderColor = "#e8ecf0"; e.target.style.background = "#f8fafc"; }}
          />
        </div>
      </div>

      {/* Right: notifications + profile + settings */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setSettingsOpen(false); if (!notifOpen) markRead(); }}
            style={{
              position: "relative", background: "none", border: "none",
              cursor: "pointer", padding: "8px 10px", borderRadius: 8,
              fontSize: 20, color: "#718096", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f4f6f9"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            🔔
            {unread.length > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 4,
                background: "#e74c3c", color: "#fff",
                borderRadius: "50%", width: 18, height: 18,
                fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #fff",
              }}>
                {unread.length > 9 ? "9+" : unread.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 320, background: "#fff",
              borderRadius: 12, border: "1px solid #e8ecf0",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              zIndex: 200, overflow: "hidden",
            }}>
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid #f1f5f9",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                <span style={{
                  background: "#e74c3c", color: "#fff",
                  borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                }}>
                  {unread.length} nouvelles
                </span>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "#a0aec0", fontSize: 13 }}>
                    Aucune notification
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n.message)}
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid #f8fafc",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      cursor: "pointer",
                      background: !n.read ? "#f0faf5" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = !n.read ? "#f0faf5" : "transparent"}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>📋</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>
                      {n.message}
                    </span>
                    <button
                      onClick={(e) => deleteNotif(n.id, e)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#a0aec0", fontSize: 14, padding: 2, borderRadius: 4,
                        flexShrink: 0,
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#e74c3c"}
                      onMouseLeave={e => e.currentTarget.style.color = "#a0aec0"}
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "#e8ecf0" }} />

        {/* Profile */}
        <Link to="/profile" style={{
          display: "flex", alignItems: "center", gap: 10,
          textDecoration: "none", padding: "6px 10px", borderRadius: 8,
          transition: "background 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#f4f6f9"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg,#27ae60,#1e8449)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
          }}>
            {user?.identite?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a202c" }}>
              {user?.identite || ""}
            </div>
            <div style={{ fontSize: 11, color: "#a0aec0" }}>{user?.role || ""}</div>
          </div>
        </Link>

        {/* Settings dropdown */}
        <div ref={settRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setSettingsOpen(!settingsOpen); setNotifOpen(false); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 10px", borderRadius: 8, fontSize: 18,
              color: "#718096", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f4f6f9"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >⚙</button>

          {settingsOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 200, background: "#fff",
              borderRadius: 10, border: "1px solid #e8ecf0",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              zIndex: 200, overflow: "hidden", padding: "6px",
            }}>
              {user?.role === "comptable" && (
                <Link to="/configurations" onClick={() => setSettingsOpen(false)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 7, color: "#374151",
                  textDecoration: "none", fontSize: 13.5, fontWeight: 500,
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f4f6f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span>⚙</span> Configurations
                </Link>
              )}
              <Link to="/profile" onClick={() => setSettingsOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 7, color: "#374151",
                textDecoration: "none", fontSize: 13.5, fontWeight: 500,
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#f4f6f9"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>👤</span> Mon profil
              </Link>
              <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
              <button onClick={logout} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 7, color: "#e74c3c",
                background: "none", border: "none", cursor: "pointer",
                width: "100%", fontSize: 13.5, fontWeight: 500,
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#fdecea"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>⏻</span> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
