// ════════════════════════════════════════════════════════════════
// BOQ me sirf kaam (24 Nov 2026, Prafull: "boq me payment stages ke details ki
// jarurat nahi, only item and qty — payment schedule sidha payment schedule
// tab me"). Estimate me stage (hisse) alag line hain (Ground Floor · Plinth,
// · Lintel …, part_of = "Ground Floor") — Chalu Bill / Payment schedule unhi par
// chalte hain. BOQ tab, PDF, Excel aur Edit BOQ me ek kaam ki ek row: qty wahi,
// rate = stage ki rate ka jod, amount = jod.
// Edit BOQ me badla qty / rate wapas har stage par (rate usi anupaat me).
// ════════════════════════════════════════════════════════════════
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const r3 = (n) => Math.round(num(n) * 1000) / 1000;
const catOf = (desc) => { const m = /^\[([^\]]+)\]/.exec(String(desc || "")); return m ? m[1] : ""; };

// items (ek section ki line, BOQ ke kram me) → kaam ki row. Stage wali line: same
// category + part_of + unit + qty = ek row { ...pehli line, _work, _parts, rate, amount }.
export function groupWorks(items) {
  const out = [], at = {};
  for (const it of items || []) {
    if (!it || !it.part_of) { out.push(it); continue; }
    const k = catOf(it.description) + "¦" + it.part_of + "¦" + String(it.unit || "").toLowerCase() + "¦" + r3(it.qty);
    if (at[k] === undefined) {
      at[k] = out.length;
      out.push({ ...it, _work: true, _parts: [], rate: 0, amount: 0, _cleanDesc: it.part_of, _clean: it.part_of });
    }
    const w = out[at[k]];
    w._parts.push(it);
    w.rate = r2(num(w.rate) + num(it.rate));
    w.amount = r2(num(w.amount) + num(it.amount != null ? it.amount : num(it.qty) * num(it.rate)));
  }
  // Akeli bachi stage (baaki hat gayi) — jaisi thi waisi line
  return out.map((w) => (w && w._work && w._parts.length === 1 ? { ...w._parts[0] } : w));
}

// Edit BOQ ki ek row (kaam) → wapas har stage ki line. qty sab par wahi; rate badla to
// har stage usi anupaat me (aakhri = baaki, taaki jod wahi rahe).
export function expandWork(row) {
  if (!row || !Array.isArray(row._parts) || !row._parts.length) return [row];
  const R = r2(row.rate), S = r2(row._parts.reduce((a, p) => a + num(p.rate), 0));
  let used = 0;
  return row._parts.map((p, i) => {
    const last = i === row._parts.length - 1;
    const rate = R === S ? num(p.rate) : last ? r2(R - used) : r2(S > 0 ? num(p.rate) * R / S : R / row._parts.length);
    used = r2(used + rate);
    // ₹ se bane stage ka naam "(₹276)" — rate badla to naya ₹ (% wale naam ka % wahi rehta hai)
    const description = rate !== num(p.rate) ? String(p.description || "").replace(/\(₹[\d.]+\)\s*$/, "(₹" + rate + ")") : p.description;
    return { ...p, description, qty: row.qty, unit: p.unit, rate };
  });
}
