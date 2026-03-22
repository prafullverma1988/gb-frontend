// ── GB Buildcon API Configuration ──────────────────────────────
const API_BASE = "https://gb-backend-production-7bd2.up.railway.app/api";

const getToken  = () => localStorage.getItem("gb_token");
const getUser   = () => { try { const u=localStorage.getItem("gb_user"); return u?JSON.parse(u):null; } catch{return null;} };
const saveAuth  = (token,user) => { localStorage.setItem("gb_token",token); localStorage.setItem("gb_user",JSON.stringify(user)); };
const clearAuth = () => { localStorage.removeItem("gb_token"); localStorage.removeItem("gb_user"); };

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

api.login = async (email, password) => {
  const res  = await fetch(`${API_BASE}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) });
  const data = await res.json();
  if (data.success) saveAuth(data.token, data.user);
  return data;
};
api.logout = () => { clearAuth(); window.location.reload(); };

export default api;
export { getToken, getUser, saveAuth, clearAuth, API_BASE };
