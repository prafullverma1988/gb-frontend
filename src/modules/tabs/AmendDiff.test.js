// Amendment me "kya badla" (24 Nov 2026) — Tikendra jaisa: GF / FF ke hisse hat kar wapas
// poori line (₹ wahi), Head Room me qty / rate ulte (₹ wahi), SF extra room naya (+₹4,25,250).
// Aur BOQ ke neeche kul (Extra kaam alag, GST ho to saath).
import { act } from "react";
import { createRoot } from "react-dom/client";
import { loadFullPack, setLang } from "../../i18n";
import AmendDiffView, { AmendTotals, BoqTotalBar, boqTotals, diffFromApplied, diffFromProposal, workRows } from "./AmendDiff";

global.IS_REACT_ACT_ENVIRONMENT = true;
let root, box;
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); };
afterEach(() => { if (root) act(() => root.unmount()); if (box) box.remove(); root = null; box = null; });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });

const L = (kind, description, b, a) => ({ kind, description, before: b ? { qty: b[0], rate: b[1], amount: b[0] * b[1] } : { qty: 0, rate: 0, amount: 0 },
  after: a ? { qty: a[0], rate: a[1], amount: a[0] * a[1] } : { qty: 0, rate: 0, amount: 0 } });
const APPLIED = { at: "2026-11-23T09:24:29Z", total_before: 4956900, total_after: 5382150, project_boq: { before: 0, after: 5382150 }, lines: [
  L("added", "[GF] Ground Floor", null, [1465, 1500]),
  L("removed", "[GF] Ground Floor · Plinth (₹425)", [1465, 425], null),
  L("removed", "[GF] Ground Floor · Lintel (₹425)", [1465, 425], null),
  L("removed", "[GF] Ground Floor · Slab level (₹650)", [1465, 650], null),
  L("added", "[HEAD ROOM] Head Room (Tower Room)", null, [240, 1500]),
  L("removed", "[HEAD ROOM] Head Room (Tower Room) · Plinth (50%)", [1500, 120], null),
  L("removed", "[HEAD ROOM] Head Room (Tower Room) · Slab (50%)", [1500, 120], null),
  L("added", "SF extra room", null, [315, 1350]),
] };

test("workRows: hisse hat kar poori line = 'sirf stage', qty/rate ulte = ₹ wahi, naya kaam alag", () => {
  const rows = workRows(diffFromApplied(APPLIED).lines);
  const by = Object.fromEntries(rows.map((r) => [r.name, r]));
  expect(by["SF extra room"]).toMatchObject({ kind: "added", delta: 425250, after: { qty: 315, rate: 1350, amount: 425250 } });
  expect(by["Ground Floor"]).toMatchObject({ kind: "stages", stage: "removed", delta: 0, before: { qty: 1465, rate: 1500 }, after: { qty: 1465, rate: 1500 }, parts: 3 });
  expect(by["Head Room (Tower Room)"]).toMatchObject({ kind: "swap", before: { qty: 1500, rate: 240, amount: 360000 }, after: { qty: 240, rate: 1500, amount: 360000 } });
  expect(rows[0].name).toBe("SF extra room");           // ₹ wala badlaav sabse upar
});

test("Sirf ek hissa badla: us hisse ki apni row (pehle / ab rate)", () => {
  const rows = workRows([L("changed", "[FF] First Floor · Lintel (₹425)", [1470, 425], [1470, 450])]);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ name: "First Floor · Lintel", kind: "changed", delta: 36750, before: { rate: 425 }, after: { rate: 450 } });
});

test("diffFromProposal: id se milaan — qty badli, naya, hataya; purani id = chetavni; Extra line bahar", () => {
  const sections = [{ items: [
    { id: 1, description: "[GF] Ground Floor", qty: 1465, rate: 1500, amount: 2197500 },
    { id: 2, description: "[FF] First Floor", qty: 1470, rate: 1500, amount: 2205000 },
    { id: 3, description: "[SEPTIC TANK] Septic tank", qty: 80, rate: 1000, amount: 80000 },
    { id: 4, description: "[EXTRA KAAM] Gate", qty: 1, rate: 9000, amount: 9000, item_type: "extra" },
  ] }];
  const proposed = [{ items: [
    { id: 1, description: "[GF] Ground Floor", qty: 1500, rate: 1500 },
    { id: 2, description: "[FF] First Floor", qty: 1470, rate: 1500 },
    { id: null, description: "SF extra room", qty: 315, rate: 1350 },
    { id: 99, description: "[HEAD ROOM] Head Room", qty: 240, rate: 1500 },
  ] }];
  const d = diffFromProposal(sections, proposed);
  expect(d.before).toBe(4482500);
  expect(d.after).toBe(2250000 + 2205000 + 425250 + 360000);
  expect(d.stale).toBe(1);
  expect(d.lines.map((l) => l.kind + ":" + l.description).sort()).toEqual([
    "added:SF extra room", "added:[HEAD ROOM] Head Room", "changed:[GF] Ground Floor", "removed:[SEPTIC TANK] Septic tank"]);
});

test("AmendDiffView: pehle ₹49,56,900 → +₹4,25,250 → ₹53,82,150; naya kaam dikhe; 'sirf stage' band, dabane par khule", async () => {
  await mount(<AmendDiffView diff={diffFromApplied(APPLIED)} />);
  const sum = document.querySelector('[data-testid="ad-summary"]').textContent;
  expect(sum).toContain("Pehle (amendment se pehle)₹49,56,900");
  expect(sum).toContain("+₹4,25,250");
  expect(sum).toContain("Amendment ke baad₹53,82,150");
  const txt = document.body.textContent;
  expect(txt).toContain("Project ki BOQ value: ₹0 → ₹53,82,150");
  expect(txt).toContain("SF extra room");
  expect(txt).toContain("315 × ₹1,350");
  expect(txt).toContain("1,500 × ₹240");
  expect(txt).toContain("240 × ₹1,500");
  expect(document.querySelectorAll('[data-ad-row="stages"]').length).toBe(0);
  const btn = document.querySelector('[data-testid="ad-stages"]');
  expect(btn.textContent).toContain("1 kaam me sirf stage (hisse) badle");
  await act(async () => { btn.click(); });
  expect(document.querySelectorAll('[data-ad-row="stages"]').length).toBe(1);
  expect(document.querySelector('[data-ad-row="stages"]').textContent).toContain("Stage hat gaye");
  expect(txt).not.toMatch(/estimate\.[a-z_]+/);
});

test("Pending + purani id: chetavni; card ke upar pehle → ab", async () => {
  const d = { before: 100000, after: 150000, stale: 2, project_boq: null, lines: [L("added", "X", null, [1, 50000])] };
  await mount(<><AmendTotals diff={d} pending /><AmendDiffView diff={d} pending /></>);
  expect(document.querySelector('[data-testid="ad-totals"]').textContent).toBe("₹1,00,000→₹1,50,000+₹50,000approve hone par");
  expect(document.querySelector('[data-testid="ad-stale"]').textContent).toContain("2 line badal chuki hai");
  expect(document.querySelector('[data-testid="ad-summary"]').textContent).toContain("Approve hone par₹1,50,000");
});

test("BOQ ke neeche kul: Extra kaam alag, GST ho to saath", async () => {
  const secs = [{ items: [{ amount: 5382150 }, { amount: 20000, item_type: "extra" }] }];
  expect(boqTotals(secs, [], 18)).toEqual({ boq: 5382150, extra: 20000, tax: 972387, total: 5402150, withTax: 6374537 });
  await mount(<BoqTotalBar sections={secs} unsectioned={[]} taxPct={18} />);
  const txt = document.querySelector('[data-testid="boq-total"]').textContent;
  expect(txt).toContain("Kul BOQ / Estimate₹54,02,150");
  expect(txt).toContain("Extra kaam₹20,000");
  expect(txt).toContain("GST 18%₹9,72,387");
  expect(txt).toContain("Kul (GST ke saath)₹63,74,537");
});
