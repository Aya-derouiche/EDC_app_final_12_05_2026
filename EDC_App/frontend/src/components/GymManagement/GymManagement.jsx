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
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PaymentsIcon from "@mui/icons-material/Payments";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReplayIcon from "@mui/icons-material/Replay";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";
import StorefrontIcon from "@mui/icons-material/Storefront";
import gymApi from "../../api/gymApi";

const cardStyle = {
  background: "#fff",
  border: "1px solid #e8ecf0",
  borderRadius: 10,
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  padding: 18,
};

const inputStyle = {
  width: "100%",
  marginBottom: 8,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
};

const buttonStyle = {
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const statusColor = {
  pending: "#b7791f",
  printed: "#2b6cb0",
  sent_hq: "#6b46c1",
  processed: "#1f7a3d",
  success: "#1f7a3d",
  failed: "#c0392b",
  insufficient_funds: "#c05621",
  retry_scheduled: "#b7791f",
};

const severityStyle = {
  info: { color: "#1d4ed8", background: "#eff6ff" },
  success: { color: "#166534", background: "#f0fdf4" },
  warning: { color: "#92400e", background: "#fffbeb" },
  danger: { color: "#991b1b", background: "#fef2f2" },
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
  { id: "branches", label: "Salles / Branches", icon: StorefrontIcon, roles: ["admin", "super_admin", "hq_admin"] },
  { id: "members", label: "Membres", icon: GroupsIcon },
  { id: "subscriptions", label: "Abonnements", icon: CardMembershipIcon },
  { id: "contracts", label: "Contrats", icon: DescriptionIcon },
  { id: "hq", label: "Validation siège", icon: SecurityIcon, roles: ["admin", "super_admin", "hq_admin", "gym_manager"] },
  { id: "authorizations", label: "Autorisations", icon: AccountBalanceIcon },
  { id: "payments", label: "Paiements", icon: PaymentsIcon },
  { id: "bankReturns", label: "Retours bancaires", icon: ReplayIcon, roles: ["admin", "super_admin", "hq_admin"] },
  { id: "classes", label: "Classes / Cours", icon: FitnessCenterIcon },
  { id: "coaches", label: "Coachs", icon: GroupsIcon },
  { id: "attendance", label: "Présences", icon: HowToRegIcon },
  { id: "cash", label: "Caisse", icon: PointOfSaleIcon },
  { id: "statistics", label: "Statistiques", icon: BarChartIcon },
  { id: "notifications", label: "Notifications", icon: NotificationsNoneIcon },
  { id: "files", label: "Images & Documents", icon: AttachFileIcon },
  { id: "access", label: "Gestion des accès", icon: SecurityIcon },
  { id: "settings", label: "Paramètres", icon: SettingsIcon, roles: ["admin", "super_admin", "hq_admin"] },
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
  } catch (_e) {
    // fallback to JWT payload
  }

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

function roleAllowed(currentRole, allowedRoles) {
  if (!allowedRoles?.length) return true;
  return allowedRoles.includes(normalizeRole(currentRole));
}

function DataTable({ columns, rows, empty = "Aucune donnée." }) {
  if (!rows?.length) return <div style={{ color: "#718096" }}>{empty}</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#64748b", fontSize: 12 }}>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: "left", padding: 10 }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} style={{ borderBottom: "1px solid #f1f5f9" }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: 10 }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ as = "input", label, hint, children, ...props }) {
  const control = as === "select"
    ? <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{children}</select>
    : <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;

  if (label) {
    return (
      <label style={{ display: "block", marginBottom: 10 }}>
        <span style={{ display: "block", color: "#334155", fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
          {label}{props.required ? <span style={{ color: "#dc2626" }}> *</span> : null}
        </span>
        {control}
        {hint ? <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: -2 }}>{hint}</span> : null}
      </label>
    );
  }

  if (as === "select") {
    return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }}>{children}</select>;
  }
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

const GymManagement = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentRole] = useState(() => readCurrentRole());
  const [data, setData] = useState({
    dashboard: null,
    statistics: null,
    branches: [],
    members: [],
    subscriptions: [],
    contracts: [],
    hqValidations: [],
    authorizations: [],
    payments: [],
    bankReturns: [],
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
  });

  const [selectedContract, setSelectedContract] = useState(null);
  const [contractEditorHtml, setContractEditorHtml] = useState("");
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedGymFile, setSelectedGymFile] = useState(null);

  const [forms, setForms] = useState({
    branch: { branch_code: "", branch_name: "", city: "", hotel_spa_integrated: false },
    member: { branch_id: "", member_code: "", full_name: "", employee_id: "", cin: "", phone: "", email: "", bank_account: "", status: "active" },
    subscription: { branch_id: "", member_id: "", plan_name: "Standard", amount: "", payment_method: "direct", due_day: 5, start_date: new Date().toISOString().slice(0, 10), end_date: "" },
    coach: { branch_id: "", full_name: "", specialty: "", phone: "", email: "" },
    classItem: { class_name: "", class_type: "", coach_id: "", branch_id: "", capacity: 20, starts_at: new Date().toISOString().slice(0, 16) },
    attendance: { member_id: "", class_id: "", branch_id: "", checkin_type: "gym" },
    cash: { amount: "", direction: "in", payment_method: "cash", label: "", member_id: "", branch_id: "" },
    bankReturn: { payment_id: "", bank_name: "BIAT", result_status: "success", failure_reason: "" },
    file: { file_category: "document", entity_type: "general", entity_id: "", branch_id: "" },
    paymentAttempt: { payment_id: "", outcome: "success", failure_reason: "" },
    accessEvent: { member_id: "", branch_id: "", event_type: "manual_check", access_status: "granted", reason: "" },
    contract: {
      contract_type: "gym_membership",
      language: "fr",
      member_id: "",
      subscription_id: "",
      branch_id: "",
      custom_instructions: "",
    },
    template: {
      contract_type: "gym_membership",
      language: "fr",
      name: "",
      description: "",
      content_skeleton: "",
    },
    settings: { currency: "DT", default_due_day: 5, occupancy_limit: 80, renewal_warning_days: 3 },
  });

  const unreadCount = useMemo(
    () => data.notifications.filter((item) => item.status === "unread").length,
    [data.notifications]
  );
  const canScanNotifications = roleAllowed(currentRole, ["admin", "super_admin", "hq_admin", "gym_manager", "comptable"]);
  const visibleModules = useMemo(
    () => modules.filter((mod) => roleAllowed(currentRole, mod.roles)),
    [currentRole]
  );

  const setForm = (name, patch) => {
    setForms((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  };

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const endpoints = {
        dashboard: "/dashboard",
        statistics: "/statistics",
        branches: "/branches",
        members: "/members",
        subscriptions: "/subscriptions",
        contracts: "/contract-ai/contracts",
        contractTemplates: "/contract-ai/templates",
        hqValidations: "/hq/validations?status=pending",
        authorizations: "/authorizations",
        payments: "/payments",
        bankReturns: "/bank-returns",
        bankExports: "/bank-exports",
        classes: "/classes",
        coaches: "/coaches",
        attendance: "/attendance",
        cash: "/cash",
        notifications: "/notifications?limit=50",
        files: "/files",
        settings: "/settings",
        accessEvents: "/access-events",
      };

      if (!roleAllowed(currentRole, ["admin", "super_admin", "hq_admin", "gym_manager"])) {
        delete endpoints.hqValidations;
      }

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
      setData({ ...endpointFallbacks, ...next });
      if (next.settings) {
        setForms((prev) => ({ ...prev, settings: next.settings }));
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Erreur lors du chargement Gym.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!visibleModules.some((mod) => mod.id === activeModule)) {
      setActiveModule("dashboard");
    }
  }, [activeModule, visibleModules]);

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
    runAction(() => gymApi.post("/branches", forms.branch));
  };

  const createMember = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/members", {
      ...forms.member,
      branch_id: forms.member.branch_id ? Number(forms.member.branch_id) : null,
    }));
  };

  const createSubscription = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/subscriptions", {
      ...forms.subscription,
      amount: Number(forms.subscription.amount),
      member_id: Number(forms.subscription.member_id),
      branch_id: forms.subscription.branch_id ? Number(forms.subscription.branch_id) : null,
      due_day: Number(forms.subscription.due_day || 5),
      end_date: forms.subscription.end_date || null,
    }));
  };

  const updateWorkflow = (id, workflow_status) => {
    runAction(() => gymApi.patch(`/subscriptions/${id}/workflow`, { workflow_status }));
  };

  const createCoach = (e) => {
    e.preventDefault();
    const payload = {
      ...forms.coach,
      branch_id: forms.coach.branch_id ? Number(forms.coach.branch_id) : null,
    };
    runAction(async () => {
      if (selectedCoach?.id) {
        await gymApi.patch(`/coaches/${selectedCoach.id}`, payload);
      } else {
        await gymApi.post("/coaches", payload);
      }
      setSelectedCoach(null);
      setForm("coach", { branch_id: "", full_name: "", specialty: "", phone: "", email: "" });
    }, selectedCoach?.id ? "Coach mis a jour." : "Coach ajoute.");
  };

  const editCoach = (coach) => {
    setSelectedCoach(coach);
    setForm("coach", {
      branch_id: coach.branch_id ? String(coach.branch_id) : "",
      full_name: coach.full_name || "",
      specialty: coach.specialty || "",
      phone: coach.phone || "",
      email: coach.email || "",
    });
  };

  const cancelCoachEdit = () => {
    setSelectedCoach(null);
    setForm("coach", { branch_id: "", full_name: "", specialty: "", phone: "", email: "" });
  };

  const createClass = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/classes", {
      ...forms.classItem,
      coach_id: forms.classItem.coach_id ? Number(forms.classItem.coach_id) : null,
      branch_id: forms.classItem.branch_id ? Number(forms.classItem.branch_id) : null,
      capacity: Number(forms.classItem.capacity || 20),
    }));
  };

  const checkIn = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/attendance/checkin", {
      ...forms.attendance,
      member_id: forms.attendance.member_id ? Number(forms.attendance.member_id) : null,
      class_id: forms.attendance.class_id ? Number(forms.attendance.class_id) : null,
      branch_id: forms.attendance.branch_id ? Number(forms.attendance.branch_id) : null,
    }));
  };

  const createCash = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/cash", {
      ...forms.cash,
      amount: Number(forms.cash.amount),
      member_id: forms.cash.member_id ? Number(forms.cash.member_id) : null,
      branch_id: forms.cash.branch_id ? Number(forms.cash.branch_id) : null,
    }));
  };

  const registerPaymentAttempt = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post(`/payments/${forms.paymentAttempt.payment_id}/attempt`, {
      outcome: forms.paymentAttempt.outcome,
      failure_reason: forms.paymentAttempt.failure_reason || null,
    }));
  };

  const importBankReturn = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/bank-returns", {
      ...forms.bankReturn,
      payment_id: forms.bankReturn.payment_id ? Number(forms.bankReturn.payment_id) : null,
    }));
  };

  const uploadGymDocument = (e) => {
    e.preventDefault();
    if (!selectedGymFile) {
      setError("Choisis un fichier avant l'upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedGymFile);
    formData.append("file_category", forms.file.file_category || "document");
    formData.append("entity_type", forms.file.entity_type || "general");
    if (forms.file.entity_id) formData.append("entity_id", forms.file.entity_id);
    if (forms.file.branch_id) formData.append("branch_id", forms.file.branch_id);

    runAction(() => gymApi.post("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }));
  };

  const openGymFile = async (id) => {
    try {
      setError("");
      const res = await gymApi.get(`/files/${id}/url`);
      if (res.data?.url) window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err?.response?.data?.error || "Ouverture fichier impossible.");
    }
  };

  const createAccessEvent = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/access-events", {
      ...forms.accessEvent,
      member_id: forms.accessEvent.member_id ? Number(forms.accessEvent.member_id) : null,
      branch_id: forms.accessEvent.branch_id ? Number(forms.accessEvent.branch_id) : null,
    }));
  };

  const validateHq = (subscriptionId, action) => {
    runAction(() => gymApi.post(`/hq/validate/${subscriptionId}`, { action }));
  };

  const sendSubscriptionToHq = (subscriptionId) => {
    runAction(() => gymApi.post(`/subscriptions/${subscriptionId}/send-hq`));
  };

  const downloadAuthorizationPdf = async (subscriptionId) => {
    try {
      setError("");
      const res = await gymApi.get(`/subscriptions/${subscriptionId}/authorization-form.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `autorisation_prelevement_salaire_SUB-${subscriptionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      await loadData();
    } catch (err) {
      const apiError = err?.response?.data;
      setError(apiError?.error || "Telechargement PDF impossible.");
    }
  };

  const downloadBankExport = async (exportItem) => {
    try {
      setError("");
      const res = await gymApi.get(`/bank-exports/${exportItem.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/xml" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = exportItem.file_name || "salary_deduction.xml";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = err?.response?.data;
      setError(apiError?.error || "Telechargement XML impossible.");
    }
  };

  const generateAiContract = (e) => {
    e.preventDefault();
    runAction(async () => {
      const res = await gymApi.post("/contract-ai/generate", {
        ...forms.contract,
        member_id: forms.contract.member_id ? Number(forms.contract.member_id) : null,
        subscription_id: forms.contract.subscription_id ? Number(forms.contract.subscription_id) : null,
        branch_id: forms.contract.branch_id ? Number(forms.contract.branch_id) : null,
      });
      setSelectedContract(res.data.contract);
      setContractEditorHtml(res.data.contract.content_html || "");
    });
  };

  const selectContract = (contract) => {
    setSelectedContract(contract);
    setContractEditorHtml(contract.content_html || "");
  };

  const saveContractDraft = () => {
    if (!selectedContract?.id) return;
    runAction(async () => {
      const res = await gymApi.post(`/contract-ai/contracts/${selectedContract.id}/draft`, {
        title: selectedContract.title,
        content_html: contractEditorHtml,
        ai_suggestions: selectedContract.ai_suggestions || [],
        validation_warnings: selectedContract.validation_warnings || [],
      });
      setSelectedContract(res.data);
      setContractEditorHtml(res.data.content_html || "");
    });
  };

  const moveContract = (action) => {
    if (!selectedContract?.id) return;
    runAction(async () => {
      const res = await gymApi.post(`/contract-ai/contracts/${selectedContract.id}/${action}`);
      setSelectedContract(res.data);
      setContractEditorHtml(res.data.content_html || "");
    });
  };

  const exportContractPdf = async () => {
    if (!selectedContract?.id) return;
    try {
      const res = await gymApi.get(`/contract-ai/contracts/${selectedContract.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedContract.contract_number || "contract"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = err?.response?.data;
      setError(apiError?.error || "Export PDF impossible.");
    }
  };

  const saveTemplate = (e) => {
    e.preventDefault();
    runAction(() => gymApi.post("/contract-ai/templates", forms.template));
  };

  const saveSettings = (e) => {
    e.preventDefault();
    runAction(() => gymApi.put("/settings", {
      ...forms.settings,
      default_due_day: Number(forms.settings.default_due_day),
      occupancy_limit: Number(forms.settings.occupancy_limit),
      renewal_warning_days: Number(forms.settings.renewal_warning_days),
    }));
  };

  const processMonth = () => {
    const month_ref = `${new Date().toISOString().slice(0, 7)}-01`;
    runAction(() => gymApi.post("/payments/process-month", { month_ref }));
  };

  const generateXml = () => {
    const month_ref = `${new Date().toISOString().slice(0, 7)}-01`;
    runAction(() => gymApi.post("/payments/batch/xml", { month_ref }));
  };

  const markNotificationRead = (id) => {
    runAction(() => gymApi.patch(`/notifications/${id}/read`));
  };

  const scanExpirations = () => {
    if (!canScanNotifications) {
      setError("Action réservée aux rôles admin, siège, manager ou comptable.");
      return;
    }
    runAction(() => gymApi.post("/notifications/scan-expirations"));
  };

  const renderDashboard = () => {
    const d = data.dashboard || {};
    const stats = data.statistics || {};
    const cards = [
      ["Revenue", `${Number(d.revenue || 0).toFixed(3)} DT`],
      ["Active subscribers", d.active_subscribers || 0],
      ["Pending subscriptions", d.pending_subscriptions || 0],
      ["Unpaid", d.unpaid_subscriptions || 0],
      ["Success rate", `${d.payment_success_rate || 0}%`],
      ["Branches", stats.branches || 0],
      ["Classes", stats.classes || 0],
      ["Today check-ins", stats.today_checkins || 0],
      ["HQ validations", data.hqValidations.length || 0],
      ["Cash balance", `${Number(stats.cash_balance || 0).toFixed(3)} DT`],
    ];

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 16 }}>
          {cards.map(([label, value]) => (
            <div key={label} style={cardStyle}>
              <div style={{ color: "#718096", fontSize: 12 }}>{label}</div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Performance par salle</h3>
          <DataTable
            columns={[
              { key: "branch_name", label: "Salle" },
              { key: "subscriptions", label: "Abonnements" },
              { key: "revenue", label: "Revenue", render: (r) => `${Number(r.revenue || 0).toFixed(3)} DT` },
            ]}
            rows={d.branch_performance || []}
          />
        </div>
      </>
    );
  };

  const renderBranches = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={createBranch} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Nouvelle salle</h3>
        <Field placeholder="Code salle" value={forms.branch.branch_code} onChange={(e) => setForm("branch", { branch_code: e.target.value })} required />
        <Field placeholder="Nom salle" value={forms.branch.branch_name} onChange={(e) => setForm("branch", { branch_name: e.target.value })} required />
        <Field placeholder="Ville" value={forms.branch.city} onChange={(e) => setForm("branch", { city: e.target.value })} />
        <label style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={forms.branch.hotel_spa_integrated} onChange={(e) => setForm("branch", { hotel_spa_integrated: e.target.checked })} />
          Hotel / spa intégré
        </label>
        <button style={buttonStyle}>Ajouter salle</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Gestion des salles</h3>
        <DataTable
          columns={[
            { key: "branch_code", label: "Code" },
            { key: "branch_name", label: "Nom" },
            { key: "city", label: "Ville" },
            { key: "hotel_spa_integrated", label: "Hotel/Spa", render: (r) => r.hotel_spa_integrated ? "Oui" : "Non" },
          ]}
          rows={data.branches}
        />
      </div>
    </div>
  );

  const renderMembers = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={createMember} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Nouveau membre</h3>
        <Field as="select" value={forms.member.branch_id} onChange={(e) => setForm("member", { branch_id: e.target.value })}>
          <option value="">Affecter a une salle</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
        </Field>
        <Field placeholder="Code membre" value={forms.member.member_code} onChange={(e) => setForm("member", { member_code: e.target.value })} required />
        <Field placeholder="Nom complet" value={forms.member.full_name} onChange={(e) => setForm("member", { full_name: e.target.value })} required />
        <Field placeholder="Matricule employe" value={forms.member.employee_id} onChange={(e) => setForm("member", { employee_id: e.target.value })} />
        <Field placeholder="CIN" value={forms.member.cin} onChange={(e) => setForm("member", { cin: e.target.value })} />
        <Field placeholder="Téléphone" value={forms.member.phone} onChange={(e) => setForm("member", { phone: e.target.value })} />
        <Field placeholder="Email" value={forms.member.email} onChange={(e) => setForm("member", { email: e.target.value })} />
        <Field placeholder="Compte bancaire / RIB" value={forms.member.bank_account} onChange={(e) => setForm("member", { bank_account: e.target.value })} />
        <Field as="select" value={forms.member.status} onChange={(e) => setForm("member", { status: e.target.value })}>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="suspended">Suspendu</option>
        </Field>
        <button style={buttonStyle}>Ajouter membre</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Membres</h3>
        <DataTable
          columns={[
            { key: "member_code", label: "Code" },
            { key: "full_name", label: "Nom" },
            { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
            { key: "employee_id", label: "Employe" },
            { key: "cin", label: "CIN" },
            { key: "phone", label: "Telephone" },
            { key: "status", label: "Statut" },
          ]}
          rows={data.members}
        />
      </div>
    </div>
  );

  const renderSubscriptions = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={createSubscription} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Nouvel abonnement</h3>
        <Field as="select" label="Salle / branche" hint="Salle dans laquelle l'abonnement sera rattache." value={forms.subscription.branch_id} onChange={(e) => setForm("subscription", { branch_id: e.target.value })}>
          <option value="">Salle / branche</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
        </Field>
        <Field as="select" label="Membre" hint="Client ou employe concerne par cet abonnement." value={forms.subscription.member_id} onChange={(e) => setForm("subscription", { member_id: e.target.value })} required>
          <option value="">Sélectionner membre</option>
          {data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}
        </Field>
        <Field label="Plan d'abonnement" hint="Exemple : Standard, Premium, Spa ou Corporate." placeholder="Plan" value={forms.subscription.plan_name} onChange={(e) => setForm("subscription", { plan_name: e.target.value })} required />
        <Field type="number" step="0.001" label="Montant mensuel" hint="Prix mensuel de l'abonnement en DT." placeholder="Montant" value={forms.subscription.amount} onChange={(e) => setForm("subscription", { amount: e.target.value })} required />
        <Field as="select" label="Mode de paiement" hint="Paiement direct ou prelevement sur salaire." value={forms.subscription.payment_method} onChange={(e) => setForm("subscription", { payment_method: e.target.value })}>
          <option value="direct">Paiement direct</option>
          <option value="salary_deduction">Prélèvement salaire</option>
        </Field>
        <Field type="number" min="1" max="28" label="Jour d'echeance" hint="Jour du mois utilise pour generer les paiements." placeholder="Jour echeance" value={forms.subscription.due_day} onChange={(e) => setForm("subscription", { due_day: e.target.value })} />
        <Field type="date" label="Date de debut" hint="Date d'activation de l'abonnement." value={forms.subscription.start_date} onChange={(e) => setForm("subscription", { start_date: e.target.value })} required />
        <Field type="date" label="Date de fin" hint="Optionnel : date d'expiration ou de renouvellement." value={forms.subscription.end_date} onChange={(e) => setForm("subscription", { end_date: e.target.value })} />
        <button style={buttonStyle}>Créer abonnement</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Abonnements</h3>
        <DataTable
          columns={[
            { key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
            { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
            { key: "plan_name", label: "Plan" },
            { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
            { key: "payment_method", label: "Paiement" },
            { key: "workflow_status", label: "Workflow", render: (r) => <b style={{ color: statusColor[r.workflow_status] || "#334155" }}>{r.workflow_status}</b> },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={r.workflow_status} onChange={(e) => updateWorkflow(r.id, e.target.value)} style={{ ...inputStyle, marginBottom: 0, minWidth: 130 }}>
                    <option value="pending">pending</option>
                    <option value="printed">printed</option>
                    <option value="sent_hq">sent_hq</option>
                    <option value="processed">processed</option>
                  </select>
                  {r.payment_method === "salary_deduction" ? (
                    <>
                      <button type="button" onClick={() => downloadAuthorizationPdf(r.id)} style={{ ...buttonStyle, padding: "7px 10px", display: "inline-flex", gap: 5, alignItems: "center" }}>
                        <PictureAsPdfIcon fontSize="small" /> Autorisation
                      </button>
                      <button type="button" onClick={() => sendSubscriptionToHq(r.id)} style={{ ...buttonStyle, padding: "7px 10px", background: "#6b46c1" }}>
                        Envoyer siège
                      </button>
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
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr 320px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <form onSubmit={generateAiContract} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <AutoAwesomeIcon fontSize="small" />
              <h3 style={{ margin: 0 }}>AI Contract Assistant</h3>
            </div>
            <Field as="select" value={forms.contract.contract_type} onChange={(e) => setForm("contract", { contract_type: e.target.value })}>
              {contractTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Field>
            <Field as="select" value={forms.contract.language} onChange={(e) => setForm("contract", { language: e.target.value })}>
              {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Field>
            <Field as="select" value={forms.contract.member_id} onChange={(e) => setForm("contract", { member_id: e.target.value })}>
              <option value="">Member profile</option>
              {data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}
            </Field>
            <Field as="select" value={forms.contract.subscription_id} onChange={(e) => setForm("contract", { subscription_id: e.target.value })}>
              <option value="">Subscription plan</option>
              {data.subscriptions.map((s) => <option key={s.id} value={s.id}>{s.full_name} - {s.plan_name} - {s.amount} DT</option>)}
            </Field>
            <Field as="select" value={forms.contract.branch_id} onChange={(e) => setForm("contract", { branch_id: e.target.value })}>
              <option value="">Gym branch</option>
              {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
            </Field>
            <textarea
              value={forms.contract.custom_instructions}
              onChange={(e) => setForm("contract", { custom_instructions: e.target.value })}
              placeholder="Custom instructions for clauses, duration, payment, legal notes..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <button style={{ ...buttonStyle, width: "100%", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
              <AutoAwesomeIcon fontSize="small" /> Generate contract
            </button>
          </form>

          <form onSubmit={saveTemplate} style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Templates</h3>
            <Field as="select" value={forms.template.contract_type} onChange={(e) => setForm("template", { contract_type: e.target.value })}>
              {contractTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Field>
            <Field as="select" value={forms.template.language} onChange={(e) => setForm("template", { language: e.target.value })}>
              {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Field>
            <Field placeholder="Template name" value={forms.template.name} onChange={(e) => setForm("template", { name: e.target.value })} required />
            <textarea
              value={forms.template.content_skeleton}
              onChange={(e) => setForm("template", { content_skeleton: e.target.value })}
              placeholder="Template skeleton"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <button style={{ ...buttonStyle, width: "100%" }}>Save template</button>
            <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>{data.contractTemplates.length} templates available</div>
          </form>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedContract?.title || "Contract preview"}</h3>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {selectedContract ? `${selectedContract.contract_number} · ${selectedContract.status}` : "Generate or select a contract"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button type="button" onClick={saveContractDraft} disabled={!selectedContract} style={{ ...buttonStyle, background: "#334155" }}>Save draft</button>
                <button type="button" onClick={() => moveContract("review")} disabled={!selectedContract} style={{ ...buttonStyle, background: "#6b46c1" }}>Review</button>
                <button type="button" onClick={() => moveContract("approve")} disabled={!selectedContract} style={{ ...buttonStyle, background: "#166534" }}>Approve</button>
                <button type="button" onClick={() => moveContract("ready-to-print")} disabled={!selectedContract} style={{ ...buttonStyle, background: "#0f766e" }}>Ready</button>
                <button type="button" onClick={exportContractPdf} disabled={!selectedContract} style={{ ...buttonStyle, display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <PictureAsPdfIcon fontSize="small" /> PDF
                </button>
              </div>
            </div>
            <textarea
              value={contractEditorHtml}
              onChange={(e) => setContractEditorHtml(e.target.value)}
              rows={18}
              style={{
                ...inputStyle,
                minHeight: 420,
                fontFamily: "Consolas, Monaco, monospace",
                resize: "vertical",
                lineHeight: 1.45,
              }}
              placeholder="<h1>Contract content</h1>"
            />
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 18, background: "#f8fafc" }}>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Printable preview</div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, minHeight: 180 }} dangerouslySetInnerHTML={{ __html: contractEditorHtml || "<p>No contract selected.</p>" }} />
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Generated contracts</h3>
            <DataTable
              empty="No contracts generated yet."
              columns={[
                { key: "contract_number", label: "Number" },
                { key: "contract_type", label: "Type" },
                { key: "full_name", label: "Member" },
                { key: "status", label: "Workflow" },
                { key: "action", label: "Preview", render: (r) => <button type="button" onClick={() => selectContract(r)} style={{ ...buttonStyle, padding: "7px 10px" }}>Open</button> },
              ]}
              rows={data.contracts}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>AI suggestions</h3>
            {suggestions.length === 0 ? <div style={{ color: "#64748b" }}>No suggestions yet.</div> : null}
            {suggestions.map((item, index) => (
              <div key={`${item.title || item.type}-${index}`} style={{ borderBottom: "1px solid #edf2f7", padding: "10px 0" }}>
                <strong>{item.title || item.type || "Suggestion"}</strong>
                <div style={{ color: "#475569", marginTop: 4 }}>{item.text || item.body}</div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Validation warnings</h3>
            {warnings.length === 0 ? <div style={{ color: "#166534" }}>No blocking warnings.</div> : null}
            {warnings.map((item, index) => (
              <div key={`${item.field || item.message}-${index}`} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10, marginBottom: 8, color: "#92400e" }}>
                <strong>{item.field || item.severity || "Warning"}</strong>
                <div>{item.message || item.text}</div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Clause recommendations</h3>
            {contractTypeOptions.map(([value, label]) => (
              <div key={value} style={{ display: "flex", justifyContent: "space-between", gap: 8, borderBottom: "1px solid #edf2f7", padding: "8px 0" }}>
                <span>{label}</span>
                <span style={{ color: "#64748b" }}>legal + payment</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHqValidations = () => (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Validation siège central</h3>
      <DataTable
        empty="Aucune demande HQ en attente ou rôle non autorisé."
        columns={[
          { key: "member_code", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
          { key: "plan_name", label: "Plan" },
          { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
          { key: "payment_method", label: "Paiement" },
          { key: "status", label: "File HQ" },
          { key: "validation_status", label: "Contrat" },
          {
            key: "action",
            label: "Action",
            render: (r) => (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => validateHq(r.subscription_id, "approve")} style={{ ...buttonStyle, background: "#166534" }}>Approuver</button>
                <button type="button" onClick={() => validateHq(r.subscription_id, "needs_update")} style={{ ...buttonStyle, background: "#b7791f" }}>A corriger</button>
                <button type="button" onClick={() => validateHq(r.subscription_id, "reject")} style={{ ...buttonStyle, background: "#991b1b" }}>Rejeter</button>
              </div>
            ),
          },
        ]}
        rows={data.hqValidations}
      />
    </div>
  );

  const renderAuthorizations = () => (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Autorisations de prélèvement</h3>
      <DataTable
        columns={[
          { key: "member_code", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
          { key: "employee_id", label: "Employé" },
          { key: "bank_account", label: "Compte" },
          { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
          { key: "validation_status", label: "Statut" },
          {
            key: "action",
            label: "Document",
            render: (r) => (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => downloadAuthorizationPdf(r.subscription_id)} style={{ ...buttonStyle, padding: "7px 10px", display: "inline-flex", gap: 5, alignItems: "center" }}>
                  <PictureAsPdfIcon fontSize="small" /> PDF signé
                </button>
                <button type="button" onClick={() => sendSubscriptionToHq(r.subscription_id)} style={{ ...buttonStyle, padding: "7px 10px", background: "#6b46c1" }}>
                  Envoyer siège
                </button>
              </div>
            ),
          },
        ]}
        rows={data.authorizations}
      />
    </div>
  );

  const renderPayments = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={registerPaymentAttempt} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Tentative de paiement</h3>
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
        <button style={buttonStyle}>Enregistrer tentative</button>
      </form>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Paiements</h3>
          <button type="button" onClick={processMonth} style={buttonStyle}>Générer mois</button>
        </div>
        <DataTable
          columns={[
            { key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
            { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
            { key: "month_ref", label: "Mois", render: (r) => String(r.month_ref || "").slice(0, 10) },
            { key: "due_date", label: "Échéance", render: (r) => String(r.due_date || "").slice(0, 10) },
            { key: "amount", label: "Montant", render: (r) => `${Number(r.amount || 0).toFixed(3)} DT` },
            { key: "status", label: "Statut", render: (r) => <b style={{ color: statusColor[r.status] || "#334155" }}>{r.status}</b> },
            { key: "attempt_count", label: "Tentatives" },
          ]}
          rows={data.payments}
        />
      </div>
    </div>
  );

  const renderBankReturns = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={importBankReturn} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Importer retour bancaire</h3>
        <Field as="select" value={forms.bankReturn.payment_id} onChange={(e) => setForm("bankReturn", { payment_id: e.target.value })}>
          <option value="">Paiement optionnel</option>
          {data.payments.map((p) => <option key={p.id} value={p.id}>#{p.id} - {p.full_name} - {p.amount} DT</option>)}
        </Field>
        <Field placeholder="Banque" value={forms.bankReturn.bank_name} onChange={(e) => setForm("bankReturn", { bank_name: e.target.value })} />
        <Field as="select" value={forms.bankReturn.result_status} onChange={(e) => setForm("bankReturn", { result_status: e.target.value })}>
          <option value="success">success</option>
          <option value="failed">failed</option>
          <option value="insufficient_funds">insufficient_funds</option>
          <option value="account_blocked">account_blocked</option>
        </Field>
        <Field placeholder="Motif échec" value={forms.bankReturn.failure_reason} onChange={(e) => setForm("bankReturn", { failure_reason: e.target.value })} />
        <button style={buttonStyle}>Importer retour</button>
      </form>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Retours bancaires</h3>
          <button type="button" onClick={generateXml} style={buttonStyle}>Générer XML</button>
        </div>
        <DataTable
          columns={[
            { key: "bank_name", label: "Banque" },
            { key: "result_status", label: "Résultat" },
            { key: "failure_reason", label: "Motif" },
            { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
          ]}
          rows={data.bankReturns}
        />
        <h4 style={{ margin: "18px 0 8px" }}>Exports prélèvement salaire</h4>
        <DataTable
          empty="Aucun export bancaire."
          columns={[
            { key: "file_name", label: "Fichier" },
            { key: "month_ref", label: "Mois", render: (r) => String(r.month_ref || "").slice(0, 10) },
            { key: "batch_status", label: "Statut batch" },
            {
              key: "download",
              label: "XML",
              render: (r) => (
                <button type="button" onClick={() => downloadBankExport(r)} style={{ ...buttonStyle, padding: "7px 10px", background: "#0f766e" }}>
                  Télécharger
                </button>
              ),
            },
            { key: "created_at", label: "Créé le", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
          ]}
          rows={data.bankExports}
        />
      </div>
    </div>
  );

  const renderClasses = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={createClass} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Nouveau cours</h3>
        <Field placeholder="Nom du cours" value={forms.classItem.class_name} onChange={(e) => setForm("classItem", { class_name: e.target.value })} required />
        <Field placeholder="Type" value={forms.classItem.class_type} onChange={(e) => setForm("classItem", { class_type: e.target.value })} />
        <Field as="select" value={forms.classItem.coach_id} onChange={(e) => setForm("classItem", { coach_id: e.target.value })}>
          <option value="">Coach</option>
          {data.coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </Field>
        <Field as="select" value={forms.classItem.branch_id} onChange={(e) => setForm("classItem", { branch_id: e.target.value })}>
          <option value="">Salle</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </Field>
        <Field type="number" value={forms.classItem.capacity} onChange={(e) => setForm("classItem", { capacity: e.target.value })} />
        <Field type="datetime-local" value={forms.classItem.starts_at} onChange={(e) => setForm("classItem", { starts_at: e.target.value })} required />
        <button style={buttonStyle}>Planifier cours</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Classes / Cours</h3>
        <DataTable
          columns={[
            { key: "class_name", label: "Cours" },
            { key: "class_type", label: "Type" },
            { key: "coach_name", label: "Coach" },
            { key: "branch_name", label: "Salle" },
            { key: "starts_at", label: "Début", render: (r) => String(r.starts_at || "").slice(0, 16).replace("T", " ") },
            { key: "capacity", label: "Capacité" },
          ]}
          rows={data.classes}
        />
      </div>
    </div>
  );

  const renderCoaches = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={createCoach} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>{selectedCoach ? "Modifier coach" : "Nouveau coach"}</h3>
        <Field as="select" value={forms.coach.branch_id} onChange={(e) => setForm("coach", { branch_id: e.target.value })} required>
          <option value="">Salle / branche</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
        </Field>
        <Field placeholder="Nom complet" value={forms.coach.full_name} onChange={(e) => setForm("coach", { full_name: e.target.value })} required />
        <Field placeholder="Spécialité" value={forms.coach.specialty} onChange={(e) => setForm("coach", { specialty: e.target.value })} />
        <Field placeholder="Téléphone" value={forms.coach.phone} onChange={(e) => setForm("coach", { phone: e.target.value })} />
        <Field placeholder="Email" value={forms.coach.email} onChange={(e) => setForm("coach", { email: e.target.value })} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={buttonStyle}>{selectedCoach ? "Mettre a jour" : "Ajouter coach"}</button>
          {selectedCoach ? (
            <button type="button" onClick={cancelCoachEdit} style={{ ...buttonStyle, background: "#64748b" }}>
              Annuler
            </button>
          ) : null}
        </div>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Coachs</h3>
        <DataTable
          columns={[
            { key: "full_name", label: "Nom" },
            { key: "branch_name", label: "Salle", render: (r) => r.branch_name || r.branch_code || (r.branch_id ? `#${r.branch_id}` : "-") },
            { key: "specialty", label: "Spécialité" },
            { key: "phone", label: "Téléphone" },
            { key: "email", label: "Email" },
            { key: "status", label: "Statut" },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <button type="button" onClick={() => editCoach(r)} style={{ ...buttonStyle, padding: "7px 10px" }}>
                  Modifier
                </button>
              ),
            },
          ]}
          rows={data.coaches}
        />
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={checkIn} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Check-in membre</h3>
        <Field as="select" value={forms.attendance.member_id} onChange={(e) => setForm("attendance", { member_id: e.target.value })} required>
          <option value="">Membre</option>
          {data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}
        </Field>
        <Field as="select" value={forms.attendance.class_id} onChange={(e) => setForm("attendance", { class_id: e.target.value })}>
          <option value="">Cours optionnel</option>
          {data.classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </Field>
        <Field as="select" value={forms.attendance.branch_id} onChange={(e) => setForm("attendance", { branch_id: e.target.value })}>
          <option value="">Salle optionnelle</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </Field>
        <button style={buttonStyle}>Check-in</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Présences</h3>
        <DataTable
          columns={[
            { key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
            { key: "class_name", label: "Cours" },
            { key: "branch_name", label: "Salle" },
            { key: "checked_in_at", label: "Heure", render: (r) => String(r.checked_in_at || "").slice(0, 19).replace("T", " ") },
          ]}
          rows={data.attendance}
        />
      </div>
    </div>
  );

  const renderCash = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={createCash} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Transaction caisse</h3>
        <Field type="number" step="0.001" placeholder="Montant" value={forms.cash.amount} onChange={(e) => setForm("cash", { amount: e.target.value })} required />
        <Field as="select" value={forms.cash.direction} onChange={(e) => setForm("cash", { direction: e.target.value })}>
          <option value="in">Entrée</option>
          <option value="out">Sortie</option>
        </Field>
        <Field placeholder="Libellé" value={forms.cash.label} onChange={(e) => setForm("cash", { label: e.target.value })} required />
        <Field as="select" value={forms.cash.member_id} onChange={(e) => setForm("cash", { member_id: e.target.value })}>
          <option value="">Membre optionnel</option>
          {data.members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </Field>
        <Field as="select" value={forms.cash.branch_id} onChange={(e) => setForm("cash", { branch_id: e.target.value })}>
          <option value="">Salle optionnelle</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </Field>
        <button style={buttonStyle}>Enregistrer</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Caisse</h3>
        <DataTable
          columns={[
            { key: "label", label: "Libellé" },
            { key: "amount", label: "Montant", render: (r) => `${r.direction === "out" ? "-" : ""}${Number(r.amount || 0).toFixed(3)} DT` },
            { key: "payment_method", label: "Mode" },
            { key: "branch_name", label: "Salle" },
            { key: "full_name", label: "Membre" },
            { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
          ]}
          rows={data.cash}
        />
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Notifications</h3>
        {canScanNotifications ? (
          <button type="button" onClick={scanExpirations} style={buttonStyle}>Scanner expirations</button>
        ) : null}
      </div>
      <DataTable
        columns={[
          { key: "title", label: "Titre" },
          { key: "category", label: "Catégorie" },
          { key: "channel", label: "Canal" },
          { key: "message", label: "Message" },
          { key: "status", label: "Statut" },
          { key: "action", label: "Action", render: (r) => r.status === "unread" ? <button type="button" onClick={() => markNotificationRead(r.id)} style={buttonStyle}>Lu</button> : "Lu" },
        ]}
        rows={data.notifications}
      />
    </div>
  );

  const renderFiles = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={uploadGymDocument} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Upload MinIO</h3>
        <Field as="select" value={forms.file.file_category} onChange={(e) => setForm("file", { file_category: e.target.value })}>
          <option value="document">Document</option>
          <option value="image">Image</option>
          <option value="contract">Contrat</option>
          <option value="authorization">Autorisation de prélèvement</option>
          <option value="bank_return">Retour bancaire</option>
          <option value="member_photo">Photo membre</option>
          <option value="other">Autre</option>
        </Field>
        <Field as="select" value={forms.file.entity_type} onChange={(e) => setForm("file", { entity_type: e.target.value })}>
          <option value="general">Général</option>
          <option value="member">Membre</option>
          <option value="subscription">Abonnement</option>
          <option value="contract">Contrat</option>
          <option value="authorization">Autorisation</option>
          <option value="payment">Paiement</option>
          <option value="bank_return">Retour bancaire</option>
          <option value="branch">Salle</option>
          <option value="coach">Coach</option>
        </Field>
        <Field placeholder="ID entité liée (optionnel)" value={forms.file.entity_id} onChange={(e) => setForm("file", { entity_id: e.target.value })} />
        <Field as="select" value={forms.file.branch_id} onChange={(e) => setForm("file", { branch_id: e.target.value })}>
          <option value="">Salle optionnelle</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </Field>
        <input
          type="file"
          onChange={(e) => setSelectedGymFile(e.target.files?.[0] || null)}
          style={{ ...inputStyle, padding: 8 }}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.xml,.txt"
          required
        />
        <button style={buttonStyle}>Enregistrer dans MinIO</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Images, documents et fichiers Gym</h3>
        <DataTable
          columns={[
            { key: "original_filename", label: "Fichier" },
            { key: "file_category", label: "Catégorie" },
            { key: "entity_type", label: "Entité" },
            { key: "entity_id", label: "ID" },
            { key: "mime_type", label: "Type" },
            { key: "file_size", label: "Taille", render: (r) => `${Math.round(Number(r.file_size || 0) / 1024)} KB` },
            { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
            { key: "action", label: "Action", render: (r) => <button type="button" onClick={() => openGymFile(r.id)} style={buttonStyle}>Ouvrir</button> },
          ]}
          rows={data.files}
        />
      </div>
    </div>
  );

  const renderSettings = () => (
    <form onSubmit={saveSettings} style={{ ...cardStyle, maxWidth: 520 }}>
      <h3 style={{ marginTop: 0 }}>Paramètres Gym</h3>
      <Field placeholder="Devise" value={forms.settings.currency || ""} onChange={(e) => setForm("settings", { currency: e.target.value })} />
      <Field type="number" placeholder="Jour échéance par défaut" value={forms.settings.default_due_day || 5} onChange={(e) => setForm("settings", { default_due_day: e.target.value })} />
      <Field type="number" placeholder="Capacité max" value={forms.settings.occupancy_limit || 80} onChange={(e) => setForm("settings", { occupancy_limit: e.target.value })} />
      <Field type="number" placeholder="Alerte expiration jours" value={forms.settings.renewal_warning_days || 3} onChange={(e) => setForm("settings", { renewal_warning_days: e.target.value })} />
      <button style={buttonStyle}>Enregistrer paramètres</button>
    </form>
  );

  const renderAccess = () => (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14 }}>
      <form onSubmit={createAccessEvent} style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Journaliser un accès</h3>
        <Field as="select" value={forms.accessEvent.member_id} onChange={(e) => setForm("accessEvent", { member_id: e.target.value })} required>
          <option value="">Membre</option>
          {data.members.map((m) => <option key={m.id} value={m.id}>{m.member_code} - {m.full_name}</option>)}
        </Field>
        <Field as="select" value={forms.accessEvent.branch_id} onChange={(e) => setForm("accessEvent", { branch_id: e.target.value })}>
          <option value="">Salle</option>
          {data.branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </Field>
        <Field as="select" value={forms.accessEvent.event_type} onChange={(e) => setForm("accessEvent", { event_type: e.target.value })}>
          <option value="manual_check">Contrôle manuel</option>
          <option value="checkin">Check-in</option>
          <option value="door_scan">Scan porte</option>
        </Field>
        <Field as="select" value={forms.accessEvent.access_status} onChange={(e) => setForm("accessEvent", { access_status: e.target.value })}>
          <option value="granted">Autorisé</option>
          <option value="denied">Refusé</option>
          <option value="warning">A vérifier</option>
        </Field>
        <Field placeholder="Raison / observation" value={forms.accessEvent.reason} onChange={(e) => setForm("accessEvent", { reason: e.target.value })} />
        <button style={buttonStyle}>Enregistrer accès</button>
      </form>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Gestion des accès</h3>
        <DataTable
          columns={[
            { key: "full_name", label: "Membre", render: (r) => `${r.member_code || ""} - ${r.full_name || ""}` },
            { key: "branch_name", label: "Salle" },
            { key: "event_type", label: "Événement" },
            { key: "access_status", label: "Accès" },
            { key: "reason", label: "Raison" },
            { key: "created_at", label: "Date", render: (r) => String(r.created_at || "").slice(0, 19).replace("T", " ") },
          ]}
          rows={data.accessEvents}
        />
      </div>
    </div>
  );

  const renderStatistics = () => (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>Statistiques</h3>
      <DataTable
        columns={[
          { key: "metric", label: "Indicateur" },
          { key: "value", label: "Valeur" },
        ]}
        rows={Object.entries(data.statistics || {}).map(([metric, value]) => ({ id: metric, metric, value: String(value) }))}
      />
    </div>
  );

  const renderModule = () => {
    if (!visibleModules.some((mod) => mod.id === activeModule)) return renderDashboard();
    if (activeModule === "dashboard") return renderDashboard();
    if (activeModule === "branches") return renderBranches();
    if (activeModule === "members") return renderMembers();
    if (activeModule === "subscriptions") return renderSubscriptions();
    if (activeModule === "contracts") return renderContracts();
    if (activeModule === "hq") return renderHqValidations();
    if (activeModule === "authorizations") return renderAuthorizations();
    if (activeModule === "payments") return renderPayments();
    if (activeModule === "bankReturns") return renderBankReturns();
    if (activeModule === "classes") return renderClasses();
    if (activeModule === "coaches") return renderCoaches();
    if (activeModule === "attendance") return renderAttendance();
    if (activeModule === "cash") return renderCash();
    if (activeModule === "statistics") return renderStatistics();
    if (activeModule === "notifications") return renderNotifications();
    if (activeModule === "settings") return renderSettings();
    if (activeModule === "access") return renderAccess();
    return renderDashboard();
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1500 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 18, position: "relative" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, color: "#101828", fontWeight: 850 }}>Gym Management</h1>
          <p style={{ margin: "8px 0 0", color: "#667085" }}>
            Siège central, branches, abonnements, paiements, accès et opérations sportives.
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            title="Notifications"
            style={{
              width: 46,
              height: 46,
              borderRadius: 8,
              border: "1px solid #d8dee8",
              background: "#fff",
              color: "#0f172a",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <NotificationsNoneIcon fontSize="small" />
            {unreadCount > 0 ? (
              <span style={{ position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, background: "#dc2626", color: "#fff", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                {unreadCount}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div style={{ position: "absolute", right: 0, top: 54, width: 420, maxWidth: "calc(100vw - 64px)", background: "#fff", border: "1px solid #d8dee8", borderRadius: 8, boxShadow: "0 12px 32px rgba(15,23,42,0.16)", zIndex: 20, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #e5e7eb" }}>
                <div>
                  <strong>Notifications</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</div>
                </div>
                {canScanNotifications ? (
                  <button type="button" onClick={scanExpirations} style={{ ...buttonStyle, padding: "8px 10px" }}>Scanner</button>
                ) : null}
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {data.notifications.length === 0 ? <div style={{ color: "#718096", padding: 14 }}>Aucune notification.</div> : null}
                {data.notifications.map((item) => {
                  const tone = severityStyle[item.severity] || severityStyle.info;
                  return (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: "12px 14px", borderBottom: "1px solid #edf2f7", background: item.status === "unread" ? tone.background : "#fff" }}>
                      <div>
                        <strong style={{ color: "#0f172a" }}>{item.title}</strong>
                        <div style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>{item.message}</div>
                      </div>
                      {item.status === "unread" ? <button type="button" onClick={() => markNotificationRead(item.id)} style={{ ...buttonStyle, padding: "6px 9px", background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1" }}>Lu</button> : <span style={{ alignSelf: "center", color: "#94a3b8", fontSize: 12 }}>Lu</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div style={{ ...cardStyle, borderColor: error.includes("impossible") ? "#f5c6c2" : "#c7d2fe", background: error.includes("impossible") ? "#fdecea" : "#eef2ff", color: error.includes("impossible") ? "#c0392b" : "#3730a3", marginBottom: 14 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        <aside style={{ ...cardStyle, padding: 10, position: "sticky", top: 12 }}>
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            const active = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModule(mod.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 4,
                  background: active ? "#0f172a" : "#fff",
                  color: active ? "#fff" : "#334155",
                  fontWeight: active ? 800 : 650,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon fontSize="small" />
                {mod.label}
              </button>
            );
          })}
        </aside>

        <main>
          {loading ? <div style={cardStyle}>Chargement...</div> : renderModule()}
        </main>
      </div>
    </div>
  );
};

export default GymManagement;
