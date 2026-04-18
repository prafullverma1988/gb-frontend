// ── GB Buildcon API Configuration ──────────────────────────────
// Local dev → localhost:5000, else production
const API_BASE = (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
  ? "http://localhost:5000/api"
  : "https://gb-backend-production-7bd2.up.railway.app/api";

const getToken  = () => localStorage.getItem("gb_token");
const getUser   = () => { try { const u=localStorage.getItem("gb_user"); return u?JSON.parse(u):null; } catch{return null;} };
const getCompanies = () => { try { const c=localStorage.getItem("gb_companies"); return c?JSON.parse(c):[]; } catch{return [];} };
const saveAuth  = (token,user,companies) => { localStorage.setItem("gb_token",token); localStorage.setItem("gb_user",JSON.stringify(user)); if(companies) localStorage.setItem("gb_companies",JSON.stringify(companies)); };
const clearAuth = () => { localStorage.removeItem("gb_token"); localStorage.removeItem("gb_user"); localStorage.removeItem("gb_companies"); };

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
api.del   = (endpoint)        => api(endpoint, { method:"DELETE" });

// Legacy email+password login — kept for backwards compatibility
api.login = async (email, password) => {
  const res  = await fetch(`${API_BASE}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) });
  const data = await res.json();
  if (data.success) saveAuth(data.token, data.user, data.companies);
  return data;
};

// ── Mobile + Password ────────────────────────────────────────
api.loginPassword = async (mobile, password) => {
  const res  = await fetch(`${API_BASE}/auth/login/password`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({mobile,password}) });
  const data = await res.json();
  if (data.success) saveAuth(data.token, data.user, data.companies);
  return data;
};

// ── Mobile + OTP: request OTP ────────────────────────────────
api.requestOtp = async (mobile) => {
  const res  = await fetch(`${API_BASE}/auth/otp/request`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({mobile}) });
  return await res.json();
};

// ── Mobile + OTP: verify OTP & login ─────────────────────────
api.loginOtp = async (mobile, otp) => {
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

export default api;
export { getToken, getUser, getCompanies, saveAuth, clearAuth, API_BASE };
