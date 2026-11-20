// Transaction drawer — purane import ka bill (na note na line items) (20 Nov 2026, Prafull: "kisi bhi vendor
// ka bill show nahi kar raha"): item ka naam description me hota hai, drawer me "Note / Description" me dikhna chahiye.
// Asli row jaisa (party ledger ka mapping: description `sub` naam se aata hai).
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import TransactionDetailDrawer from "./TransactionDetailDrawer";

jest.mock("../config/api", () => {
  const ok = () => Promise.resolve({ success: true, data: {} });
  // CRA me resetMocks:true — jest.fn ka implementation har test se pehle ud jaata hai, isliye plain function
  const api = () => ok();
  api.get = ok; api.post = ok; api.put = ok; api.patch = ok; api.del = ok;
  return { __esModule: true, default: api };
});
jest.mock("./ActivityLog", () => ({ __esModule: true, default: () => null }));
jest.mock("./PickSelect", () => ({ __esModule: true, default: () => null }));
jest.mock("../utils/backNav", () => ({ BackClose: () => null }));
jest.mock("../utils/perms", () => ({ can: () => true, canAny: () => true, canEntry: () => true }));

global.IS_REACT_ACT_ENVIRONMENT = true;

// Party ledger ki row (FinanceModule.loadPartyLedger ka mapping): note "" , sub = description, items null
const IMPORTED = {
  id: 76910, dateRaw: "2026-06-04", date: "04 Jun 26", note: "", sub: "Jali Door", project: "", amount: 24500, status: "paid",
  txnType: "material_purchase", type: "Material Purchase", party: "Mahadev Febrication", party_display: "Mahadev Febrication", items: null,
};

let root, box;
const mount = async (txn) => {
  box = document.createElement("div");
  document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<TransactionDetailDrawer txn={txn} onClose={() => {}} onChanged={() => {}} />); });
  await act(async () => {});
};
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  if (box) box.remove();
  root = box = null;
});
const text = () => document.body.textContent;

describe("TransactionDetailDrawer — bill ka byora", () => {
  test("purane import ka bill: description ('Jali Door') Note / Description me dikhta hai", async () => {
    await mount(IMPORTED);
    expect(text()).toContain("Jali Door");
    expect(text()).toContain("Mahadev Febrication");
  });

  test("Note likha ho to wahi (description nahi)", async () => {
    await mount({ ...IMPORTED, note: "Darwaza fitting", sub: "Jali Door" });
    expect(text()).toContain("Darwaza fitting");
    expect(text()).not.toContain("Jali Door");
  });

  test("line items hon to byora wahi — description alag se nahi dohrata", async () => {
    await mount({ ...IMPORTED, sub: "Cement", items: [{ item_name: "Cement", qty: 30, unit: "Bag", rate: 295, amount: 8850 }] });
    expect(text()).toContain("Cement");
    expect(document.body.innerHTML.match(/Cement/g).length).toBe(1);   // sirf items table me, Note block me nahi
  });

  test("auto-text description ('Type — Party') kabhi Note ki jagah nahi aata", async () => {
    await mount({ ...IMPORTED, sub: "Material Purchase — Mahadev Febrication" });
    expect(text()).not.toContain("Material Purchase — Mahadev Febrication");
  });

  test("bill nahi (payment) — description pehle jaisa chhupi rehti hai", async () => {
    await mount({ ...IMPORTED, txnType: "payment", type: "Payment Made", sub: "Cash diya" });
    expect(text()).not.toContain("Cash diya");
  });
});
