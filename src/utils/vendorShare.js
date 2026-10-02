// ════════════════════════════════════════════════════════════════
// Maang (MR) ki photo vendor tak — naam, spec aur photo ke link ke saath.
// ----------------------------------------------------------------
// Prafull (2 Oct 2026): "asset ke order karate time request me khicha hua
// photo vendor ko forward karane ka option — jaise bhi manual order me
// whatsapp ke sath chala jaye, and PO mail pe bhi".
//
// Photo Cloudinary par public link hai, isliye message me LINK jaata hai —
// WhatsApp / Email (mailto) me file attach ho hi nahi sakti, aur PO ka Email
// koi server-mailer nahi, browser ka mailto: hai. Vendor link tap karke
// poori photo dekhta hai.
//
// Photo sirf asset ki maang tak simit nahi — material ki MR par bhi wahi
// photo_urls (Photo Settings → "Material request (MR)") hai, to jis MR par
// photo hai uski jaati hai.
//
// Ye file sanchalan-app/src/utils/vendorShare.js ki jodidaar hai (wahan iska
// jest test hai) — message ki shakl dono jagah ek.
// ════════════════════════════════════════════════════════════════
import { cld } from "./cloudinary";

// photo_urls DB me JSON string hai, kahin array — dono chalte hain. Sirf
// http(s) link: blob:/file: vendor ke kisi kaam ka nahi.
export function photoList(v) {
  let l = v;
  if (typeof l === "string") {
    try { l = JSON.parse(l); } catch (_) { l = [l]; }
  }
  return Array.isArray(l) ? l.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u)) : [];
}

// Vendor ke liye photo link — 1600px wala halka version (asli 3-12 MB hoti hai).
export const photoLinks = (m) => photoList(m && (m.photo_urls != null ? m.photo_urls : m.photos)).map((u) => cld(u, "view"));

// Vendor ko dikhne wala naam. Asset ki maang ka MR naam "asset + spec" jod kar
// banta hai; wahi ho to sirf asset ka naam (spec apni line me jaata hai).
// Procurement ne MR ka naam badla ho to wahi naam — order usi ka ho raha hai.
export function itemName(m) {
  const item = String((m && (m.item_name || m.item || m.material)) || "").trim();
  const an = String((m && m.asset_name) || "").trim();
  if (!an) return item;
  const joined = [an, String(m.asset_spec || "").trim()].filter(Boolean).join(" ");
  return !item || item.toLowerCase() === joined.toLowerCase() ? an : item;
}

// Spec — sirf tab jab dikhne wale naam me pehle se na ho.
export function specOf(name, m) {
  const spec = String((m && m.asset_spec) || "").trim();
  if (!spec) return "";
  return String(name || "").toLowerCase().includes(spec.toLowerCase()) ? "" : spec;
}

// Order / PO ki line ke neeche: "Spec: …" aur har photo ka link.
export function vendorLines(name, m, indent = "") {
  if (!m) return [];
  const spec = specOf(name, m);
  return [
    ...(spec ? [indent + "Spec: " + spec] : []),
    ...photoLinks(m).map((u) => indent + "Photo: " + u),
  ];
}

// Qty DB se "5.000" jaisi aati hai — vendor ko "5".
const qtyText = (m) => {
  const q = Number(m && (m.quantity != null ? m.quantity : m.qty));
  return q > 0 ? [String(q), String((m && m.unit) || "").trim()].filter(Boolean).join(" ") : "";
};

// "Vendor ko photo bhejo" ka poora message — order nahi, sirf "ye cheez chahiye".
export function requirementText(m, company) {
  const name = itemName(m);
  const spec = specOf(name, m);
  const qty = qtyText(m);
  return [
    "*Requirement" + (company ? " — " + company : "") + "*",
    "Item: " + name,
    spec ? "Spec: " + spec : null,
    qty ? "Qty: " + qty : null,
    ...photoLinks(m).map((u) => "Photo: " + u),
  ].filter(Boolean).join("\n");
}

// Backend ke normPhone10 ka jodidaar — 10 ank, warna "".
export const phone10 = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? d : "";
};

// WhatsApp sirf mobile par hota hai (6-9 se shuru). Party master me dukaan ka
// landline bhi hota hai (022-xxxxxxxx ka 0 hat kar wo bhi 10 ank) aur us par
// wa.me "invalid number" deta — tab number chhod do, WhatsApp me chat khud
// chuno. Pakki pehchan nahi: 0771 / 0788 jaise STD code 7 se shuru hote hain.
export const waPhone = (v) => { const p = phone10(v); return /^[6-9]/.test(p) ? p : ""; };

// Number sahi ho to seedha us vendor ki chat, warna WhatsApp khud chat chunwata hai.
export function waUrl(text, phone) {
  const p = waPhone(phone);
  return "https://wa.me/" + (p ? "91" + p : "") + "?text=" + encodeURIComponent(text);
}

// Party list (Finance → parties) se vendor ka number — naam se, case ke bina.
export function vendorPhone(vendors, name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n || !Array.isArray(vendors)) return "";
  const v = vendors.find((x) => x && typeof x === "object" && String(x.name || "").trim().toLowerCase() === n);
  return v ? waPhone(v.phone) : "";
}
