// ═══════════════════════════════════════════════════════════
//  Shared UI components — used across ALL pages
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { Link } from "react-router-dom";
import ReactPaginate from "react-paginate";

const SIDEBAR_W = 255;
const NAVBAR_H  = 62;

// ── Page wrapper ─────────────────────────────────────────────
export const PageLayout = ({ children }) => (
  <div style={{
    minHeight: "100vh",
    background: "#f4f6f9",
    fontFamily: "'Inter', sans-serif",
  }}>
    <div style={{ padding: "28px 32px", maxWidth: 1400 }}>
      {children}
    </div>
  </div>
);

// ── Page header ──────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, action }) => (
  <div style={{
    display: "flex", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 24,
  }}>
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a202c", margin: 0 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 13, color: "#718096", marginTop: 3 }}>{subtitle}</p>
      )}
    </div>
    {action}
  </div>
);

// ── Add button ───────────────────────────────────────────────
export const AddButton = ({ to, label = "Ajouter" }) => (
  <Link to={to} style={{
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "10px 20px",
    background: "#27ae60",
    color: "#fff",
    borderRadius: 9, textDecoration: "none",
    fontSize: 13.5, fontWeight: 700,
    boxShadow: "0 2px 8px rgba(39,174,96,0.3)",
    transition: "all 0.18s",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = "#1e8449"; e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "#27ae60"; e.currentTarget.style.transform = "translateY(0)"; }}
  >
    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> {label}
  </Link>
);

// ── Card ─────────────────────────────────────────────────────
export const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e8ecf0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    ...style,
  }}>
    {children}
  </div>
);

// ── Toolbar (search + filters) ───────────────────────────────
export const Toolbar = ({ children }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: 18, flexWrap: "wrap",
  }}>
    {children}
  </div>
);

export const SearchInput = ({ value, onChange, placeholder = "Rechercher..." }) => (
  <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
    <span style={{
      position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
      color: "#a0aec0", fontSize: 14, pointerEvents: "none",
    }}>🔍</span>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "9px 13px 9px 34px",
        border: "1.5px solid #e8ecf0", borderRadius: 8,
        fontSize: 13.5, background: "#f8fafc", outline: "none",
        fontFamily: "inherit",
        transition: "all 0.18s",
      }}
      onFocus={e => { e.target.style.borderColor = "#27ae60"; e.target.style.background = "#fff"; }}
      onBlur={e => { e.target.style.borderColor = "#e8ecf0"; e.target.style.background = "#f8fafc"; }}
    />
  </div>
);

// ── Table ─────────────────────────────────────────────────────
export const DataTable = ({ columns, children, empty = "Aucune donnée" }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e8ecf0" }}>
          {columns.map((col, i) => (
            <th key={i} style={{
              padding: "11px 16px",
              textAlign: "left",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#718096",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
            }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {React.Children.count(children) === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 14, color: "#a0aec0", fontWeight: 500 }}>{empty}</div>
            </td>
          </tr>
        ) : children}
      </tbody>
    </table>
  </div>
);

// ── Table row ─────────────────────────────────────────────────
export const TR = ({ children }) => {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderBottom: "1px solid #f1f5f9",
        background: hover ? "#f8fafc" : "#fff",
        transition: "background 0.12s",
      }}
    >
      {children}
    </tr>
  );
};

export const TD = ({ children, style = {} }) => (
  <td style={{ padding: "12px 16px", fontSize: 13.5, color: "#374151", verticalAlign: "middle", ...style }}>
    {children}
  </td>
);

// ── Action buttons ────────────────────────────────────────────
export const EditBtn = ({ to }) => (
  <Link to={to} style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 7,
    border: "1px solid #e8ecf0", background: "#fff",
    color: "#2980b9", textDecoration: "none", fontSize: 15,
    transition: "all 0.15s",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = "#d6eaf8"; e.currentTarget.style.borderColor = "#a8d4f0"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e8ecf0"; }}
  >
    ✏
  </Link>
);

export const DeleteBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 7,
    border: "1px solid #e8ecf0", background: "#fff",
    color: "#e74c3c", cursor: "pointer", fontSize: 15,
    transition: "all 0.15s",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = "#fdecea"; e.currentTarget.style.borderColor = "#f5c6c2"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e8ecf0"; }}
  >
    🗑
  </button>
);

export const ViewBtn = ({ to }) => (
  <Link to={to} style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 7,
    border: "1px solid #e8ecf0", background: "#fff",
    color: "#27ae60", textDecoration: "none", fontSize: 15,
    transition: "all 0.15s",
  }}
    onMouseEnter={e => { e.currentTarget.style.background = "#d5f5e3"; e.currentTarget.style.borderColor = "#a8e6c0"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e8ecf0"; }}
  >
    👁
  </Link>
);

// ── Pagination ────────────────────────────────────────────────
export const Pagination = ({ pageCount, currentPage, onPageChange, total, itemsPerPage }) => {
  const start = currentPage * itemsPerPage + 1;
  const end = Math.min((currentPage + 1) * itemsPerPage, total);
  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 0 2px",
      fontSize: 13, color: "#718096",
    }}>
      <span>Affichage de <strong>{start}</strong> à <strong>{end}</strong> sur <strong>{total}</strong> entrées</span>
      <ReactPaginate
        previousLabel="‹"
        nextLabel="›"
        breakLabel="..."
        pageCount={pageCount}
        marginPagesDisplayed={1}
        pageRangeDisplayed={3}
        onPageChange={onPageChange}
        forcePage={currentPage}
        containerClassName="edc-pagination"
        activeClassName="edc-page-active"
        previousClassName="edc-page-nav"
        nextClassName="edc-page-nav"
      />
      <style>{`
        .edc-pagination {
          display: flex; gap: 5px; list-style: none;
          align-items: center; padding: 0; margin: 0;
        }
        .edc-pagination li a, .edc-pagination li span {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 7px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          color: #718096; border: 1px solid #e8ecf0;
          background: #fff; text-decoration: none;
          transition: all 0.15s;
        }
        .edc-pagination li a:hover { background: #27ae60; color: #fff; border-color: #27ae60; }
        .edc-page-active a { background: #27ae60 !important; color: #fff !important; border-color: #27ae60 !important; }
        .edc-page-nav a { font-size: 18px; font-weight: 700; }
      `}</style>
    </div>
  );
};

// ── Badge ─────────────────────────────────────────────────────
export const Badge = ({ label, color = "secondary" }) => {
  const colors = {
    success: { bg: "#d5f5e3", text: "#1a7a3f" },
    danger:  { bg: "#fdecea", text: "#c0392b" },
    warning: { bg: "#fef9e7", text: "#b7770d" },
    info:    { bg: "#d6eaf8", text: "#1f618d" },
    secondary:{ bg: "#f1f5f9", text: "#718096" },
    purple:  { bg: "#f3e8ff", text: "#7c3aed" },
    orange:  { bg: "#fff3e0", text: "#e65100" },
  };
  const c = colors[color] || colors.secondary;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.text,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
};

// ── Alert ─────────────────────────────────────────────────────
export const Alert = ({ type = "danger", children }) => {
  const styles = {
    success: { bg: "#d5f5e3", color: "#1a7a3f", border: "#a8e6c0", icon: "✅" },
    danger:  { bg: "#fdecea", color: "#c0392b", border: "#f5c6c2", icon: "⚠" },
    warning: { bg: "#fef9e7", color: "#b7770d", border: "#fbe3a0", icon: "⚡" },
    info:    { bg: "#d6eaf8", color: "#1f618d", border: "#a8d4f0", icon: "ℹ" },
  };
  const s = styles[type] || styles.danger;
  return (
    <div style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 9, padding: "11px 15px",
      fontSize: 13.5, marginBottom: 16,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span>{s.icon}</span> {children}
    </div>
  );
};

// ── Form card ─────────────────────────────────────────────────
export const FormCard = ({ title, children }) => (
  <div style={{
    background: "#fff", borderRadius: 14,
    border: "1px solid #e8ecf0",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    overflow: "hidden",
  }}>
    {title && (
      <div style={{
        padding: "18px 24px",
        borderBottom: "1px solid #f1f5f9",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: 0 }}>{title}</h2>
      </div>
    )}
    <div style={{ padding: 24 }}>{children}</div>
  </div>
);

// ── Form row ──────────────────────────────────────────────────
export const FormRow = ({ children, cols = 2 }) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 16,
    marginBottom: 16,
  }}>
    {children}
  </div>
);

// ── Form field ────────────────────────────────────────────────
export const FormField = ({ label, required, error, children }) => (
  <div>
    <label style={{
      display: "block", fontSize: 13, fontWeight: 600,
      color: "#374151", marginBottom: 6,
    }}>
      {label} {required && <span style={{ color: "#e74c3c" }}>*</span>}
    </label>
    {children}
    {error && <div style={{ fontSize: 12, color: "#e74c3c", marginTop: 4 }}>{error}</div>}
  </div>
);

// ── Input ─────────────────────────────────────────────────────
export const Input = ({ ...props }) => (
  <input
    {...props}
    style={{
      width: "100%", padding: "10px 13px",
      border: "1.5px solid #e8ecf0", borderRadius: 8,
      fontSize: 14, outline: "none",
      fontFamily: "inherit", color: "#1a202c",
      background: "#fff", boxSizing: "border-box",
      transition: "border-color 0.18s",
      ...props.style,
    }}
    onFocus={e => { e.target.style.borderColor = "#27ae60"; e.target.style.boxShadow = "0 0 0 3px rgba(39,174,96,0.1)"; }}
    onBlur={e => { e.target.style.borderColor = "#e8ecf0"; e.target.style.boxShadow = "none"; }}
  />
);

// ── Select ────────────────────────────────────────────────────
export const Select = ({ children, ...props }) => (
  <select
    {...props}
    style={{
      width: "100%", padding: "10px 13px",
      border: "1.5px solid #e8ecf0", borderRadius: 8,
      fontSize: 14, outline: "none",
      fontFamily: "inherit", color: "#1a202c",
      background: "#fff", cursor: "pointer",
      boxSizing: "border-box",
      transition: "border-color 0.18s",
      ...props.style,
    }}
    onFocus={e => { e.target.style.borderColor = "#27ae60"; }}
    onBlur={e => { e.target.style.borderColor = "#e8ecf0"; }}
  >
    {children}
  </select>
);

// ── Textarea ──────────────────────────────────────────────────
export const Textarea = ({ ...props }) => (
  <textarea
    {...props}
    style={{
      width: "100%", padding: "10px 13px",
      border: "1.5px solid #e8ecf0", borderRadius: 8,
      fontSize: 14, outline: "none",
      fontFamily: "inherit", color: "#1a202c",
      background: "#fff", resize: "vertical",
      minHeight: 90, boxSizing: "border-box",
      transition: "border-color 0.18s",
      ...props.style,
    }}
    onFocus={e => { e.target.style.borderColor = "#27ae60"; e.target.style.boxShadow = "0 0 0 3px rgba(39,174,96,0.1)"; }}
    onBlur={e => { e.target.style.borderColor = "#e8ecf0"; e.target.style.boxShadow = "none"; }}
  />
);

// ── Submit button ─────────────────────────────────────────────
export const SubmitBtn = ({ loading, label = "Enregistrer", icon = "💾" }) => (
  <button
    type="submit"
    disabled={loading}
    style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "11px 24px",
      background: loading ? "#a0aec0" : "#27ae60",
      color: "#fff", border: "none",
      borderRadius: 9, fontSize: 14, fontWeight: 700,
      cursor: loading ? "not-allowed" : "pointer",
      fontFamily: "inherit",
      transition: "all 0.18s",
      boxShadow: loading ? "none" : "0 2px 8px rgba(39,174,96,0.3)",
    }}
    onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "#1e8449"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
    onMouseLeave={e => { e.currentTarget.style.background = loading ? "#a0aec0" : "#27ae60"; e.currentTarget.style.transform = "translateY(0)"; }}
  >
    {loading ? (
      <><span style={{
        width: 14, height: 14,
        border: "2px solid rgba(255,255,255,0.4)",
        borderTopColor: "#fff", borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.7s linear infinite",
      }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style> Chargement...</>
    ) : <>{icon} {label}</>}
  </button>
);

// ── Back button ───────────────────────────────────────────────
export const BackBtn = ({ to, label = "Retour" }) => (
  <Link to={to} style={{
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "10px 18px",
    background: "#f1f5f9",
    color: "#374151",
    border: "1px solid #e8ecf0",
    borderRadius: 9, textDecoration: "none",
    fontSize: 13.5, fontWeight: 600,
    transition: "all 0.18s",
  }}
    onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
    onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}
  >
    ← {label}
  </Link>
);

// ── Section divider ───────────────────────────────────────────
export const SectionDivider = ({ label }) => (
  <div style={{
    display: "flex", alignItems: "center",
    gap: 12, margin: "22px 0 16px",
  }}>
    <span style={{
      fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.7px",
      color: "#a0aec0", whiteSpace: "nowrap",
    }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
  </div>
);

// ── Spinner ───────────────────────────────────────────────────
export const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
    <div style={{
      width: 40, height: 40,
      border: "3px solid #e8ecf0",
      borderTopColor: "#27ae60",
      borderRadius: "50%",
      animation: "spin 0.75s linear infinite",
    }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
