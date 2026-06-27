import React, { useEffect, useMemo, useState } from "react";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BarChartIcon from "@mui/icons-material/BarChart";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PaymentsIcon from "@mui/icons-material/Payments";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";
import StorefrontIcon from "@mui/icons-material/Storefront";
import * as XLSX from "xlsx";
import gymApi from "../../api/gymApi";
import { Alert, Spinner } from "../UI.jsx";

// ── Constants ──────────────────────────────────────────────────────
const SIDEBAR_WIDTH = 260;

// ── Design tokens ─────────────────────────────────────────────────
const TOKEN = {
  primary: "#27ae60",
  primaryDark: "#1e8449",
  primaryLight: "#d5f5e3",
  sidebarBg: "#1a1f2e",
  sidebarHover: "#252d3d",
  sidebarActive: "#27ae60",
  sidebarText: "#a0aec0",
  sidebarBorder: "rgba(255,255,255,0.06)",
  textPrimary: "#1a202c",
  textSecondary: "#718096",
  textMuted: "#a0aec0",
  border: "#e8ecf0",
  bgPage: "#f4f6f9",
  bgCard: "#ffffff",
  bgInput: "#f8fafc",
  danger: "#e74c3c",
  dangerLight: "#fdecea",
  warning: "#f39c12",
  warningLight: "#fef9e7",
  info: "#2980b9",
  infoLight: "#d6eaf8",
  topbarHeight: 64,
};

// ── Shared styles ────────────────────────────────────────────────
const cardStyle = {
  background: TOKEN.bgCard,
  border: `1px solid ${TOKEN.border}`,
  borderRadius: 14,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  padding: 20,
};

const inputStyle = {
  width: "100%",
  marginBottom: 8,
  padding: "9px 13px",
  borderRadius: 8,
  border: `1.5px solid ${TOKEN.border}`,
  background: TOKEN.bgInput,
  color: TOKEN.textPrimary,
  fontFamily: "inherit",
  fontSize: 13.5,
  outline: "none",
  transition: "all 0.18s",
  boxSizing: "border-box",
};

const buttonStyle = {
  background: TOKEN.primary,
  color: "#fff",
  border: "none",
  borderRadius: 9,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13.5,
  boxShadow: "0 2px 8px rgba(39,174,96,0.3)",
  transition: "all 0.18s",
  fontFamily: "inherit",
};

const statusColor = {
  pending: "#b7791f",
  printed: "#2b6cb0",
  sent_hq: "#6b46c1",
  processed: "#1f7a3d",
  paid: "#166534",
  rejected: "#c0392b",
  unmatched: "#b45309",
  success: "#1f7a3d",
  failed: "#c0392b",
  insufficient_funds: "#c05621",
  retry_scheduled: "#b7791f",
};

const severityStyle = {
  info: { color: TOKEN.info, background: TOKEN.infoLight },
  success: { color: "#166534", background: TOKEN.primaryLight },
  warning: { color: "#92400e", background: TOKEN.warningLight },
  danger: { color: "#991b1b", background: TOKEN.dangerLight },
};

const endpointFallbacks = {
  dashboard: {},
  statistics: {},
  branches: [],
  members: [],
  subscriptions: [],
  contracts: [],
  hqValidations: [],
  authorizations: [],
  payments: [],
  bankReturns: [],
  bankReturnRows: [],
  bankExports: [],
  classes: [],
  coaches: [],
  attendance: [],
  cash: [],
  notifications: [],
  files: [],
  settings: null,
  accessEvents: [],
  contractTemplates: [],
};

const contractTypeOptions = [
  ["gym_membership", "Gym Membership Contract"],
  ["salary_deduction_authorization", "Salary Deduction Authorization"],
  ["personal_training", "Personal Training Agreement"],
  ["corporate_membership", "Corporate Membership Contract"],
  ["spa_membership", "Spa Membership Contract"],
  ["coach_employment", "Coach Employment Agreement"],
  ["custom", "Custom Contract"],
];

const languageOptions = [
  ["fr", "Français"],
  ["en", "English"],
  ["ar", "العربية"],
];

const modules = [
  { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { id: "branches", label: "Salles / Branches", icon: StorefrontIcon, roles: ["admin", "super_admin", "hq_admin", "gym_manager"] },
  { id: "members", label: "Membres", icon: GroupsIcon },
  { id: "subscriptions", label: "Abonnements", icon: CardMembershipIcon },
  { id: "contracts", label: "Contrats", icon: DescriptionIcon },
  { id: "hq", label: "Validation siège", icon: SecurityIcon, roles: ["admin", "super_admin", "hq_admin", "gym_manager"] },
  { id: "authorizations", label: "Autorisations", icon: AccountBalanceIcon },
  { id: "payments", label: "Paiements", icon: PaymentsIcon },
    { id: "bankExports", label: "Genérer TXT/XML", icon: PictureAsPdfIcon, roles: ["admin", "super_admin", "hq_admin", "gym_manager"] },
  { id: "bankReturns", label: "Retours bancaires", icon: ReplayIcon, roles: ["admin", "super_admin", "hq_admin", "gym_manager"] },
  { id: "classes", label: "Classes / Cours", icon: FitnessCenterIcon },
  { id: "coaches", label: "Coachs", icon: GroupsIcon },
  { id: "attendance", label: "Présences", icon: HowToRegIcon },
  { id: "cash", label: "Caisse", icon: PointOfSaleIcon },
  { id: "statistics", label: "Statistiques", icon: BarChartIcon },
  { id: "notifications", label: "Notifications", icon: NotificationsNoneIcon },
  { id: "files", label: "Images & Documents", icon: AttachFileIcon },
  { id: "access", label: "Gestion des accès", icon: SecurityIcon },
  { id: "settings", label: "Paramètres", icon: SettingsIcon, roles: ["admin", "super_admin", "hq_admin", "gym_manager"] },
];

const roleAliases = {
  comptable_senior: "comptable",
  accountant: "comptable",
  manager: "gym_manager",
  "gym manager": "gym_manager",
  "gym-manager": "gym_manager",
  gymmanager: "gym_manager",
  superadmin: "super_admin",
  hqadmin: "hq_admin",
  "hq admin": "hq_admin",
  "hq-admin": "hq_admin",
};

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  return roleAliases[value] || value;
}

function readCurrentRole() {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.role) return normalizeRole(parsed.role);
    }
  } catch (_e) {}
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      return normalizeRole(payload?.role);
    }
  } catch (_e) {
    return "";
  }
  return "";
}

function readCurrentScope() {
  const scope = { role: "", branchId: "" };

  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.role) scope.role = normalizeRole(parsed.role);
      scope.branchId = String(parsed?.gym_branch_id || parsed?.branch_id || parsed?.branchId || parsed?.gymBranchId || scope.branchId || "");
      return scope;
    }
  } catch (_e) {}

  try {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      scope.role = normalizeRole(payload?.role);
      scope.branchId = String(payload?.gym_branch_id || payload?.branch_id || payload?.branchId || payload?.gymBranchId || scope.branchId || "");
      return scope;
    }
  } catch (_e) {}

  return scope;
}

function roleAllowed(currentRole, allowedRoles) {
  if (!allowedRoles?.length) return true;
  return allowedRoles.includes(normalizeRole(currentRole));
}

// ── DataTable ────────────────────────────────────────────────────
function DataTable({ columns, rows, empty = "Aucune donnée.", compact = false }) {
  if (!rows?.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
        <div style={{ fontSize: 14, color: TOKEN.textMuted, fontWeight: 500 }}>{empty}</div>
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: TOKEN.bgInput, borderBottom: `2px solid ${TOKEN.border}` }}>
            {columns.map((col) => (
              <th key={col.key} style={{ padding: compact ? "8px 10px" : "11px 16px", textAlign: "left", fontSize: compact ? 10.5 : 11.5, fontWeight: 700, color: TOKEN.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <TableRow key={row.id || index} columns={columns} row={row} compact={compact} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ columns, row, compact = false }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ borderBottom: `1px solid ${TOKEN.border}`, background: hover ? "#f8fafc" : "#fff", transition: "background 0.15s" }}
    >
      {columns.map((col) => (
        <td key={col.key} style={{ padding: compact ? "8px 10px" : "11px 16px", fontSize: compact ? 12.5 : 13.5, color: TOKEN.textPrimary, verticalAlign: "middle" }}>
          {col.render ? col.render(row) : row[col.key]}
        </td>
      ))}
    </tr>
  );
}

// ── Field ────────────────────────────────────────────────────────
function Field({ as = "input", label, hint, children, ...props }) {
  const [focused, setFocused] = useState(false);
  const focusStyle = focused ? { border: `1.5px solid ${TOKEN.primary}`, background: "#fff" } : {};

  const control = as === "select" ? (
    <select {...props} style={{ ...inputStyle, ...focusStyle, ...(props.style || {}) }} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}>
      {children}
    </select>
  ) : (
    <input {...props} style={{ ...inputStyle, ...focusStyle, ...(props.style || {}) }} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} />
  );

  if (label) {
    return (
      <label style={{ display: "block", marginBottom: 10 }}>
        <span style={{ display: "block", color: "#334155", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
          {label}{props.required ? <span style={{ color: TOKEN.danger }}> *</span> : null}
        </span>
        {control}
        {hint ? <span style={{ display: "block", color: TOKEN.textMuted, fontSize: 12, marginTop: 2 }}>{hint}</span> : null}
      </label>
    );
  }

  if (as === "select") {
    return (
      <select {...props} style={{ ...inputStyle, ...(focused ? focusStyle : {}), ...(props.style || {}) }} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}>
        {children}
      </select>
    );
  }
  return (
    <input {...props} style={{ ...inputStyle, ...(focused ? focusStyle : {}), ...(props.style || {}) }} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} />
  );
}

// ── StatCard ─────────────────────────────────────────────────────
function StatCard({ label, value, accent = false }) {
  return (
    <div style={{ background: accent ? TOKEN.primary : TOKEN.bgCard, border: `1px solid ${accent ? TOKEN.primary : TOKEN.border}`, borderRadius: 14, boxShadow: accent ? "0 4px 16px rgba(39,174,96,0.2)" : "0 1px 4px rgba(0,0,0,0.07)", padding: "18px 20px" }}>
      <div style={{ color: accent ? "rgba(255,255,255,0.75)" : TOKEN.textSecondary, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, marginTop: 6, color: accent ? "#fff" : TOKEN.textPrimary }}>{value}</div>
    </div>
  );
}

// ── Btn ──────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, variant = "primary", style: extraStyle = {}, type = "button" }) {
  const variants = {
    primary: { background: "#1e9e50", boxShadow: "0 3px 10px rgba(30,158,80,0.45)" },
    dark:    { background: "#5b35a8", boxShadow: "0 3px 10px rgba(91,53,168,0.45)" },
    purple:  { background: "#0097b5", boxShadow: "0 3px 10px rgba(0,151,181,0.45)" },
    green:   { background: "#007d6e", boxShadow: "0 3px 10px rgba(0,125,110,0.45)" },
    teal:    { background: "#d4880a", boxShadow: "0 3px 10px rgba(212,136,10,0.45)" },
    violet:  { background: "#7d3dab", boxShadow: "0 3px 10px rgba(125,61,171,0.45)" },
    pink:    { background: "#c4006e", boxShadow: "0 3px 10px rgba(196,0,110,0.45)" },
    amber:   { background: "#b56a10", boxShadow: "0 3px 10px rgba(181,106,16,0.4)" },
    red:     { background: "#cc2020", boxShadow: "0 3px 10px rgba(204,32,32,0.45)" },
    ghost:   { background: "#fff", color: TOKEN.textPrimary, border: `1px solid ${TOKEN.border}`, boxShadow: "none" },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonStyle,
        ...v,
        cursor: disabled ? "not-allowed" : "pointer",
        filter: disabled ? "grayscale(30%)" : "none",
        ...extraStyle,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.12)"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.filter = "none"; }}
    >
      {children}
    </button>
  );
}

// ── SectionTitle ─────────────────────────────────────────────────
function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TOKEN.textPrimary }}>{children}</h3>
      {action}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
const GymManagement = () => {
  const [activeModule, setActiveModule] = useState(() => {
    try {
      return localStorage.getItem("active_module") || "dashboard";
    } catch (_e) {
      return "dashboard";
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentScope] = useState(() => readCurrentScope());
  const currentRole = currentScope.role;
  const [data, setData] = useState({ ...endpointFallbacks });

  const [selectedContract, setSelectedContract] = useState(null);
  const [contractEditorHtml, setContractEditorHtml] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedClassItem, setSelectedClassItem] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedGymFile, setSelectedGymFile] = useState(null);
  const [selectedBankFile, setSelectedBankFile] = useState(null);
  const [bankImportResult, setBankImportResult] = useState(null);
  const [selectedBankSubscriptionIds, setSelectedBankSubscriptionIds] = useState([]);
  const [showBankSelection, setShowBankSelection] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  const [forms, setForms] = useState({
    branch: { branch_code: "", branch_name: "", city: "", hotel_spa_integrated: false },
    member: { branch_id: "", member_code: "", full_name: "", employee_id: "", cin: "", phone: "", email: "", bank_account: "", status: "active" },
    subscription: { branch_id: "", member_id: "", plan_name: "Standard", amount: "", payment_method: "direct", bank_account: "", due_day: 5, start_date: new Date().toISOString().slice(0, 10), end_date: "" },
    coach: { branch_id: "", full_name: "", specialty: "", phone: "", email: "" },
    classItem: { class_name: "", class_type: "", coach_id: "", branch_id: "", capacity: 20, starts_at: new Date().toISOString().slice(0, 16) },
    attendance: { member_id: "", class_id: "", branch_id: "", checkin_type: "gym" },
    cash: { amount: "", direction: "in", payment_method: "cash", label: "", member_id: "", branch_id: "" },
    bankReturn: { payment_id: "", bank_name: "BIAT", result_status: "success", failure_reason: "" },
    file: { file_category: "document", entity_type: "general", entity_id: "", branch_id: "" },
    paymentAttempt: { payment_id: "", outcome: "success", failure_reason: "" },
    accessEvent: { member_id: "", branch_id: "", event_type: "manual_check", access_status: "granted", reason: "" },
    contract: { contract_type: "gym_membership", language: "fr", member_id: "", subscription_id: "", branch_id: "", custom_instructions: "" },
    template: { contract_type: "gym_membership", language: "fr", name: "", description: "", content_skeleton: "" },
    settings: { currency: "DT", default_due_day: 5, occupancy_limit: 80, renewal_warning_days: 3 },
  });

  const unreadCount = useMemo(() => data.notifications.filter((item) => item.status === "unread").length, [data.notifications]);
  const selectedSubscriptionMember = useMemo(
    () => data.members.find((m) => String(m.id) === String(forms.subscription.member_id)),
    [data.members, forms.subscription.member_id]
  );
  useEffect(() => {
    if (forms.subscription.payment_method !== "salary_deduction") return;
    if (forms.subscription.bank_account) return;
    const memberBank = selectedSubscriptionMember?.bank_account || "";
    if (memberBank) {
      setForm("subscription", { bank_account: memberBank });
    }
  }, [forms.subscription.payment_method, forms.subscription.bank_account, selectedSubscriptionMember?.bank_account]);
  const canScanNotifications = roleAllowed(currentRole, ["admin", "super_admin", "hq_admin", "gym_manager", "comptable"]);
  const hqAccessAllowed = useMemo(() => {
    if (roleAllowed(currentRole, ["admin", "super_admin", "hq_admin"])) return true;
    return normalizeRole(currentRole) === "gym_manager" && !String(currentScope.branchId || "").trim();
  }, [currentRole, currentScope.branchId]);
  const visibleModules = useMemo(
    () => modules.filter((mod) => roleAllowed(currentRole, mod.roles) && (mod.id !== "hq" || hqAccessAllowed)),
    [currentRole, hqAccessAllowed]
  );

  const setForm = (name, patch) => setForms((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("active_module");
    localStorage.removeItem("gym_branch_id");
    window.location.href = "/";
  };

  async function loadData({ moduleName = activeModule } = {}) {
    try {
      setLoading(true);
      setError("");
      const alwaysEndpoints = {
        branches: "/branches",
        notifications: "/notifications?limit=20",
        settings: "/settings",
      };
      const moduleEndpoints = {
        dashboard: {
          dashboard: "/dashboard",
          statistics: "/statistics",
          hqValidations: hqAccessAllowed ? "/hq/validations?status=pending" : null,
        },
        branches: {},
        members: {
          members: "/members",
        },
        subscriptions: {
          members: "/members",
          subscriptions: "/subscriptions",
        },
        contracts: {
          members: "/members",
          subscriptions: "/subscriptions",
          contracts: "/contract-ai/contracts",
          contractTemplates: "/contract-ai/templates",
        },
        hq: {
          hqValidations: hqAccessAllowed ? "/hq/validations?status=pending" : null,
        },
        authorizations: {
          members: "/members",
          subscriptions: "/subscriptions",
          authorizations: "/authorizations",
        },
        payments: {
          members: "/members",
          subscriptions: "/subscriptions",
          payments: "/payments",
        },
        bankReturns: {
          bankReturns: "/bank-returns",
          bankReturnRows: "/bank-returns/rows",
        },
        bankExports: {
          authorizations: "/authorizations",
          bankExports: hqAccessAllowed ? "/bank-exports" : null,
        },
        classes: {
          coaches: "/coaches",
          classes: "/classes",
        },
        coaches: {
          coaches: "/coaches",
        },
        attendance: {
          members: "/members",
          classes: "/classes",
          attendance: "/attendance",
        },
        cash: {
          members: "/members",
          cash: "/cash",
        },
        statistics: {
          statistics: "/statistics",
        },
        notifications: {
          notifications: "/notifications?limit=20",
        },
        files: {},
        access: {
          members: "/members",
          accessEvents: "/access-events",
        },
        settings: {
          settings: "/settings",
        },
      };

      const endpoints = {
        ...alwaysEndpoints,
        ...(moduleEndpoints[moduleName] || {}),
      };
      Object.keys(endpoints).forEach((key) => {
        if (!endpoints[key]) delete endpoints[key];
      });

      const entries = await Promise.all(
        Object.entries(endpoints).map(async ([key, url]) => {
          try {
            const res = await gymApi.get(url);
            return [key, res.data];
          } catch (endpointError) {
            const status = endpointError?.response?.status;
            if ([403, 404].includes(status) && Object.prototype.hasOwnProperty.call(endpointFallbacks, key)) {
              return [key, endpointFallbacks[key]];
            }
            throw endpointError;
          }
        })
      );
      const next = Object.fromEntries(entries);
      setData((prev) => ({ ...prev, ...next }));
      if (next.settings) setForms((prev) => ({ ...prev, settings: next.settings }));
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur lors du chargement Gym.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem("active_module", activeModule);
    } catch (_e) {}
  }, [activeModule]);

  useEffect(() => {
    loadData({ moduleName: activeModule });
  }, [activeModule]);

  useEffect(() => {
    if (!visibleModules.some((mod) => mod.id === activeModule)) setActiveModule("dashboard");
  }, [activeModule, visibleModules]);

  useEffect(() => {
    if (activeModule !== "files") return;
    let cancelled = false;
    gymApi.get("/files")
      .then((res) => { if (!cancelled) setData((prev) => ({ ...prev, files: Array.isArray(res.data) ? res.data : [] })); })
      .catch((err) => { const status = err?.response?.status; if (!cancelled && ![403, 404].includes(status)) setError(err?.response?.data?.error || "Erreur fichiers."); });
    return () => { cancelled = true; };
  }, [activeModule]);

  const runAction = async (action, successMessage) => {
    try {
      setError("");
      await action();
      await loadData();
      if (successMessage) setError(successMessage);
    } catch (err) {
      const apiError = err?.response?.data;
      const fallback = typeof apiError === "string" ? apiError : "Action impossible.";
      setError(apiError?.detail ? `${apiError.error} (${apiError.detail})` : (apiError?.error || apiError?.message || fallback));
    }
  };

  const createBranch = (e) => {
    e.preventDefault();
    const payload = { ...forms.branch };
    const action = selectedBranch?.id
      ? gymApi.put(`/branches/${selectedBranch.id}`, payload)
      : gymApi.post("/branches", payload);
    runAction(async () => {
      await action;
      setSelectedBranch(null);
      setForm("branch", { branch_code: "", branch_name: "", city: "", hotel_spa_integrated: false });
    }, selectedBranch?.id ? "Salle mise à jour." : "Salle ajoutée.");
  };

  const editBranch = (branch) => {
    setSelectedBranch(branch);
    setForm("branch", {
      branch_code: branch.branch_code || "",
      branch_name: branch.branch_name || "",
      city: branch.city || "",
      hotel_spa_integrated: Boolean(branch.hotel_spa_integrated),
    });
  };

  const cancelBranchEdit = () => {
    setSelectedBranch(null);
    setForm("branch", { branch_code: "", branch_name: "", city: "", hotel_spa_integrated: false });
  };

  const deleteBranch = (id) => runAction(() => gymApi.delete(`/branches/${id}`));

  const createMember = (e) => {
    e.preventDefault();
    const payload = { ...forms.member, branch_id: forms.member.branch_id ? Number(forms.member.branch_id) : null };
    const action = selectedMember?.id ? gymApi.put(`/members/${selectedMember.id}`, payload) : gymApi.post("/members", payload);
    runAction(async () => {
      await action;
      setSelectedMember(null);
      setForm("member", { branch_id: "", member_code: "", full_name: "", employee_id: "", cin: "", phone: "", email: "", bank_account: "", status: "active" });
    }, selectedMember?.id ? "Membre mis à jour." : "Membre ajouté.");
  };
  const editMember = (member) => {
    setSelectedMember(member);
    setForm("member", {
      branch_id: member.branch_id ? String(member.branch_id) : "",
      member_code: member.member_code || "",
      full_name: member.full_name || "",
      employee_id: member.employee_id || "",
      cin: member.cin || "",
      phone: member.phone || "",
      email: member.email || "",
      bank_account: member.bank_account || "",
      status: member.status || "active",
    });
  };
  const cancelMemberEdit = () => {
    setSelectedMember(null);
    setForm("member", { branch_id: "", member_code: "", full_name: "", employee_id: "", cin: "", phone: "", email: "", bank_account: "", status: "active" });
  };
  const deleteMember = (id) => runAction(() => gymApi.delete(`/members/${id}`));

  const createSubscription = (e) => {
    e.preventDefault();
    const payload = {
      ...forms.subscription,
      amount: Number(forms.subscription.amount),
      member_id: Number(forms.subscription.member_id),
      branch_id: forms.subscription.branch_id ? Number(forms.subscription.branch_id) : null,
      due_day: Number(forms.subscription.due_day || 5),
      end_date: forms.subscription.end_date || null,
      bank_account: forms.subscription.payment_method === "salary_deduction"
        ? (forms.subscription.bank_account || selectedSubscriptionMember?.bank_account || "")
        : "",
    };
    const action = selectedSubscription?.id ? gymApi.patch(`/subscriptions/${selectedSubscription.id}`, payload) : gymApi.post("/subscriptions", payload);
    runAction(async () => {
      await action;
      setSelectedSubscription(null);
      setForm("subscription", { branch_id: "", member_id: "", plan_name: "Standard", amount: "", payment_method: "direct", bank_account: "", due_day: 5, start_date: new Date().toISOString().slice(0, 10), end_date: "" });
    }, selectedSubscription?.id ? "Abonnement mis à jour." : "Abonnement créé.");
  };
  const editSubscription = (subscription) => {
    setSelectedSubscription(subscription);
    setForm("subscription", {
      branch_id: subscription.branch_id ? String(subscription.branch_id) : "",
      member_id: subscription.member_id ? String(subscription.member_id) : "",
      plan_name: subscription.plan_name || "Standard",
      amount: subscription.amount ?? "",
      payment_method: subscription.payment_method || "direct",
      bank_account: subscription.bank_account || "",
      due_day: subscription.due_day || 5,
      start_date: String(subscription.start_date || new Date().toISOString().slice(0, 10)).slice(0, 10),
      end_date: String(subscription.end_date || "").slice(0, 10),
    });
  };
  const cancelSubscriptionEdit = () => {
    setSelectedSubscription(null);
    setForm("subscription", { branch_id: "", member_id: "", plan_name: "Standard", amount: "", payment_method: "direct", bank_account: "", due_day: 5, start_date: new Date().toISOString().slice(0, 10), end_date: "" });
  };
  const deleteSubscription = (id) => runAction(() => gymApi.delete(`/subscriptions/${id}`));
  const updateWorkflow = (id, workflow_status) => runAction(() => gymApi.patch(`/subscriptions/${id}/workflow`, { workflow_status }));
  const createCoach = (e) => {
    e.preventDefault();
    const payload = { ...forms.coach, branch_id: forms.coach.branch_id ? Number(forms.coach.branch_id) : null };
    runAction(async () => {
      if (selectedCoach?.id) { await gymApi.patch(`/coaches/${selectedCoach.id}`, payload); } else { await gymApi.post("/coaches", payload); }
      setSelectedCoach(null);
      setForm("coach", { branch_id: "", full_name: "", specialty: "", phone: "", email: "" });
    }, selectedCoach?.id ? "Coach mis à jour." : "Coach ajouté.");
  };
  const editCoach = (coach) => { setSelectedCoach(coach); setForm("coach", { branch_id: coach.branch_id ? String(coach.branch_id) : "", full_name: coach.full_name || "", specialty: coach.specialty || "", phone: coach.phone || "", email: coach.email || "" }); };
  const cancelCoachEdit = () => { setSelectedCoach(null); setForm("coach", { branch_id: "", full_name: "", specialty: "", phone: "", email: "" }); };
  const deleteCoach = (id) => runAction(() => gymApi.delete(`/coaches/${id}`));
  const createClass = (e) => {
    e.preventDefault();
    const payload = { ...forms.classItem, coach_id: forms.classItem.coach_id ? Number(forms.classItem.coach_id) : null, branch_id: forms.classItem.branch_id ? Number(forms.classItem.branch_id) : null, capacity: Number(forms.classItem.capacity || 20) };
    const action = selectedClassItem?.id ? gymApi.put(`/classes/${selectedClassItem.id}`, payload) : gymApi.post("/classes", payload);
    runAction(async () => {
      await action;
      setSelectedClassItem(null);
      setForm("classItem", { class_name: "", class_type: "", coach_id: "", branch_id: "", capacity: 20, starts_at: new Date().toISOString().slice(0, 16) });
    }, selectedClassItem?.id ? "Cours mis à jour." : "Cours planifié.");
  };
  const editClass = (item) => {
    setSelectedClassItem(item);
    setForm("classItem", {
      class_name: item.class_name || "",
      class_type: item.class_type || "",
      coach_id: item.coach_id ? String(item.coach_id) : "",
      branch_id: item.branch_id ? String(item.branch_id) : "",
      capacity: item.capacity ?? 20,
      starts_at: String(item.starts_at || new Date().toISOString().slice(0, 16)).slice(0, 16),
    });
  };
  const cancelClassEdit = () => {
    setSelectedClassItem(null);
    setForm("classItem", { class_name: "", class_type: "", coach_id: "", branch_id: "", capacity: 20, starts_at: new Date().toISOString().slice(0, 16) });
  };
  const deleteClass = (id) => runAction(() => gymApi.delete(`/classes/${id}`));
  const checkIn = (e) => { e.preventDefault(); runAction(() => gymApi.post("/attendance/checkin", { ...forms.attendance, member_id: forms.attendance.member_id ? Number(forms.attendance.member_id) : null, class_id: forms.attendance.class_id ? Number(forms.attendance.class_id) : null, branch_id: forms.attendance.branch_id ? Number(forms.attendance.branch_id) : null })); };
  const createCash = (e) => { e.preventDefault(); runAction(() => gymApi.post("/cash", { ...forms.cash, amount: Number(forms.cash.amount), member_id: forms.cash.member_id ? Number(forms.cash.member_id) : null, branch_id: forms.cash.branch_id ? Number(forms.cash.branch_id) : null })); };
  const registerPaymentAttempt = (e) => { e.preventDefault(); runAction(() => gymApi.post(`/payments/${forms.paymentAttempt.payment_id}/attempt`, { outcome: forms.paymentAttempt.outcome, failure_reason: forms.paymentAttempt.failure_reason || null })); };
  const importBankReturn = (e) => { e.preventDefault(); runAction(() => gymApi.post("/bank-returns", { ...forms.bankReturn, payment_id: forms.bankReturn.payment_id ? Number(forms.bankReturn.payment_id) : null })); };
  const importBankReturnFile = (e) => {
    e.preventDefault();
    if (!selectedBankFile) {
      setError("Choisis un fichier Excel avant l'import.");
      return;
    }
    runAction(async () => {
      const buffer = await selectedBankFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("Le fichier Excel ne contient aucune feuille exploitable.");
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const res = await gymApi.post("/bank-returns/import-excel", {
        bank_name: forms.bankReturn.bank_name,
        original_filename: selectedBankFile.name,
        sheet_name: sheetName,
        rows,
      });
      setBankImportResult(res.data || null);
      setSelectedBankFile(null);
    }, "Import bancaire traité avec succès.");
  };
  const deleteBankImport = (id) => {
    if (!window.confirm("Supprimer cet import bancaire et toutes ses lignes ?")) return;
    runAction(() => gymApi.delete(`/bank-returns/${id}`), "Import bancaire supprimé.");
  };
  const toggleBankSubscriptionSelection = (subscriptionId) => {
    const id = Number(subscriptionId);
    setSelectedBankSubscriptionIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };
  const selectAllBankSubscriptions = () => {
    const ids = (data.authorizations || [])
      .map((item) => Number(item.subscription_id || item.id))
      .filter((id) => Number.isFinite(id));
    setSelectedBankSubscriptionIds(ids);
  };
  const clearBankSubscriptionSelection = () => setSelectedBankSubscriptionIds([]);
  const uploadGymDocument = (e) => {
    e.preventDefault();
    if (!selectedGymFile) { setError("Choisis un fichier avant l'upload."); return; }
    const formData = new FormData();
    formData.append("file", selectedGymFile);
    formData.append("file_category", forms.file.file_category || "document");
    formData.append("entity_type", forms.file.entity_type || "general");
    if (forms.file.entity_id) formData.append("entity_id", forms.file.entity_id);
    if (forms.file.branch_id) formData.append("branch_id", forms.file.branch_id);
    runAction(() => gymApi.post("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }));
  };
  const openGymFile = async (id) => {
    try { setError(""); const res = await gymApi.get(`/files/${id}/url`); if (res.data?.url) window.open(res.data.url, "_blank", "noopener,noreferrer"); }
    catch (err) { setError(err?.response?.data?.error || "Ouverture fichier impossible."); }
  };
  const createAccessEvent = (e) => { e.preventDefault(); runAction(() => gymApi.post("/access-events", { ...forms.accessEvent, member_id: forms.accessEvent.member_id ? Number(forms.accessEvent.member_id) : null, branch_id: forms.accessEvent.branch_id ? Number(forms.accessEvent.branch_id) : null })); };
  const validateHq = (subscriptionId, action) => runAction(() => gymApi.post(`/hq/validate/${subscriptionId}`, { action }));
  const sendSubscriptionToHq = (subscriptionId) => runAction(() => gymApi.post(`/subscriptions/${subscriptionId}/send-hq`));
  const downloadAuthorizationPdf = async (subscriptionId) => {
    try {
      setError("");
      const res = await gymApi.get(`/subscriptions/${subscriptionId}/authorization-form.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = `autorisation_prelevement_salaire_SUB-${subscriptionId}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); await loadData();
    } catch (err) { setError(err?.response?.data?.error || "Téléchargement PDF impossible."); }
  };
  const downloadBankExport = async (exportItem) => {
    try {
      setError("");
      const res = await gymApi.get(`/bank-exports/${exportItem.id}/download`, { responseType: "blob" });
      const mimeType = exportItem.file_format === "txt" ? "text/plain" : "application/xml";
      const defaultName = exportItem.file_format === "txt" ? "salary_deduction.txt" : "salary_deduction.xml";
      const url = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const link = document.createElement("a"); link.href = url; link.download = exportItem.file_name || defaultName;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (err) { setError(err?.response?.data?.error || "Téléchargement XML impossible."); }
  };
  const generateAiContract = (e) => {
    e.preventDefault();
    runAction(async () => {
      const res = await gymApi.post("/contract-ai/generate", { ...forms.contract, member_id: forms.contract.member_id ? Number(forms.contract.member_id) : null, subscription_id: forms.contract.subscription_id ? Number(forms.contract.subscription_id) : null, branch_id: forms.contract.branch_id ? Number(forms.contract.branch_id) : null });
      setSelectedContract(res.data.contract); setContractEditorHtml(res.data.contract.content_html || "");
    });
  };
  const selectContract = (contract) => { setSelectedContract(contract); setContractEditorHtml(contract.content_html || ""); };
  const saveContractDraft = () => {
    if (!selectedContract?.id) return;
    runAction(async () => {
      const res = await gymApi.post(`/contract-ai/contracts/${selectedContract.id}/draft`, { title: selectedContract.title, content_html: contractEditorHtml, ai_suggestions: selectedContract.ai_suggestions || [], validation_warnings: selectedContract.validation_warnings || [] });
      setSelectedContract(res.data); setContractEditorHtml(res.data.content_html || "");
    });
  };
  const moveContract = (action) => {
    if (!selectedContract?.id) return;
    runAction(async () => {
      const res = await gymApi.post(`/contract-ai/contracts/${selectedContract.id}/${action}`);
      setSelectedContract(res.data); setContractEditorHtml(res.data.content_html || "");
    });
  };
  const exportContractPdf = async () => {
    if (!selectedContract?.id) return;
    try {
      const res = await gymApi.get(`/contract-ai/contracts/${selectedContract.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = `${selectedContract.contract_number || "contract"}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (err) { setError(err?.response?.data?.error || "Export PDF impossible."); }
  };
  const saveTemplate = (e) => {
    e.preventDefault();
    const action = selectedTemplate?.id ? gymApi.put(`/contract-ai/templates/${selectedTemplate.id}`, forms.template) : gymApi.post("/contract-ai/templates", forms.template);
    runAction(async () => {
      await action;
      setSelectedTemplate(null);
      setForm("template", { contract_type: "gym_membership", language: "fr", name: "", description: "", content_skeleton: "" });
    }, selectedTemplate?.id ? "Template mis à jour." : "Template créé.");
  };
  const editTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setForm("template", {
      contract_type: tpl.contract_type || "gym_membership",
      language: tpl.language || "fr",
      name: tpl.name || "",
      description: tpl.description || "",
      content_skeleton: tpl.content_skeleton || "",
    });
  };
  const cancelTemplateEdit = () => {
    setSelectedTemplate(null);
    setForm("template", { contract_type: "gym_membership", language: "fr", name: "", description: "", content_skeleton: "" });
  };
  const deleteTemplate = (id) => runAction(() => gymApi.delete(`/contract-ai/templates/${id}`));
  const saveSettings = (e) => { e.preventDefault(); runAction(() => gymApi.put("/settings", { ...forms.settings, default_due_day: Number(forms.settings.default_due_day), occupancy_limit: Number(forms.settings.occupancy_limit), renewal_warning_days: Number(forms.settings.renewal_warning_days) })); };
  const processMonth = () => { const month_ref = `${new Date().toISOString().slice(0, 7)}-01`; runAction(() => gymApi.post("/payments/process-month", { month_ref })); };
  const generateBankExport = async (format) => {
    try {
      setError("");
      const selectedIds = selectedBankSubscriptionIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      if (!selectedIds.length) {
        setError("Selectionne au moins un abonne.");
        return;
      }
      const month_ref = `${new Date().toISOString().slice(0, 7)}-01`;
      const res = await gymApi.post(
        `/payments/batch/xml?download=1&format=${format}`,
        { month_ref, selected_subscription_ids: selectedIds },
        { responseType: "blob" }
      );
      const isTxt = format === "txt";
      const mimeType = isTxt ? "text/plain" : "application/xml";
      const defaultName = isTxt ? "salary_deduction.txt" : "salary_deduction.xml";
      const url = URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error || "Téléchargement impossible.");
    }
  };
  const markNotificationRead = (id) => runAction(() => gymApi.patch(`/notifications/${id}/read`));
  const scanExpirations = () => {
    if (!canScanNotifications) { setError("Action réservée aux rôles admin, siège, manager ou comptable."); return; }
    runAction(() => gymApi.post("/notifications/scan-expirations"));
  };

  // ── Module renderers ────────────────────────────────────────
  const renderDashboard = () => {
    const d = data.dashboard || {};
    const stats = data.statistics || {};
    const cards = [
      { label: "Revenue", value: `${Number(d.revenue || 0).toFixed(3)} DT`, accent: true },
      { label: "Abonnés actifs", value: d.active_subscribers || 0 },
      { label: "En attente", value: d.pending_subscriptions || 0 },
      { label: "Impayés", value: d.unpaid_subscriptions || 0 },
      { label: "Taux de succès", value: `${d.payment_success_rate || 0}%` },
      { label: "Salles", value: stats.branches || 0 },
      { label: "Classes", value: stats.classes || 0 },
      { label: "Check-ins aujourd'hui", value: stats.today_checkins || 0 },
      { label: "Validations HQ", value: data.hqValidations.length || 0 },
      { label: "Solde caisse", value: `${Number(stats.cash_balance || 0).toFixed(3)} DT` },
    ];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 18 }}>
          {cards.map(({ label, value, accent }) => <StatCard key={label} label={label} value={value} accent={!!accent} />)}
        </div>
        <div style={cardStyle}>
          <SectionTitle>Performance par salle</SectionTitle>
          <DataTable columns={[{ key: "branch_name", label: "Salle" }, { key: "subscriptions", label: "Abonnements" }, { key: "revenue", label: "Revenue", render: (r) => `${Number(r.revenue || 0).toFixed(3)} DT` }]} rows={d.branch_performance || []} />
        </div>
      </>
    );
  };

  const renderBranches = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={createBranch} style={cardStyle}>
        <SectionTitle>{selectedBranch ? "Modifier salle" : "Nouvelle salle"}</SectionTitle>
        <Field placeholder="Code salle" value={forms.branch.branch_code} onChange={(e) => setForm("branch", { branch_code: e.target.value })} required />
        <Field placeholder="Nom salle" value={forms.branch.branch_name} onChange={(e) => setForm("branch", { branch_name: e.target.value })} required />
        <Field placeholder="Ville" value={forms.branch.city} onChange={(e) => setForm("branch", { city: e.target.value })} />
        <label style={{ display: "flex", gap: 9, marginBottom: 14, alignItems: "center", cursor: "pointer", color: TOKEN.textPrimary, fontSize: 13.5 }}>
          <input type="checkbox" checked={forms.branch.hotel_spa_integrated} onChange={(e) => setForm("branch", { hotel_spa_integrated: e.target.checked })} />
          Hotel / spa intégré
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn type="submit">{selectedBranch ? "Mettre à jour" : "Ajouter salle"}</Btn>
          {selectedBranch ? <Btn type="button" variant="dark" onClick={cancelBranchEdit}>Annuler</Btn> : null}
        </div>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Gestion des salles</SectionTitle>
        <DataTable columns={[
          { key: "branch_code", label: "Code" },
          { key: "branch_name", label: "Nom" },
          { key: "city", label: "Ville" },
          { key: "hotel_spa_integrated", label: "Hotel/Spa", render: (r) => r.hotel_spa_integrated ? "Oui" : "Non" },
          { key: "action", label: "Action", render: (r) => (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn type="button" onClick={() => editBranch(r)} style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><EditIcon fontSize="small" /></Btn>
              <Btn type="button" onClick={() => deleteBranch(r.id)} variant="red" style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><DeleteOutlineIcon fontSize="small" /></Btn>
            </div>
          ) },
        ]} rows={data.branches} />
      </div>
    </div>
  );

  const renderMembers = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={createMember} style={cardStyle}>
        <SectionTitle>{selectedMember ? "Modifier membre" : "Nouveau membre"}</SectionTitle>
        <Field as="select" value={forms.member.branch_id} onChange={(e) => setForm("member", { branch_id: e.target.value })}>
          <option value="">Affecter à une salle</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
        </Field>
        <Field placeholder="Code membre" value={forms.member.member_code} onChange={(e) => setForm("member", { member_code: e.target.value })} required />
        <Field placeholder="Nom complet" value={forms.member.full_name} onChange={(e) => setForm("member", { full_name: e.target.value })} required />
        <Field placeholder="Matricule employé" value={forms.member.employee_id} onChange={(e) => setForm("member", { employee_id: e.target.value })} />
        <Field placeholder="CIN" value={forms.member.cin} onChange={(e) => setForm("member", { cin: e.target.value })} />
        <Field placeholder="Téléphone" value={forms.member.phone} onChange={(e) => setForm("member", { phone: e.target.value })} />
        <Field placeholder="Email" value={forms.member.email} onChange={(e) => setForm("member", { email: e.target.value })} />
          {/*
        <Field placeholder="Compte bancaire / RIB" value={forms.member.bank_account} onChange={(e) => setForm("member", { bank_account: e.target.value })} />*/}
        
        <Field as="select" value={forms.member.status} onChange={(e) => setForm("member", { status: e.target.value })}>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="suspended">Suspendu</option>
        </Field>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn type="submit">{selectedMember ? "Mettre à jour" : "Ajouter membre"}</Btn>
          {selectedMember ? <Btn type="button" variant="dark" onClick={cancelMemberEdit}>Annuler</Btn> : null}
        </div>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Membres</SectionTitle>
        <DataTable columns={[
          { key: "member_code", label: "Code" },
          { key: "full_name", label: "Nom" },
          { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
          { key: "employee_id", label: "Employé" },
          { key: "cin", label: "CIN" },
          { key: "phone", label: "Téléphone" },
          { key: "status", label: "Statut" },
          { key: "action", label: "Action", render: (r) => (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn type="button" onClick={() => editMember(r)} style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><EditIcon fontSize="small" /></Btn>
              <Btn type="button" onClick={() => deleteMember(r.id)} variant="red" style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><DeleteOutlineIcon fontSize="small" /></Btn>
            </div>
          ) },
        ]} rows={data.members} />
      </div>
    </div>
  );

  const renderSubscriptions = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={createSubscription} style={cardStyle}>
        <SectionTitle>{selectedSubscription ? "Modifier abonnement" : "Nouvel abonnement"}</SectionTitle>
        <Field as="select" label="Salle / branche" hint="Salle dans laquelle l'abonnement sera rattaché." value={forms.subscription.branch_id} onChange={(e) => setForm("subscription", { branch_id: e.target.value })}>
          <option value="">Salle / branche</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
        </Field>
        <Field
          as="select"
          label="Membre"
          hint="Client ou employé concerné par cet abonnement."
          value={forms.subscription.member_id}
          onChange={(e) => {
            const memberId = e.target.value;
            const member = data.members.find((m) => String(m.id) === String(memberId));
            setForm("subscription", {
              member_id: memberId,
              bank_account:
                forms.subscription.payment_method === "salary_deduction"
                  ? (member?.bank_account || "")
                  : forms.subscription.bank_account,
            });
          }}
          required
        >
          <option value="">Sélectionner membre</option>
          {data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}
        </Field>
        <Field label="Plan d'abonnement" hint="Exemple : Standard, Premium, Spa ou Corporate." placeholder="Plan" value={forms.subscription.plan_name} onChange={(e) => setForm("subscription", { plan_name: e.target.value })} required />
        <Field type="number" step="0.001" label="Montant mensuel" hint="Prix mensuel de l'abonnement en DT." placeholder="Montant" value={forms.subscription.amount} onChange={(e) => setForm("subscription", { amount: e.target.value })} required />
        <Field as="select" label="Mode de paiement" value={forms.subscription.payment_method} onChange={(e) => setForm("subscription", { payment_method: e.target.value, bank_account: e.target.value === "salary_deduction" ? forms.subscription.bank_account : "" })}>
          <option value="direct">Paiement direct</option>
          <option value="salary_deduction">Prélèvement salaire</option>
        </Field>
        {forms.subscription.payment_method === "salary_deduction" && (
          <Field
            placeholder="Compte bancaire / RIB"
            label="RIB"
            hint="Utilisé pour le prélèvement bancaire et les documents d'autorisation."
            value={forms.subscription.bank_account}
            onChange={(e) => setForm("subscription", { bank_account: e.target.value })}
            required
          />
        )}
        <Field type="number" min="1" max="28" label="Jour d'échéance" placeholder="Jour échéance" value={forms.subscription.due_day} onChange={(e) => setForm("subscription", { due_day: e.target.value })} />
        <Field type="date" label="Date de début" value={forms.subscription.start_date} onChange={(e) => setForm("subscription", { start_date: e.target.value })} required />
        <Field type="date" label="Date de fin" value={forms.subscription.end_date} onChange={(e) => setForm("subscription", { end_date: e.target.value })} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn type="submit">{selectedSubscription ? "Mettre à jour" : "Créer abonnement"}</Btn>
          {selectedSubscription ? <Btn type="button" variant="dark" onClick={cancelSubscriptionEdit}>Annuler</Btn> : null}
        </div>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Abonnements</SectionTitle>
        <DataTable
          columns={[
            { key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
            { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
            { key: "plan_name", label: "Plan" },
            { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
            { key: "payment_method", label: "Paiement" },
            { key: "workflow_status", label: "Workflow", render: (r) => <b style={{ color: statusColor[r.workflow_status] || TOKEN.textPrimary }}>{r.workflow_status}</b> },
            {
              key: "action", label: "Action",
              render: (r) => (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={r.workflow_status} onChange={(e) => updateWorkflow(r.id, e.target.value)} style={{ ...inputStyle, marginBottom: 0, minWidth: 130 }}>
                    <option value="pending">pending</option>
                    <option value="printed">printed</option>
                    <option value="sent_hq">sent_hq</option>
                    <option value="processed">processed</option>
                  </select>
                  <Btn type="button" onClick={() => editSubscription(r)} style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><EditIcon fontSize="small" /></Btn>
                  <Btn type="button" onClick={() => deleteSubscription(r.id)} variant="red" style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><DeleteOutlineIcon fontSize="small" /></Btn>
                  {r.payment_method === "salary_deduction" ? (
                    <>
                      <Btn onClick={() => downloadAuthorizationPdf(r.id)} style={{ padding: "7px 10px", display: "inline-flex", gap: 5, alignItems: "center" }}><PictureAsPdfIcon fontSize="small" /> Autorisation</Btn>
                      <Btn onClick={() => sendSubscriptionToHq(r.id)} variant="purple" style={{ padding: "7px 10px" }}>Envoyer siège</Btn>
                    </>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={data.subscriptions}
        />
      </div>
    </div>
  );

  const renderContracts = () => {
    const suggestions = Array.isArray(selectedContract?.ai_suggestions) ? selectedContract.ai_suggestions : [];
    const warnings = Array.isArray(selectedContract?.validation_warnings) ? selectedContract.validation_warnings : [];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr 320px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <form onSubmit={generateAiContract} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <AutoAwesomeIcon fontSize="small" style={{ color: TOKEN.primary }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TOKEN.textPrimary }}>AI Contract Assistant</h3>
            </div>
            <Field as="select" value={forms.contract.contract_type} onChange={(e) => setForm("contract", { contract_type: e.target.value })}>{contractTypeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>
            <Field as="select" value={forms.contract.language} onChange={(e) => setForm("contract", { language: e.target.value })}>{languageOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>
            <Field as="select" value={forms.contract.member_id} onChange={(e) => setForm("contract", { member_id: e.target.value })}><option value="">Member profile</option>{data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}</Field>
            <Field as="select" value={forms.contract.subscription_id} onChange={(e) => setForm("contract", { subscription_id: e.target.value })}><option value="">Subscription plan</option>{data.subscriptions.map((s) => <option key={s.id} value={s.id}>{s.full_name} - {s.plan_name} - {s.amount} DT</option>)}</Field>
            <Field as="select" value={forms.contract.branch_id} onChange={(e) => setForm("contract", { branch_id: e.target.value })}><option value="">Gym branch</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}</Field>
            <textarea value={forms.contract.custom_instructions} onChange={(e) => setForm("contract", { custom_instructions: e.target.value })} placeholder="Custom instructions..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <Btn type="submit" style={{ width: "100%", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}><AutoAwesomeIcon fontSize="small" /> Generate contract</Btn>
          </form>
          <form onSubmit={saveTemplate} style={cardStyle}>
            <SectionTitle>{selectedTemplate ? "Modifier template" : "Templates"}</SectionTitle>
            <Field as="select" value={forms.template.contract_type} onChange={(e) => setForm("template", { contract_type: e.target.value })}>{contractTypeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>
            <Field as="select" value={forms.template.language} onChange={(e) => setForm("template", { language: e.target.value })}>{languageOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Field>
            <Field placeholder="Template name" value={forms.template.name} onChange={(e) => setForm("template", { name: e.target.value })} required />
            <textarea value={forms.template.content_skeleton} onChange={(e) => setForm("template", { content_skeleton: e.target.value })} placeholder="Template skeleton" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn type="submit" style={{ width: "100%" }}>{selectedTemplate ? "Mettre à jour" : "Save template"}</Btn>
              {selectedTemplate ? <Btn type="button" variant="dark" onClick={cancelTemplateEdit}>Annuler</Btn> : null}
            </div>
            <div style={{ marginTop: 10, color: TOKEN.textMuted, fontSize: 13 }}>{data.contractTemplates.length} templates available</div>
            <div style={{ marginTop: 12 }}>
              <DataTable
                empty="Aucun template."
                columns={[
                  { key: "name", label: "Nom" },
                  { key: "contract_type", label: "Type" },
                  { key: "language", label: "Langue" },
                  { key: "action", label: "Action", render: (r) => (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn type="button" onClick={() => editTemplate(r)} style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><EditIcon fontSize="small" /> Modifier</Btn>
                      <Btn type="button" onClick={() => deleteTemplate(r.id)} variant="red" style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><DeleteOutlineIcon fontSize="small" /> Supprimer</Btn>
                    </div>
                  ) },
                ]}
                rows={data.contractTemplates}
              />
            </div>
          </form>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TOKEN.textPrimary }}>{selectedContract?.title || "Contract preview"}</h3>
                <div style={{ color: TOKEN.textMuted, fontSize: 13, marginTop: 3 }}>{selectedContract ? `${selectedContract.contract_number} · ${selectedContract.status}` : "Generate or select a contract"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Btn onClick={saveContractDraft} disabled={!selectedContract} variant="dark">Save draft</Btn>
                <Btn onClick={() => moveContract("review")} disabled={!selectedContract} variant="purple">Review</Btn>
                <Btn onClick={() => moveContract("approve")} disabled={!selectedContract} variant="green">Approve</Btn>
                <Btn onClick={() => moveContract("ready-to-print")} disabled={!selectedContract} variant="teal">Ready</Btn>
                <Btn onClick={exportContractPdf} disabled={!selectedContract} variant="violet" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><PictureAsPdfIcon fontSize="small" /> PDF</Btn>
              </div>
            </div>
            <textarea value={contractEditorHtml} onChange={(e) => setContractEditorHtml(e.target.value)} rows={18} style={{ ...inputStyle, minHeight: 420, fontFamily: "Consolas, Monaco, monospace", resize: "vertical", lineHeight: 1.45 }} placeholder="<h1>Contract content</h1>" />
            <div style={{ border: `1px solid ${TOKEN.border}`, borderRadius: 10, padding: 18, background: TOKEN.bgInput }}>
              <div style={{ color: TOKEN.textMuted, fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Printable preview</div>
              <div style={{ background: "#fff", border: `1px solid ${TOKEN.border}`, borderRadius: 8, padding: 20, minHeight: 180 }} dangerouslySetInnerHTML={{ __html: contractEditorHtml || "<p>No contract selected.</p>" }} />
            </div>
          </div>
          <div style={cardStyle}>
            <SectionTitle>Generated contracts</SectionTitle>
            <DataTable empty="No contracts generated yet." columns={[{ key: "contract_number", label: "Number" }, { key: "contract_type", label: "Type" }, { key: "full_name", label: "Member" }, { key: "status", label: "Workflow" }, { key: "action", label: "Preview", render: (r) => <Btn onClick={() => selectContract(r)} style={{ padding: "7px 10px" }}>Open</Btn> }]} rows={data.contracts} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={cardStyle}>
            <SectionTitle>AI suggestions</SectionTitle>
            {suggestions.length === 0 ? <div style={{ color: TOKEN.textMuted, fontSize: 13 }}>No suggestions yet.</div> : null}
            {suggestions.map((item, i) => <div key={i} style={{ borderBottom: `1px solid ${TOKEN.border}`, padding: "10px 0" }}><strong style={{ color: TOKEN.textPrimary }}>{item.title || item.type || "Suggestion"}</strong><div style={{ color: TOKEN.textSecondary, marginTop: 4, fontSize: 13.5 }}>{item.text || item.body}</div></div>)}
          </div>
          <div style={cardStyle}>
            <SectionTitle>Validation warnings</SectionTitle>
            {warnings.length === 0 ? <div style={{ color: "#166534", fontSize: 13 }}>No blocking warnings.</div> : null}
            {warnings.map((item, i) => <div key={i} style={{ background: TOKEN.warningLight, border: `1px solid #fde68a`, borderRadius: 8, padding: 10, marginBottom: 8, color: "#92400e" }}><strong>{item.field || item.severity || "Warning"}</strong><div style={{ fontSize: 13.5, marginTop: 2 }}>{item.message || item.text}</div></div>)}
          </div>
          <div style={cardStyle}>
            <SectionTitle>Clause recommendations</SectionTitle>
            {contractTypeOptions.map(([v, l]) => <div key={v} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: `1px solid ${TOKEN.border}`, padding: "8px 0", fontSize: 13.5 }}><span style={{ color: TOKEN.textPrimary }}>{l}</span><span style={{ color: TOKEN.textMuted }}>legal + payment</span></div>)}
          </div>
        </div>
      </div>
    );
  };

  const renderHqValidations = () => (
    <div style={cardStyle}>
      <SectionTitle>Validation siège central</SectionTitle>
      <DataTable empty="Aucune demande HQ en attente ou rôle non autorisé."
        columns={[
          { key: "member_code", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
          { key: "plan_name", label: "Plan" },
          { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
          { key: "payment_method", label: "Paiement" },
          { key: "status", label: "File HQ" },
          { key: "validation_status", label: "Contrat" },
          { key: "action", label: "Action", render: (r) => <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Btn onClick={() => validateHq(r.subscription_id, "approve")} variant="green">Approuver</Btn><Btn onClick={() => validateHq(r.subscription_id, "needs_update")} variant="amber">À corriger</Btn><Btn onClick={() => validateHq(r.subscription_id, "reject")} variant="red">Rejeter</Btn></div> },
        ]}
        rows={data.hqValidations}
      />
    </div>
  );

  const renderAuthorizations = () => (
    <div style={cardStyle}>
      <SectionTitle>Autorisations de prélèvement</SectionTitle>
      <DataTable
        columns={[
          { key: "member_code", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
          { key: "employee_id", label: "Employé" },
          { key: "bank_account", label: "Compte" },
          { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
          { key: "validation_status", label: "Statut" },
          { key: "action", label: "Document", render: (r) => <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Btn onClick={() => downloadAuthorizationPdf(r.subscription_id)} style={{ padding: "7px 10px", display: "inline-flex", gap: 5, alignItems: "center" }}><PictureAsPdfIcon fontSize="small" /> PDF signé</Btn><Btn onClick={() => sendSubscriptionToHq(r.subscription_id)} variant="purple" style={{ padding: "7px 10px" }}>Envoyer siège</Btn></div> },
        ]}
        rows={data.authorizations}
      />
    </div>
  );

  const renderPayments = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={registerPaymentAttempt} style={cardStyle}>
        <SectionTitle>Tentative de paiement</SectionTitle>
        <Field as="select" value={forms.paymentAttempt.payment_id} onChange={(e) => setForm("paymentAttempt", { payment_id: e.target.value })} required>
          <option value="">Paiement</option>
          {data.payments.map((p) => <option key={p.id} value={p.id}>#{p.id} - {p.full_name} - {p.amount} DT</option>)}
        </Field>
        <Field as="select" value={forms.paymentAttempt.outcome} onChange={(e) => setForm("paymentAttempt", { outcome: e.target.value })}>
          <option value="success">Réussi</option>
          <option value="insufficient_funds">Solde insuffisant</option>
          <option value="failed">Échec</option>
        </Field>
        <Field placeholder="Motif si échec" value={forms.paymentAttempt.failure_reason} onChange={(e) => setForm("paymentAttempt", { failure_reason: e.target.value })} />
        <Btn type="submit">Enregistrer tentative</Btn>
      </form>
      <div style={cardStyle}>
        <SectionTitle action={<Btn onClick={processMonth}>Générer mois</Btn>}>Paiements</SectionTitle>
        <DataTable
          columns={[
            { key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
            { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
            { key: "month_ref", label: "Mois", render: (r) => String(r.month_ref || "").slice(0, 10) },
            { key: "due_date", label: "Échéance", render: (r) => String(r.due_date || "").slice(0, 10) },
            { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
            { key: "status", label: "Statut", render: (r) => <b style={{ color: statusColor[r.status] || TOKEN.textPrimary }}>{r.status}</b> },
            { key: "attempt_count", label: "Tentatives" },
          ]}
          rows={data.payments}
        />
      </div>
    </div>
  );

  const renderBankReturns = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        <form onSubmit={importBankReturnFile} style={cardStyle}>
          <SectionTitle>Import automatique Excel</SectionTitle>
          <Field
            label="Banque source"
            as="select"
            value={forms.bankReturn.bank_name}
            onChange={(e) => setForm("bankReturn", { bank_name: e.target.value })}
            hint="Nom du fichier ou banque qui a envoyé le retour."
          >
            <option value="BIAT">BIAT</option>
            <option value="STB">Zitouna</option>
            <option value="STB">STB</option>
            <option value="ATB">ATB</option>
            <option value="BH">BH</option>
            <option value="BNA">BNA</option>
            <option value="AUTRE">Autre</option>
          </Field>
          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ display: "block", color: "#334155", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
              Fichier Excel
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedBankFile(e.target.files?.[0] || null)}
              style={{ ...inputStyle, marginBottom: 0, padding: 10, background: "#fff" }}
            />
          </label>
          <div style={{ color: TOKEN.textMuted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
            Colonnes attendues: <b>Emetteur</b>, <b>RIB creancier</b>, <b>RIB payeur</b>, <b>Ref domiciliation</b>, <b>Libelle</b>, <b>Date Echeance</b>, <b>Montant</b>, <b>Motif rejet</b>.
          </div>
          <Btn type="submit">Importer et rapprocher</Btn>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${TOKEN.border}` }}>
            <div style={{ color: TOKEN.textSecondary, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              Raccourcis
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn onClick={() => setShowBankDetails((v) => !v)} variant="ghost">
                {showBankDetails ? "Masquer l'historique" : "Voir l'historique"}
              </Btn>
            </div>
          </div>
        </form>

        <div style={cardStyle}>
          <SectionTitle>Résultat du rapprochement</SectionTitle>
          {bankImportResult?.summary ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
                <StatCard label="Lignes" value={bankImportResult.summary.totalRows || 0} />
                <StatCard label="Payés" value={bankImportResult.summary.matchedRows || 0} accent />
                <StatCard label="Rejetés" value={bankImportResult.summary.rejectedRows || 0} />
                <StatCard label="À vérifier" value={bankImportResult.summary.unmatchedRows || 0} />
              </div>
              <div style={{ color: TOKEN.textSecondary, fontSize: 13, marginBottom: 16 }}>
                Import créé à partir de <b>{bankImportResult.import?.original_filename || "fichier Excel"}</b>
              </div>
            </>
          ) : (
            <div style={{ padding: "18px 0 10px", color: TOKEN.textMuted, fontSize: 13 }}>
              Envoie un fichier Excel pour lancer le rapprochement automatique. Le système mettra à jour les statuts des abonnements et remontera les lignes sans correspondance.
            </div>
          )}

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: TOKEN.textPrimary }}>Imports récents</h4>
              <DataTable
                empty="Aucun import bancaire pour le moment."
                compact
                columns={[
                  { key: "original_filename", label: "Fichier" },
                  { key: "source_bank", label: "Banque" },
                  { key: "total_rows", label: "Lignes" },
                  { key: "matched_rows", label: "Payés" },
                  { key: "rejected_rows", label: "Rejetés" },
                  { key: "unmatched_rows", label: "À vérifier" },
                  { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 10) },
                  { key: "action", label: "Action", render: (r) => (
                    <Btn
                      onClick={() => deleteBankImport(r.id)}
                      variant="red"
                      title="Supprimer l'import"
                      style={{
                        width: 30,
                        height: 30,
                        minWidth: 30,
                        padding: 0,
                        borderRadius: 8,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </Btn>
                  ) },
                ]}
                rows={data.bankReturns}
              />
            </div>

            {showBankDetails ? (
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: TOKEN.textPrimary }}>Lignes rapprochées</h4>
                <DataTable
                  empty="Aucune ligne importée."
                  columns={[
                    { key: "row_number", label: "Ligne" },
                    { key: "libelle", label: "Libellé" },
                    { key: "member", label: "Membre", render: (r) => `${r.full_name || ""}${r.member_code ? ` (${r.member_code})` : ""}` },
                    { key: "subscription", label: "Abonnement", render: (r) => `${r.plan_name || ""}${r.subscription_id ? ` #${r.subscription_id}` : ""}` },
                    { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
                    { key: "normalized_status", label: "Statut", render: (r) => <b style={{ color: statusColor[r.normalized_status] || TOKEN.textPrimary }}>{r.normalized_status}</b> },
                    { key: "match_source", label: "Source", render: (r) => r.match_source || "auto" },
                    { key: "follow_up_status", label: "Suivi", render: (r) => r.follow_up_status || "pending" },
                    { key: "motif_rejet", label: "Motif", render: (r) => r.motif_rejet || "—" },
                  ]}
                  rows={data.bankReturnRows}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBankExports = () => (
    <div style={{ ...cardStyle, padding: 24, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TOKEN.textPrimary }}>Export prélèvement salaire</h2>
          <div style={{ marginTop: 6, color: TOKEN.textMuted, fontSize: 13 }}>
            Sélectionne les abonnés puis génère le fichier TXT ou XML.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => generateBankExport("txt")}>Générer TXT</Btn>
          <Btn onClick={() => generateBankExport("xml")}>Générer XML</Btn>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TOKEN.textPrimary }}>Sélection des abonnés</h4>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: TOKEN.textMuted }}>{selectedBankSubscriptionIds.length} sélectionné(s)</span>
            <Btn onClick={selectAllBankSubscriptions} variant="teal">Select all</Btn>
            <Btn onClick={clearBankSubscriptionSelection} variant="teal">Clear</Btn>
          </div>
        </div>
        <DataTable
          empty="Aucun abonné disponible."
          columns={[
            { key: "select", label: "Select", render: (r) => <input type="checkbox" checked={selectedBankSubscriptionIds.includes(Number(r.subscription_id || r.id))} onChange={() => toggleBankSubscriptionSelection(r.subscription_id || r.id)} /> },
            { key: "member", label: "Nom", render: (r) => `${r.member_code || ""}${r.member_code ? " - " : ""}${r.full_name || ""}` },
            { key: "employee_id", label: "Employé" },
            { key: "bank_account", label: "Compte" },
            { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
            { key: "validation_status", label: "Statut" },
          ]}
          rows={data.authorizations}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <Btn onClick={() => setShowBankDetails((v) => !v)} style={{ minWidth: 120 }}>
          {showBankDetails ? "Voir moins" : "Voir plus"}
        </Btn>
      </div>

      {showBankDetails ? (
        <div style={{ marginBottom: 18 }}>
          <DataTable
            columns={[
              { key: "bank_name", label: "Banque", render: (r) => r.source_bank || "—" },
              { key: "result_status", label: "Résultat", render: (r) => r.normalized_status || "—" },
              { key: "motif_rejet", label: "Motif", render: (r) => r.motif_rejet || "—" },
              { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
            ]}
            rows={data.bankReturnRows}
          />
        </div>
      ) : null}

      <div>
        <h4 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: TOKEN.textPrimary }}>Exports prélèvement salaire</h4>
        <DataTable
          empty="Aucun export bancaire."
          columns={[
            { key: "file_name", label: "Fichier" },
            { key: "file_format", label: "Format", render: (r) => String(r.file_format || "").toUpperCase() },
            { key: "month_ref", label: "Mois", render: (r) => String(r.month_ref || "").slice(0, 10) },
            { key: "batch_status", label: "Statut batch" },
            { key: "download", label: "Télécharger", render: (r) => <Btn onClick={() => downloadBankExport(r)} variant="teal" style={{ padding: "7px 10px" }}>Télécharger</Btn> },
            { key: "created_at", label: "Créé le", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
          ]}
          rows={data.bankExports}
        />
      </div>
    </div>
  );

  const renderClasses = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={createClass} style={cardStyle}>
        <SectionTitle>{selectedClassItem ? "Modifier cours" : "Nouveau cours"}</SectionTitle>
        <Field placeholder="Nom du cours" value={forms.classItem.class_name} onChange={(e) => setForm("classItem", { class_name: e.target.value })} required />
        <Field placeholder="Type" value={forms.classItem.class_type} onChange={(e) => setForm("classItem", { class_type: e.target.value })} />
        <Field as="select" value={forms.classItem.coach_id} onChange={(e) => setForm("classItem", { coach_id: e.target.value })}><option value="">Coach</option>{data.coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Field>
        <Field as="select" value={forms.classItem.branch_id} onChange={(e) => setForm("classItem", { branch_id: e.target.value })}><option value="">Salle</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</Field>
        <Field type="number" value={forms.classItem.capacity} onChange={(e) => setForm("classItem", { capacity: e.target.value })} />
        <Field type="datetime-local" value={forms.classItem.starts_at} onChange={(e) => setForm("classItem", { starts_at: e.target.value })} required />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn type="submit">{selectedClassItem ? "Mettre à jour" : "Planifier cours"}</Btn>
          {selectedClassItem ? <Btn type="button" variant="dark" onClick={cancelClassEdit}>Annuler</Btn> : null}
        </div>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Classes / Cours</SectionTitle>
        <DataTable columns={[
          { key: "class_name", label: "Cours" },
          { key: "class_type", label: "Type" },
          { key: "coach_name", label: "Coach" },
          { key: "branch_name", label: "Salle" },
          { key: "starts_at", label: "Début", render: (r) => String(r.starts_at || "").slice(0, 16).replace("T", " ") },
          { key: "capacity", label: "Capacité" },
          { key: "action", label: "Action", render: (r) => (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn type="button" onClick={() => editClass(r)} style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><EditIcon fontSize="small" /> Modifier</Btn>
              <Btn type="button" onClick={() => deleteClass(r.id)} variant="red" style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><DeleteOutlineIcon fontSize="small" /> Supprimer</Btn>
            </div>
          ) },
        ]} rows={data.classes} />
      </div>
    </div>
  );

  const renderCoaches = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={createCoach} style={cardStyle}>
        <SectionTitle>{selectedCoach ? "Modifier coach" : "Nouveau coach"}</SectionTitle>
        <Field as="select" value={forms.coach.branch_id} onChange={(e) => setForm("coach", { branch_id: e.target.value })} required><option value="">Salle / branche</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}</Field>
        <Field placeholder="Nom complet" value={forms.coach.full_name} onChange={(e) => setForm("coach", { full_name: e.target.value })} required />
        <Field placeholder="Spécialité" value={forms.coach.specialty} onChange={(e) => setForm("coach", { specialty: e.target.value })} />
        <Field placeholder="Téléphone" value={forms.coach.phone} onChange={(e) => setForm("coach", { phone: e.target.value })} />
        <Field placeholder="Email" value={forms.coach.email} onChange={(e) => setForm("coach", { email: e.target.value })} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn type="submit">{selectedCoach ? "Mettre à jour" : "Ajouter coach"}</Btn>
          {selectedCoach ? <Btn type="button" onClick={cancelCoachEdit} variant="dark">Annuler</Btn> : null}
        </div>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Coachs</SectionTitle>
        <DataTable columns={[
          { key: "full_name", label: "Nom" },
          { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
          { key: "specialty", label: "Spécialité" },
          { key: "phone", label: "Téléphone" },
          { key: "email", label: "Email" },
          { key: "status", label: "Statut" },
          { key: "action", label: "Action", render: (r) => (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn type="button" onClick={() => editCoach(r)} style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><EditIcon fontSize="small" /> Modifier</Btn>
              <Btn type="button" onClick={() => deleteCoach(r.id)} variant="red" style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><DeleteOutlineIcon fontSize="small" /> Supprimer</Btn>
            </div>
          ) },
        ]} rows={data.coaches} />
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={checkIn} style={cardStyle}>
        <SectionTitle>Check-in membre</SectionTitle>
        <Field as="select" value={forms.attendance.member_id} onChange={(e) => setForm("attendance", { member_id: e.target.value })} required><option value="">Membre</option>{data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}</Field>
        <Field as="select" value={forms.attendance.class_id} onChange={(e) => setForm("attendance", { class_id: e.target.value })}><option value="">Cours optionnel</option>{data.classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}</Field>
        <Field as="select" value={forms.attendance.branch_id} onChange={(e) => setForm("attendance", { branch_id: e.target.value })}><option value="">Salle optionnelle</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</Field>
        <Btn type="submit">Check-in</Btn>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Présences</SectionTitle>
        <DataTable columns={[{ key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` }, { key: "class_name", label: "Cours" }, { key: "branch_name", label: "Salle" }, { key: "checked_in_at", label: "Heure", render: (r) => String(r.checked_in_at || "").slice(0, 19).replace("T", " ") }]} rows={data.attendance} />
      </div>
    </div>
  );

  const renderCash = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={createCash} style={cardStyle}>
        <SectionTitle>Transaction caisse</SectionTitle>
        <Field type="number" step="0.001" placeholder="Montant" value={forms.cash.amount} onChange={(e) => setForm("cash", { amount: e.target.value })} required />
        <Field as="select" value={forms.cash.direction} onChange={(e) => setForm("cash", { direction: e.target.value })}><option value="in">Entrée</option><option value="out">Sortie</option></Field>
        <Field placeholder="Libellé" value={forms.cash.label} onChange={(e) => setForm("cash", { label: e.target.value })} required />
        <Field as="select" value={forms.cash.member_id} onChange={(e) => setForm("cash", { member_id: e.target.value })}><option value="">Membre optionnel</option>{data.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</Field>
        <Field as="select" value={forms.cash.branch_id} onChange={(e) => setForm("cash", { branch_id: e.target.value })}><option value="">Salle optionnelle</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</Field>
        <Btn type="submit">Enregistrer</Btn>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Caisse</SectionTitle>
        <DataTable columns={[{ key: "label", label: "Libellé" }, { key: "amount", label: "Montant", render: (r) => `${r.direction === "out" ? "-" : ""}${Number(r.amount || 0).toFixed(3)} DT` }, { key: "payment_method", label: "Mode" }, { key: "branch_name", label: "Salle" }, { key: "full_name", label: "Membre" }, { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") }]} rows={data.cash} />
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div style={cardStyle}>
      <SectionTitle action={canScanNotifications ? <Btn onClick={scanExpirations}>Scanner expirations</Btn> : null}>Notifications</SectionTitle>
      <DataTable
        columns={[
          { key: "title", label: "Titre" }, { key: "category", label: "Catégorie" }, { key: "channel", label: "Canal" }, { key: "message", label: "Message" }, { key: "status", label: "Statut" },
          { key: "action", label: "Action", render: (r) => r.status === "unread" ? <Btn onClick={() => markNotificationRead(r.id)} style={{ padding: "7px 10px" }}>Lu</Btn> : <span style={{ color: TOKEN.textMuted }}>Lu</span> },
        ]}
        rows={data.notifications}
      />
    </div>
  );

  const renderFiles = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={uploadGymDocument} style={cardStyle}>
        <SectionTitle>Upload MinIO</SectionTitle>
        <Field as="select" value={forms.file.file_category} onChange={(e) => setForm("file", { file_category: e.target.value })}><option value="document">Document</option><option value="image">Image</option><option value="contract">Contrat</option><option value="authorization">Autorisation de prélèvement</option><option value="bank_return">Retour bancaire</option><option value="member_photo">Photo membre</option><option value="other">Autre</option></Field>
        <Field as="select" value={forms.file.entity_type} onChange={(e) => setForm("file", { entity_type: e.target.value })}><option value="general">Général</option><option value="member">Membre</option><option value="subscription">Abonnement</option><option value="contract">Contrat</option><option value="authorization">Autorisation</option><option value="payment">Paiement</option><option value="bank_return">Retour bancaire</option><option value="branch">Salle</option><option value="coach">Coach</option></Field>
        <Field placeholder="ID entité liée (optionnel)" value={forms.file.entity_id} onChange={(e) => setForm("file", { entity_id: e.target.value })} />
        <Field as="select" value={forms.file.branch_id} onChange={(e) => setForm("file", { branch_id: e.target.value })}><option value="">Salle optionnelle</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</Field>
        <input type="file" onChange={(e) => setSelectedGymFile(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: 8 }} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.xml,.txt" required />
        <Btn type="submit">Enregistrer dans MinIO</Btn>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Images, documents et fichiers Gym</SectionTitle>
        <DataTable columns={[
          { key: "original_filename", label: "Fichier" },
          { key: "file_category", label: "Catégorie" },
          { key: "entity_type", label: "Entité" },
          { key: "entity_id", label: "ID" },
          { key: "mime_type", label: "Type" },
          { key: "file_size", label: "Taille", render: (r) => `${Math.round(Number(r.file_size || 0) / 1024)} KB` },
          { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
          { key: "action", label: "Action", render: (r) => (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn type="button" onClick={() => openGymFile(r.id)} style={{ padding: "7px 10px" }}>Ouvrir</Btn>
              <Btn type="button" onClick={() => runAction(() => gymApi.delete(`/files/${r.id}`))} variant="red" style={{ padding: "7px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}><DeleteOutlineIcon fontSize="small" /> Supprimer</Btn>
            </div>
          ) },
        ]} rows={data.files} />
      </div>
    </div>
  );

  const renderSettings = () => (
    <form onSubmit={saveSettings} style={{ ...cardStyle, maxWidth: 520 }}>
      <SectionTitle>Paramètres Gym</SectionTitle>
      <Field label="Devise" placeholder="Devise" value={forms.settings.currency || ""} onChange={(e) => setForm("settings", { currency: e.target.value })} />
      <Field type="number" label="Jour d'échéance par défaut" value={forms.settings.default_due_day || 5} onChange={(e) => setForm("settings", { default_due_day: e.target.value })} />
      <Field type="number" label="Capacité max (%)" value={forms.settings.occupancy_limit || 80} onChange={(e) => setForm("settings", { occupancy_limit: e.target.value })} />
      <Field type="number" label="Alerte expiration (jours)" value={forms.settings.renewal_warning_days || 3} onChange={(e) => setForm("settings", { renewal_warning_days: e.target.value })} />
      <Btn type="submit">Enregistrer paramètres</Btn>
    </form>
  );

  const renderAccess = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
      <form onSubmit={createAccessEvent} style={cardStyle}>
        <SectionTitle>Journaliser un accès</SectionTitle>
        <Field as="select" value={forms.accessEvent.member_id} onChange={(e) => setForm("accessEvent", { member_id: e.target.value })} required><option value="">Membre</option>{data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}</Field>
        <Field as="select" value={forms.accessEvent.branch_id} onChange={(e) => setForm("accessEvent", { branch_id: e.target.value })}><option value="">Salle</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}</Field>
        <Field as="select" value={forms.accessEvent.event_type} onChange={(e) => setForm("accessEvent", { event_type: e.target.value })}><option value="manual_check">Contrôle manuel</option><option value="checkin">Check-in</option><option value="door_scan">Scan porte</option></Field>
        <Field as="select" value={forms.accessEvent.access_status} onChange={(e) => setForm("accessEvent", { access_status: e.target.value })}><option value="granted">Autorisé</option><option value="denied">Refusé</option><option value="warning">À vérifier</option></Field>
        <Field placeholder="Raison / observation" value={forms.accessEvent.reason} onChange={(e) => setForm("accessEvent", { reason: e.target.value })} />
        <Btn type="submit">Enregistrer accès</Btn>
      </form>
      <div style={cardStyle}>
        <SectionTitle>Gestion des accès</SectionTitle>
        <DataTable columns={[{ key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` }, { key: "branch_name", label: "Salle" }, { key: "event_type", label: "Événement" }, { key: "access_status", label: "Accès" }, { key: "reason", label: "Raison" }, { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") }]} rows={data.accessEvents} />
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div style={cardStyle}>
      <SectionTitle>Statistiques</SectionTitle>
      <DataTable columns={[{ key: "metric", label: "Indicateur" }, { key: "value", label: "Valeur" }]} rows={Object.entries(data.statistics || {}).map(([metric, value]) => ({ id: metric, metric, value: String(value) }))} />
    </div>
  );

  const renderModule = () => {
    if (!visibleModules.some((mod) => mod.id === activeModule)) return renderDashboard();
    const map = {
      dashboard: renderDashboard, branches: renderBranches, members: renderMembers,
      subscriptions: renderSubscriptions, contracts: renderContracts, hq: renderHqValidations,
      authorizations: renderAuthorizations, payments: renderPayments, bankReturns: renderBankReturns, bankExports: renderBankExports,
      classes: renderClasses, coaches: renderCoaches, attendance: renderAttendance, cash: renderCash,
      statistics: renderStatistics, notifications: renderNotifications, files: renderFiles,
      settings: renderSettings, access: renderAccess,
    };
    return (map[activeModule] || renderDashboard)();
  };

  // ── SidebarNavItem ───────────────────────────────────────────
  function SidebarNavItem({ mod }) {
    const Icon = mod.icon;
    const active = activeModule === mod.id;
    const [hover, setHover] = useState(false);
    return (
      <button
        type="button"
        onClick={() => setActiveModule(mod.id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 11,
          border: "none",
          borderRadius: 9,
          padding: "10px 14px",
          margin: "1px 0",
          background: active ? TOKEN.primary : hover ? TOKEN.sidebarHover : "transparent",
          color: active ? "#fff" : hover ? "#e2e8f0" : TOKEN.sidebarText,
          fontWeight: active ? 700 : 400,
          fontSize: 13.5,
          cursor: "pointer",
          textAlign: "left",
          transition: "all 0.18s",
          fontFamily: "inherit",
          boxShadow: active ? "0 2px 8px rgba(39,174,96,0.25)" : "none",
          flexShrink: 0,
        }}
      >
        <Icon fontSize="small" style={{ flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{mod.label}</span>
      </button>
    );
  }

  // ── MAIN RENDER ──────────────────────────────────────────────
  // The layout: fixed sidebar + fixed topbar + scrollable main content
  // No PageLayout wrapper — we control the full layout ourselves
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: TOKEN.bgPage, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── FIXED SIDEBAR ── */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: sidebarOpen ? 0 : -SIDEBAR_WIDTH,
          width: SIDEBAR_WIDTH,
          height: "100vh",
          background: TOKEN.sidebarBg,
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "2px 0 16px rgba(0,0,0,0.18)",
          overflowX: "hidden",
        }}
      >
        {/* Sidebar brand */}
        <div style={{
          padding: "0 16px",
          height: TOKEN.topbarHeight,
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: `1px solid ${TOKEN.sidebarBorder}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${TOKEN.primary}, ${TOKEN.primaryDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <FitnessCenterIcon style={{ color: "#fff", fontSize: 18 }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14.5, lineHeight: 1.2 }}>Gym Pro</div>
            <div style={{ color: TOKEN.sidebarText, fontSize: 11, marginTop: 1 }}>Management</div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{ padding: "16px 16px 8px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, color: "#4a5568", textTransform: "uppercase" }}>
            Navigation
          </div>
        </div>

        {/* Nav items — scrollable */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 10px 16px" }}>
          {visibleModules.map((mod) => (
            <SidebarNavItem key={mod.id} mod={mod} />
          ))}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${TOKEN.sidebarBorder}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: TOKEN.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{(currentRole || "U")[0].toUpperCase()}</span>
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: "#e2e8f0", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentRole || "Utilisateur"}</div>
              <div style={{ color: TOKEN.sidebarText, fontSize: 11 }}>Connecté</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── OVERLAY (no @media in inline styles — handled via JS state only) ── */}

      {/* ── MAIN AREA (topbar + content) ── */}
      <div
        style={{
          marginLeft: sidebarOpen ? SIDEBAR_WIDTH : 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* ── FIXED TOPBAR ── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 90,
            height: TOKEN.topbarHeight,
            background: "#fff",
            borderBottom: `1px solid ${TOKEN.border}`,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {/* Hamburger toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              width: 38, height: 38, borderRadius: 9,
              borderWidth: 1, borderStyle: "solid", borderColor: TOKEN.border,
              background: TOKEN.bgInput, color: TOKEN.textSecondary,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = TOKEN.primary; e.currentTarget.style.color = TOKEN.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKEN.border; e.currentTarget.style.color = TOKEN.textSecondary; }}
            title={sidebarOpen ? "Masquer le menu" : "Afficher le menu"}
          >
            <MenuIcon fontSize="small" />
          </button>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TOKEN.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Gym Management
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: TOKEN.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Siège central, branches, abonnements, paiements, accès et opérations sportives.
            </p>
          </div>

          {/* Notification bell */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((v) => !v)}
              title="Notifications"
              style={{
                width: 42, height: 42, borderRadius: 9,
                borderWidth: 1, borderStyle: "solid", borderColor: TOKEN.border,
                background: TOKEN.bgInput, color: TOKEN.textPrimary,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative", transition: "all 0.18s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = TOKEN.primary; e.currentTarget.style.color = TOKEN.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKEN.border; e.currentTarget.style.color = TOKEN.textPrimary; }}
            >
              <NotificationsNoneIcon fontSize="small" />
              {unreadCount > 0 ? (
                <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, background: TOKEN.danger, color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                  {unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div style={{ position: "absolute", right: 0, top: 50, width: 420, maxWidth: "calc(100vw - 48px)", background: TOKEN.bgCard, border: `1px solid ${TOKEN.border}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.16)", zIndex: 20, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: `1px solid ${TOKEN.border}` }}>
                  <div>
                    <strong style={{ color: TOKEN.textPrimary, fontSize: 14 }}>Notifications</strong>
                    <div style={{ color: TOKEN.textMuted, fontSize: 12 }}>{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</div>
                  </div>
                  {canScanNotifications ? <Btn onClick={scanExpirations} style={{ padding: "8px 12px", fontSize: 13 }}>Scanner</Btn> : null}
                </div>
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {data.notifications.length === 0 ? <div style={{ color: TOKEN.textMuted, padding: "16px", fontSize: 13.5 }}>Aucune notification.</div> : null}
                  {data.notifications.map((item) => {
                    const tone = severityStyle[item.severity] || severityStyle.info;
                    return (
                      <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${TOKEN.border}`, background: item.status === "unread" ? tone.background : TOKEN.bgCard }}>
                        <div>
                          <strong style={{ color: TOKEN.textPrimary, fontSize: 13.5 }}>{item.title}</strong>
                          <div style={{ color: TOKEN.textSecondary, fontSize: 13, marginTop: 3 }}>{item.message}</div>
                        </div>
                        {item.status === "unread" ? <Btn onClick={() => markNotificationRead(item.id)} variant="ghost" style={{ padding: "6px 10px", fontSize: 12.5 }}>Lu</Btn> : <span style={{ alignSelf: "center", color: TOKEN.textMuted, fontSize: 12 }}>Lu</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={logout}
            title="Déconnexion"
            style={{
              width: 42, height: 42, borderRadius: 9,
              borderWidth: 1, borderStyle: "solid", borderColor: TOKEN.border,
              background: TOKEN.bgInput, color: TOKEN.danger,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = TOKEN.danger; e.currentTarget.style.background = TOKEN.dangerLight; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKEN.border; e.currentTarget.style.background = TOKEN.bgInput; }}
          >
            <LogoutIcon fontSize="small" />
          </button>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main style={{ flex: 1, padding: "18px 20px 20px", overflowX: "hidden" }}>
          {error ? (
            <div style={{
              marginBottom: 16, padding: "12px 16px", borderRadius: 10,
              background: error.includes("impossible") ? TOKEN.dangerLight : TOKEN.infoLight,
              color: error.includes("impossible") ? "#991b1b" : TOKEN.info,
              border: `1px solid ${error.includes("impossible") ? "#fca5a5" : "#93c5fd"}`,
              fontSize: 13.5, fontWeight: 500,
            }}>
              {error}
            </div>
          ) : null}

          {loading ? (
            <div style={{ ...cardStyle, padding: 60, textAlign: "center" }}>
              <div style={{ display: "inline-block", width: 36, height: 36, borderRadius: "50%", border: `3px solid ${TOKEN.border}`, borderTopColor: TOKEN.primary, animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ marginTop: 14, color: TOKEN.textMuted, fontSize: 14 }}>Chargement en cours…</div>
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: 1380, margin: "0 auto" }}>
              {renderModule()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default GymManagement;
