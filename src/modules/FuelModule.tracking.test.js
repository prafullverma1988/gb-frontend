// Fuel → Cross-check: Machine wise + Flags (24 Nov 2026, Ratna Khanij: "particular machine wise fuel tracking
// aur sab ka flags report — jisme jyada antar ya chori ka shak").
// Server (/fuel/machine-tracking) nakli; asli CrossCheckTab render hota hai.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CrossCheckTab } from "./FuelModule";
import api from "../config/api";
import { t, loadFullPack } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 1, role: "admin", name: "Admin" }) };
});
// jest.mock ki factory sirf `mock...` naam ke bahari variable dekh sakti hai
const mockCan = { mach: true };
jest.mock("../utils/perms", () => ({
  can: () => mockCan.mach, canAny: () => true, canEntry: () => true, currentUser: () => ({ id: 1, role: "admin" }),
}));
jest.mock("../components/PickSelect", () => ({
  __esModule: true,
  default: ({ children, value, onChange }) => { const R = require("react"); return R.createElement("select", { value, onChange }, children); },
}));

window.IS_REACT_ACT_ENVIRONMENT = true;

const ROW = (o) => ({ kind: "fill", id: 1, event_id: 1, time: "2026-11-20T04:00:00.000Z", location: "Site A", level_before: 9.8, level_after: 40.2,
  sensor_l: 30.4, entry_l: 30, entry_kind: "issue", diff_l: 0.4, diff_pct: 1.3, status: "ok", flags: [], severity: null, reviewed: false, ...o });
const FLAG = (o) => ({ key: "fill:1", kind: "fill", id: 1, event_id: 1, time: "2026-11-19T04:00:00.000Z", equipment_id: 10, machine: "JCB 4DX", location: "Site A",
  type: "entry_more", severity: "red", sensor_l: 22, entry_l: 40, diff_l: -18, diff_pct: 81.8, level_before: 8, level_after: 30, litres: null, size_l: 18, ...o });
const TR = () => ({
  enabled: true, range: { from: "2026-10-21", to: "2026-11-20" }, tol: { pct: 15, red_pct: 25, red_l: 10 }, fls_machines: 2, untrusted_machines: [],
  machines: [
    { equipment_id: 10, name: "JCB 4DX", registration_no: "CG04 4532", fills_n: 3, entry_l: 70, sensor_l: 52.4, diff_l: -17.6, diff_pct: 33.6,
      unmatched_n: 1, unmatched_l: 45, sensor_missing_n: 1, sensor_missing_l: 50, drops_n: 0, drops_l: 0, flag_n: 3, red_n: 2, suspect_l: 113,
      last_fill_at: "2026-11-20T04:00:00.000Z",
      rows: [ROW({ id: 101, event_id: 101, level_before: 9.8, level_after: 40.2 }),
        ROW({ id: 102, event_id: 102, sensor_l: 22, entry_l: 40, diff_l: -18, diff_pct: 81.8, status: "entry_more", flags: ["entry_more"], severity: "red", level_before: 8, level_after: 30 })] },
    { equipment_id: 11, name: "Roller", registration_no: null, fills_n: 1, entry_l: 30, sensor_l: 30, diff_l: 0, diff_pct: 0,
      unmatched_n: 0, unmatched_l: 0, sensor_missing_n: 0, sensor_missing_l: 0, drops_n: 0, drops_l: 0, flag_n: 0, red_n: 0, suspect_l: 0,
      last_fill_at: "2026-11-18T04:00:00.000Z", rows: [ROW({ id: 201, event_id: 201, sensor_l: 30, entry_l: 30, diff_l: 0, diff_pct: 0 })] },
  ],
  flags: [
    FLAG({ key: "fill:102", id: 102, event_id: 102, type: "entry_more", severity: "red", size_l: 18 }),
    FLAG({ key: "fill:103", id: 103, event_id: 103, type: "no_entry", severity: "red", sensor_l: 45, entry_l: null, diff_l: null, diff_pct: null, size_l: 45, location: null }),
    FLAG({ key: "entry:issue:9", kind: "entry", id: "issue:9", event_id: null, type: "sensor_missing", severity: "amber", sensor_l: null, entry_l: 50, diff_l: null, diff_pct: null, size_l: 50 }),
  ],
  totals: { machines: 2, fills: 4, flags: 3, red: 2, suspect_l: 113 },
  unlinked: [{ unit_id: 1356, unit_name: "RKU_JCB_4DX 4532 No1", fills: 5, litres: 161.7, last_at: "2026-11-05T04:00:00.000Z",
    suggest: { equipment_id: 450, name: "RKU JCB 4DX- 4532", why: "gadi no. ke aakhri 4 ank mile", confidence: 85 } },
    { unit_id: 293, unit_name: "RKU_GRADER 8111", fills: 2, litres: 112.5, last_at: "2026-11-22T04:00:00.000Z", suggest: null }],
});

let host, root;
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const click = async (el) => { if (!el) throw new Error("click: element nahi mila"); await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const btn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const text = () => host.textContent;
const PROPS = { stores: [], byEquipment: [], purchases: [], issues: [], sensor: { enabled: false }, onReload: () => {} };

async function mount(data) {
  api.get.mockImplementation(async (url) => {
    if (String(url).startsWith("/fuel/machine-tracking")) return typeof data === "function" ? data() : { success: true, data };
    return { success: true, data: {} };
  });
  api.post.mockImplementation(async () => ({ success: true, data: {} }));
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await act(async () => { root.render(<CrossCheckTab {...PROPS} />); });
  await flush();
}
beforeAll(() => loadFullPack());
beforeEach(() => { mockCan.mach = true; window.confirm = () => true; window.alert = () => {}; });
afterEach(async () => { if (root) await act(async () => { root.unmount(); }); if (host) host.remove(); root = host = null; });

describe("Cross-check — sub-tab aur ginti", () => {
  test("teen sub-tab: Jaanch (purana), Machine wise (2), Flags (3); data /fuel/machine-tracking se", async () => {
    await mount(TR());
    expect(btn(new RegExp("^" + t("fuel.mt_sub_check") + "$"))).toBeTruthy();
    expect(text()).toContain(t("fuel.mt_sub_machine") + " (2)");
    expect(text()).toContain(t("fuel.mt_sub_flags") + " (3)");
    const url = api.get.mock.calls.map((c) => c[0]).find((u) => String(u).startsWith("/fuel/machine-tracking"));
    expect(url).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
  });
  test("pehla tab purana Cross-check hi hai (jaanch ki list)", async () => {
    await mount(TR());
    expect(text()).toContain(t("fuel.kaunsi_jaanch_abhi_chalu_hai"));
  });
});

describe("Machine wise", () => {
  const open = async () => { await mount(TR()); await click(btn(new RegExp("^" + t("fuel.mt_sub_machine")))); };

  test("har machine ki ek row: fill, entry, sensor, difference, flag; sabse sandigdh pehle", async () => {
    await open();
    const t1 = text();
    expect(t1).toContain("JCB 4DX"); expect(t1).toContain("Roller");
    expect(t1.indexOf("JCB 4DX")).toBeLessThan(t1.indexOf("Roller"));
    expect(t1).toContain(t("fuel.mt_n_red", { n: 2 }));
    expect(t1).toContain(t("fuel.mt_n_amber", { n: 1 }));
    expect(t1).toContain(t("fuel.mt_all_ok"));                  // Roller
    expect(t1).toContain("−17.6");
  });

  test("machine par click → fill-by-fill (pehle level, entry, sensor, haal); dobara click = band", async () => {
    await open();
    const row = [...host.querySelectorAll("div")].find((d) => d.textContent.startsWith("JCB 4DX") && d.textContent.includes("CG04 4532") && d.children.length >= 8);
    await click(row);
    expect(text()).toContain(t("fuel.mt_detail_title", { name: "JCB 4DX" }));
    expect(text()).toContain("9.8");
    expect(text()).toContain(t("fuel.mt_f_entry_more"));
    expect(text()).toContain(t("fuel.mt_ok"));
    await click(btn(new RegExp("^" + t("fuel.mt_close") + "$")));
    expect(text()).not.toContain(t("fuel.mt_detail_title", { name: "JCB 4DX" }));
  });

  test("unlinked unit: naam, litre, sujhav; link par POST /telematics/units/:id/link aur dobara load", async () => {
    await open();
    expect(text()).toContain(t("fuel.mt_unlinked_title", { n: 2, l: "274.2" }));
    expect(text()).toContain("RKU_JCB_4DX 4532 No1");
    expect(text()).toContain("RKU JCB 4DX- 4532");
    expect(text()).toContain(t("fuel.mt_no_suggest"));           // grader ka sujhav nahi
    const before = api.get.mock.calls.length;
    await click(btn(new RegExp("^" + t("fuel.mt_link_btn") + "$")));
    expect(api.post).toHaveBeenCalledWith("/telematics/units/1356/link", { equipment_id: 450 });
    expect(api.get.mock.calls.length).toBeGreaterThan(before);   // reload
  });

  test("link ka confirm na ho to POST nahi", async () => {
    await open();
    window.confirm = () => false;
    await click(btn(new RegExp("^" + t("fuel.mt_link_btn") + "$")));
    expect(api.post).not.toHaveBeenCalled();
  });

  test("Machinery ka adhikar nahi → link / Theek-tha button nahi", async () => {
    mockCan.mach = false;
    await open();
    expect(btn(new RegExp("^" + t("fuel.mt_link_btn") + "$"))).toBeFalsy();
  });

  test("Excel button tabhi jab machine ho", async () => {
    await open();
    expect(btn(new RegExp("^" + t("fuel.mt_excel") + "$"))).toBeTruthy();
  });

  test("koi fill nahi → khaali sandesh", async () => {
    await mount({ ...TR(), machines: [], flags: [], unlinked: [], totals: { machines: 0, fills: 0, flags: 0, red: 0, suspect_l: 0 } });
    await click(btn(new RegExp("^" + t("fuel.mt_sub_machine"))));
    expect(text()).toContain(t("fuel.mt_empty_machine"));
    expect(btn(new RegExp("^" + t("fuel.mt_excel") + "$"))).toBeFalsy();
  });
});

describe("Flags report", () => {
  const open = async () => { await mount(TR()); await click(btn(new RegExp("^" + t("fuel.mt_sub_flags")))); };

  test("kul ginti, sandigdh litre, ranking aur teeno flag", async () => {
    await open();
    expect(text()).toContain(t("fuel.mt_flags_total", { n: 3, red: 2, l: "113" }));
    expect(text()).toContain(t("fuel.mt_rank_title"));
    expect(text()).toContain(t("fuel.mt_f_entry_more"));
    expect(text()).toContain(t("fuel.mt_f_no_entry"));
    expect(text()).toContain(t("fuel.mt_f_sensor_missing"));
    expect(text()).toContain(t("fuel.mt_flags_title", { n: 3 }));
  });

  test("kism ka chip chhanti karta hai", async () => {
    await open();
    await click(btn(new RegExp("^" + t("fuel.mt_f_no_entry"))));
    expect(text()).toContain(t("fuel.mt_flags_title", { n: 1 }));
    await click(btn(new RegExp("^" + t("fuel.mt_f_all"))));
    expect(text()).toContain(t("fuel.mt_flags_title", { n: 3 }));
  });

  test("Sirf laal — peela (sensor_missing) hat jaata hai", async () => {
    await open();
    await click(host.querySelector('input[type="checkbox"]'));
    expect(text()).toContain(t("fuel.mt_flags_title", { n: 2 }));
    // chip ki ginti sab flag par rehti hai (1 baar), par us flag ki row (pill) ab nahi
    expect(text().split(t("fuel.mt_f_sensor_missing")).length - 1).toBe(1);
  });

  test("Theek tha → POST /telematics/events/:id/review; bina event wali (entry) row par button nahi", async () => {
    await open();
    const oks = [...host.querySelectorAll("button")].filter((b) => b.textContent.trim() === t("fuel.theek_tha"));
    expect(oks).toHaveLength(2);                                  // 3 flag me se entry-only par nahi
    await click(oks[0]);
    expect(api.post).toHaveBeenCalledWith("/telematics/events/102/review", { status: "ok" });
  });

  test("machine ke naam par click → Machine wise me wahi machine khuli", async () => {
    await open();
    const name = [...host.querySelectorAll("span")].find((s) => s.textContent === "JCB 4DX" && s.style.cursor === "pointer");
    await click(name);
    expect(text()).toContain(t("fuel.mt_detail_title", { name: "JCB 4DX" }));
  });

  test("koi flag nahi → khaali sandesh", async () => {
    await mount({ ...TR(), flags: [], totals: { machines: 2, fills: 4, flags: 0, red: 0, suspect_l: 0 } });
    await click(btn(new RegExp("^" + t("fuel.mt_sub_flags"))));
    expect(text()).toContain(t("fuel.mt_empty_flags"));
  });
});

describe("sensor chalu nahi / server gadbad", () => {
  test("enabled false → 'sensor abhi chalu nahi'", async () => {
    await mount({ enabled: false, range: {}, machines: [], flags: [], totals: { machines: 0, fills: 0, flags: 0, red: 0, suspect_l: 0 }, unlinked: [], untrusted_machines: [] });
    await click(btn(new RegExp("^" + t("fuel.mt_sub_flags"))));
    expect(text()).toContain(t("fuel.mt_not_enabled"));
  });
  test("server fail → laal line, crash nahi; purana tab chalta rehta hai", async () => {
    await mount(() => ({ success: false, message: "Server me dikkat" }));
    await click(btn(new RegExp("^" + t("fuel.mt_sub_machine"))));
    expect(text()).toContain("Server me dikkat");
    await click(btn(new RegExp("^" + t("fuel.mt_sub_check") + "$")));
    expect(text()).toContain(t("fuel.kaunsi_jaanch_abhi_chalu_hai"));
  });
});
