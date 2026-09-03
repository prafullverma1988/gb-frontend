import { recordFailedCall } from "../utils/diag";
import { t, getLang } from "../i18n";

// ── GB Buildcon API Configuration ──────────────────────────────
// Local dev → localhost:5000, else production.
//
// Production uses our own domain (api.sanchalanapp.com → Railway) instead of
// the raw *.up.railway.app host: some ISP resolvers (observed on Reliance
// broadband) REFUSE the up.railway.app zone outright, so every API call died
// with ERR_NAME_NOT_RESOLVED for users on those networks while the backend
// itself was perfectly healthy. sanchalanapp.com resolves fine there.
const API_BASE = (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
  ? "http://localhost:5000/api"
  : "https://api.sanchalanapp.com/api";

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

// ── Hardening (P1) ────────────────────────────────────────────
// Request timeout: AbortController so flaky cell signals don't leave
// hung promises forever. 15s is generous for our heaviest endpoints
// (Finance txn list ~5k rows, GRN list, etc.).
const DEFAULT_TIMEOUT_MS = 15000;

// 401 reload de-dup: prefetchAllModules() fires ~12 parallel requests on
// boot — if the token expired, EACH would call window.location.reload()
// causing a stuck reload loop. Gate behind a one-shot flag.
let _isReloading = false;

const api = async (endpoint, options={}) => {
  const token = getToken();
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  // `...options` PEHLE, `headers` baad me. Ulta hone par caller ke apne
  // headers dete hi poora merge dhak jaata tha — Authorization aur X-Lang
  // dono gir jaate, yaani request bina login ke chali jaati. Abhi tak koi
  // caller headers deta hi nahi tha isliye ye kabhi dikha nahi; api.postRaw
  // (statement PDF) pehla aisa caller hai.
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // Backend apne messages isi header se chunta hai. Iske bina user ne
      // Hindi/English chuni ho to bhi API se jawab default (Hinglish) me hi
      // aata — aadhi screen ek bhasha me, aadhi doosri me. Mobile app ye
      // pehle se bhejta tha; web me chhoot gaya tha.
      "X-Lang": getLang(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    signal: ctrl.signal,
  };
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, config);
    // Diagnostics: status only, never bodies (see utils/diag.js).
    if (!res.ok) recordFailedCall(config.method, endpoint, res.status);
  } catch (err) {
    clearTimeout(timer);
    recordFailedCall(config.method, endpoint, 0);
    const isAbort = err?.name === "AbortError";
    return {
      success: false,
      message: isAbort
        ? "Request timed out — check your connection."
        : "Network error — check your connection.",
      _networkError: true,
      _aborted: isAbort,
    };
  }
  clearTimeout(timer);

  // 401 → token invalid. Clear and reload once (subsequent calls in the
  // same wave just return without firing reload again).
  if (res.status === 401) {
    if (!_isReloading) {
      _isReloading = true;
      clearAuth();
      // Allow in-flight responses to finish writing before reload.
      setTimeout(() => window.location.reload(), 50);
    }
    return { success: false, message: t("api.session_expired"), _unauthorized: true };
  }

  // Safe JSON parse — backend occasionally returns plain text on edge
  // cases (502 from Railway, HTML error pages, etc.). Without this guard
  // a non-JSON body throws and crashes the caller.
  let data;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    return {
      success: false,
      message: t("api.bad_server_response_status", { status: res.status }),
      _parseError: true,
      _status: res.status,
    };
  }

  // If server returned a non-2xx but no explicit success flag, normalize.
  if (!res.ok && data && data.success !== false) {
    return { ...data, success: false, _status: res.status };
  }
  return data;
};

api.get   = (endpoint, opts)        => api(endpoint, opts);
api.post  = (endpoint, body, opts)  => api(endpoint, { method:"POST",  body:JSON.stringify(body), ...(opts||{}) });
api.put   = (endpoint, body, opts)  => api(endpoint, { method:"PUT",   body:JSON.stringify(body), ...(opts||{}) });
api.patch = (endpoint, body, opts)  => api(endpoint, { method:"PATCH", body:JSON.stringify(body), ...(opts||{}) });
api.del   = (endpoint, body, opts)  => api(endpoint, body !== undefined ? { method:"DELETE", body:JSON.stringify(body), ...(opts||{}) } : { method:"DELETE", ...(opts||{}) });
// Raw bytes POST — file ka body jaisa ka waisa bhejna ho (bank statement PDF).
// Yahan JSON.stringify nahi lag sakta, aur Content-Type caller tay karta hai
// kyunki server usi se pehchanta hai ki body kis roop me aayi. Timeout bhi
// khula — 5 page ka PDF parse hone me default se zyada lag sakta hai.
api.postRaw = (endpoint, buffer, headers, opts) => api(endpoint, {
  method: "POST", body: buffer, timeoutMs: 120000,
  headers: { "Content-Type": "application/octet-stream", ...(headers || {}) },
  ...(opts || {}),
});

// ── Mobile + Password ────────────────────────────────────────
api.loginPassword = async (mobile, password) => {
  const res  = await fetch(`${API_BASE}/auth/login/password`, { method:"POST", headers:{"Content-Type":"application/json","X-Lang":getLang()}, body:JSON.stringify({mobile,password}) });
  const data = await res.json();
  if (data.success && data.token) saveAuth(data.token, data.user, data.companies);
  return data;
};

// ── Mobile + OTP: request OTP ────────────────────────────────
api.requestOtp = async (mobile) => {
  const res  = await fetch(`${API_BASE}/auth/otp/request`, { method:"POST", headers:{"Content-Type":"application/json","X-Lang":getLang()}, body:JSON.stringify({mobile}) });
  return await res.json();
};

// ── Mobile + OTP: verify OTP & login ─────────────────────────
api.loginOtp = async (mobile, otp, accessToken) => {
  const res  = await fetch(`${API_BASE}/auth/login/otp`, { method:"POST", headers:{"Content-Type":"application/json","X-Lang":getLang()}, body:JSON.stringify({mobile,otp,accessToken}) });
  const data = await res.json();
  if (data.success && data.token) saveAuth(data.token, data.user, data.companies);
  return data;
};
// Multi-company login: after login returns multi_company, the user picks a
// company → exchange the pending token for a real auth token.
api.loginSelect = async (pending, user_id, company_id) => {
  const res  = await fetch(`${API_BASE}/auth/login/select`, { method:"POST", headers:{"Content-Type":"application/json","X-Lang":getLang()}, body:JSON.stringify({ pending, user_id, company_id }) });
  const data = await res.json();
  if (data.success && data.token) saveAuth(data.token, data.user, data.companies);
  return data;
};
api.switchCompany = async (companyId) => {
  const data = await api.post("/auth/switch-company", { company_id: companyId });
  if (data.success && data.token) saveAuth(data.token, data.user, data.companies);
  return data;
};
api.logout = () => { clearAuth(); window.location.reload(); };

// ── Site presence — photo-driven auto-learn (Phase 5+) ─────
// Call after a live-camera photo is uploaded for a project. 3+
// presence events from the same coords trigger an auto-suggested
// geofence that admin can confirm from the Sites tab.
api.presence = {
  record: ({ project_id, lat, lng, accuracy, source, photo_url }) =>
    api.post("/geofences/presence", {
      project_id, lat, lng,
      accuracy: accuracy || null,
      source:   source   || "photo",
      photo_url: photo_url || null,
      captured_at: new Date().toISOString(),
    }),
};

// Convenience: capture browser GPS then ping presence. Silently
// no-ops if permission denied — auto-learn is best-effort.
api.recordPhotoPresence = async ({ project_id, photo_url, source }) => {
  if (!project_id) return null;
  try {
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    const coords = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p.coords), reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      )
    );
    return await api.presence.record({
      project_id,
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy ? Math.round(coords.accuracy) : null,
      source: source || "photo",
      photo_url,
    });
  } catch (_) { return null; }
};

// ── Project task templates ───────────────────────────────────
api.taskTemplates = {
  list:  ()                  => api.get("/project-task-templates"),
  // read-only: template ke kaam (WBS, duration, predecessors, role) — picker me "Kaam dekho"
  items: (slug)              => api.get(`/project-task-templates/${encodeURIComponent(slug)}/items`),
  // body: { template_id, start_date?, selected_groups?, dry_run?, include_boq? }
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
