import axios from "axios";

function gymBaseUrl() {
  const rawBaseUrl = (import.meta.env.VITE_GYM_API_BASE_URL || "/api/v1/gym").replace(/\/$/, "");
  if (rawBaseUrl.endsWith("/api/v1/gym")) return rawBaseUrl;
  if (/^https?:\/\//i.test(rawBaseUrl)) return `${rawBaseUrl}/api/v1/gym`;
  return rawBaseUrl || "/api/v1/gym";
}

const gymApi = axios.create({
  baseURL: gymBaseUrl(),
  withCredentials: true,
});

gymApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const params = new URLSearchParams(window.location.search);
  const tenantFromStorage = localStorage.getItem("tenant_code") || localStorage.getItem("code_entreprise");
  const branchFromStorage = localStorage.getItem("gym_branch_id") || localStorage.getItem("branch_id");
  let tenant = null;
  let branchId = null;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      tenant =
        payload?.code_entreprise ||
        payload?.tenantCode ||
        payload?.tenant_id ||
        payload?.tenantId ||
        payload?.entreprise_id ||
        payload?.entrepriseId ||
        null;
      branchId =
        payload?.gym_branch_id ||
        payload?.branch_id ||
        payload?.branchId ||
        payload?.gymBranchId ||
        null;
    } catch (_e) {
      tenant = null;
    }
  }

  if (!tenant) {
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        tenant = parsed?.code_entreprise || parsed?.codeEntreprise || null;
        branchId =
          branchId ||
          parsed?.gym_branch_id ||
          parsed?.branch_id ||
          parsed?.branchId ||
          parsed?.gymBranchId ||
          null;
      }
    } catch (_e) {
      tenant = null;
    }
  }

  if (!tenant) {
    tenant = tenantFromStorage || null;
  }

  if (!tenant) {
    tenant = params.get("code_entreprise");
  }

  if (!tenant && window.location.pathname.startsWith("/gym")) {
    tenant = "ENT001";
  }

  if (tenant) config.headers["x-tenant-code"] = tenant;
  if (!branchId) branchId = params.get("branch_id") || branchFromStorage || null;
  if (branchId) config.headers["x-branch-id"] = branchId;

  return config;
});

gymApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default gymApi;
