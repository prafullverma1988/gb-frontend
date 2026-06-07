// ── DESIGN TOKENS ─────────────────────────────────────────────────────
export const T = {
  // Surfaces
  bg:       "#F4F6F9",
  surface:  "#FFFFFF",
  surfaceB: "#F8F9FB",
  // Text
  t1:  "#111827",
  t2:  "#374151",
  t3:  "#6B7280",
  t4:  "#9CA3AF",
  // Borders
  b1:  "#E5E7EB",
  b2:  "#D1D5DB",
  // Primary blue
  blu:  "#2563EB",
  bluL: "#EFF6FF",
  bluM: "#BFDBFE",
  // Green
  grn:  "#059669",
  grnL: "#ECFDF5",
  grnM: "#A7F3D0",
  // Amber
  amb:  "#D97706",
  ambL: "#FFFBEB",
  ambM: "#FDE68A",
  // Red
  red:  "#DC2626",
  redL: "#FEF2F2",
  redM: "#FECACA",
  // Slate (neutral)
  slt:  "#64748B",
  sltL: "#F1F5F9",
  // Purple
  pur:  "#7C3AED",
  purL: "#F5F3FF",
};

// STATUS_S and STAGE_S depend on T — defined after T
export const STATUS_S = {
  "Ongoing":     {c:T.grn, bg:T.grnL},
  "Completed":   {c:T.blu, bg:T.bluL},
  "Hold":        {c:T.amb, bg:T.ambL},
  "Not Started": {c:T.slt, bg:T.sltL},
};

export const STAGES = ["Requested","Approved","Ordered","Received","Used"];
export const STAGE_S = {"Requested":{c:T.slt,bg:T.sltL},"Approved":{c:T.pur,bg:T.purL},"Ordered":{c:T.amb,bg:T.ambL},"Received":{c:T.blu,bg:T.bluL},"Used":{c:T.grn,bg:T.grnL}};

export const fmt  = (n) => n>=10000000?`${(n/10000000).toFixed(1)}Cr`:n>=100000?`${(n/100000).toFixed(1)}L`:`${(n/1000).toFixed(0)}K`;
export const fmtN = (n) => Math.abs(n).toLocaleString("en-IN");

// TZ-safe local date helper
// `new Date().toISOString().split("T")[0]` shifts by 1 day in early IST hours
// (UTC midnight crosses local date boundary). Use local components instead.
export const localYMD = (d=new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
};

export const PROJ = {
  id:0, name:"", client:"",
  city:"", type:"", progress:0, status:"",
  boq:0, expense:0, pm:"", sup:"",
  start:"", end:"", address:"",
  area:"", floors:"",
};
