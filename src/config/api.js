// ── GB Buildcon API Configuration ──────────────────────────────
// Local dev → localhost:5000, else production
const API_BASE = (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
  ? "http://localhost:5000/api"
  : "https://gb-backend-production-7bd2.up.railway.app/api";

const getToken  = () => localStorage.getItem("gb_token");
const getUser   = () => { try { const u=localStorage.getItem("gb_user"); return u?JSON.parse(u):null; } catch{return null;} };
const getCompanies = () => { try { const c=localStorage.getItem("gb_companies"); return c?JSON.parse(c):[]; } catch{return [];} };
// Map company_domain → gb_company_module value used by CRM & Projects UI
const domainToModule = (domain) => {
  if (["surya_ghar", "solar_commercial"].includes(domain)) return "solar_epc";
  if (domain === "surya_ghar_plus") return "solar_epc";
  return "construction"; // construction_individual, housing_projects, default
};
const saveAuth  = (token,user,companies) => {
  localStorage.setItem("gb_token", token);
  localStorage.setItem("gb_user", JSON.stringify(user));
  if (companies) localStorage.setItem("gb_companies", JSON.stringify(companies));
  // Always refresh company module so stale localStorage values don't bleed through
  localStorage.setItem("gb_company_module", domainToModule(user?.company_domain));
};
const clearAuth = () => {
  localStorage.removeItem("gb_token");
  localStorage.removeItem("gb_user");
  localStorage.removeItem("gb_companies");
  localStorage.removeItem("gb_company_module");
};

const api = async (endpoint, options={}) => {
  const token = getToken();
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };
  const res  = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();
  if (res.status === 401) { clearAuth(); window.location.reload(); return data; }
  return data;
};

api.get   = (endpoint)        => api(endpoint);
api.post  = (endpoint, body)  => api(endpoint, { method:"POST",  body:JSON.stringify(body) });
api.put   = (endpoint, body)  => api(endpoint, { method:"PUT",   body:JSON.stringify(body) });
api.patch = (endpoint, body)  => api(endpoint, { method:"PATCH", body:JSON.stringify(body) });
api.del   = (endpoint, body)  => api(endpoint, body !== undefined ? { method:"DELETE", body:JSON.stringify(body) } : { method:"DELETE" });

// Legacy email+password login — kept for backwards compatibility
api.login = async (email, password) => {
  const res  = await fetch(`${API_BASE}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) });
  const data = await res.json();
  if (data.success) saveAuth(data.token, data.user, data.companies);
  return data;
};

// ═══════════════════════════════════════════════════════════════
// MOCK AUTH MODE — off (backend routes are live)
// Flip back to true only if gb-backend is rolled back to a build
// without /auth/login/password or /auth/otp/* endpoints.
// ═══════════════════════════════════════════════════════════════
const MOCK_AUTH = false;
const MOBILE_TO_EMAIL = {
  "9981641230": "admin@gbbuildcon.com",
  // add more mobile → email mappings here as needed
};
const MOCK_ADMIN_PASSWORD = "Admin@123"; // used only for OTP-verified login
let _mockOtp = null;
let _mockOtpMobile = null;

// ── Mobile + Password ────────────────────────────────────────
api.loginPassword = async (mobile, password) => {
  if (MOCK_AUTH) {
    const email = MOBILE_TO_EMAIL[mobile];
    if (!email) return { success: false, message: "Mobile number not registered" };
    return await api.login(email, password);
  }
  const res  = await fetch(`${API_BASE}/auth/login/password`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({mobile,password}) });
  const data = await res.json();
  if (data.success) saveAuth(data.token, data.user, data.companies);
  return data;
};

// ── Mobile + OTP: request OTP (client-side in mock mode) ─────
api.requestOtp = async (mobile) => {
  if (MOCK_AUTH) {
    if (!/^[6-9]\d{9}$/.test(mobile)) return { success: false, message: "Enter a valid 10-digit mobile number" };
    if (!MOBILE_TO_EMAIL[mobile])     return { success: false, message: "Mobile number not registered" };
    _mockOtpMobile = mobile;
    _mockOtp = String(Math.floor(1000 + Math.random() * 9000));
    console.log("🧪 [MOCK OTP] for", mobile, "is", _mockOtp);
    return { success: true, message: "OTP generated", dev_otp: _mockOtp, expires_in: 600 };
  }
  const res  = await fetch(`${API_BASE}/auth/otp/request`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({mobile}) });
  return await res.json();
};

// ── Mobile + OTP: verify OTP & login ─────────────────────────
api.loginOtp = async (mobile, otp) => {
  if (MOCK_AUTH) {
    if (mobile !== _mockOtpMobile || !_mockOtp) {
      return { success: false, message: "Please request a new OTP" };
    }
    if (String(otp) !== _mockOtp) {
      return { success: false, message: "Invalid OTP" };
    }
    _mockOtp = null;
    _mockOtpMobile = null;
    const email = MOBILE_TO_EMAIL[mobile];
    if (!email) return { success: false, message: "Mobile number not registered" };
    return await api.login(email, MOCK_ADMIN_PASSWORD);
  }
  const res  = await fetch(`${API_BASE}/auth/login/otp`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({mobile,otp}) });
  const data = await res.json();
  if (data.success) saveAuth(data.token, data.user, data.companies);
  return data;
};
api.switchCompany = async (companyId) => {
  const data = await api.post("/auth/switch-company", { company_id: companyId });
  if (data.success) saveAuth(data.token, data.user, data.companies);
  return data;
};
api.logout = () => { clearAuth(); window.location.reload(); };

// ── Project task templates ───────────────────────────────────
api.taskTemplates = {
  list:  ()                  => api.get("/project-task-templates"),
  apply: (projectId, body)   => api.post(`/project-task-templates/apply/${projectId}`, body),
};

// ── Baseline helpers ─────────────────────────────────────────
api.baseline = {
  status:    (projectId)               => api.get(`/projects/${projectId}/baseline/status`),
  history:   (projectId)               => api.get(`/projects/${projectId}/baseline/history`),
  version:   (projectId, v)            => api.get(`/projects/${projectId}/baseline/version/${v}`),
  set:       (projectId, body)         => api.post(`/projects/${projectId}/baseline/set`, body),
  rebaseline:(projectId, body)         => api.post(`/projects/${projectId}/baseline/rebaseline`, body),
  clear:     (projectId, body)         => api.post(`/projects/${projectId}/baseline/clear`, body),
};

export default api;
export { getToken, getUser, getCompanies, saveAuth, clearAuth, API_BASE };
