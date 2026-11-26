// Entry Edit helper — mode padhna, button ka faisla, 428 → wajah → dobara.
import api from "../config/api";
import { fetchEditMode, editUi, saveWithEditRule } from "./entryEdit";
import { loadFullPack, setLang } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn();
  return { __esModule: true, default: api };
});

beforeAll(async () => { loadFullPack(); await setLang("en", { reload: false }); });
afterEach(() => { jest.clearAllMocks(); delete window.promptAsync; });

test("fetchEditMode: sahi URL, galat / khaali jawab = null", async () => {
  api.get.mockResolvedValue({ success: true, data: { mode: "request", window_label: "2 hours", pending: null } });
  const m = await fetchEditMode("crm_lead", 12);
  expect(api.get).toHaveBeenCalledWith("/entry-edit/mode?entity=crm_lead&id=12");
  expect(m.mode).toBe("request");
  api.get.mockResolvedValue({ success: true, data: { foo: 1 } });
  expect(await fetchEditMode("crm_lead", 12)).toBeNull();
  api.get.mockResolvedValue({ success: false, message: "x" });
  expect(await fetchEditMode("crm_lead", 12)).toBeNull();
  expect(await fetchEditMode("crm_lead", 0)).toBeNull();
});

test("editUi: direct / request / pending / none / admin lock", () => {
  expect(editUi(null).show).toBe(false);
  const d = editUi({ mode: "direct", why: "own_fresh" }, "Edit GRN");
  expect(d).toMatchObject({ show: true, disabled: false, label: "Edit GRN", hint: "", warn: "" });
  expect(editUi({ mode: "request", why: "approved_entry", window_label: "2 hours" }).hint).toBe("This entry is already approved — the change will go for approval");
  const r = editUi({ mode: "request", window_label: "2 hours" });
  expect(r.show).toBe(true);
  expect(r.label).toBe("Edit (with approval)");
  expect(r.hint).toContain("2 hours");
  const p = editUi({ mode: "request", pending: { id: 3 } });
  expect(p).toMatchObject({ show: true, disabled: true });
  expect(p.hint).toBe("A change is waiting for approval");
  const n = editUi({ mode: "none", lock: "GRN billed" });
  expect(n).toMatchObject({ show: false, note: "GRN billed" });
  expect(editUi({ mode: "direct", why: "admin", lock: "Billed" }).warn).toBe("Billed");
  expect(editUi({ mode: "direct", why: "edit_perm", lock: "Billed" }).warn).toBe("");
});

test("saveWithEditRule: seedha save", async () => {
  const send = jest.fn().mockResolvedValue({ success: true, data: { id: 1 } });
  const r = await saveWithEditRule(send, { a: 1 });
  expect(send).toHaveBeenCalledTimes(1);
  expect(r).toMatchObject({ success: true, pending: false, cancelled: false });
});

test("saveWithEditRule: 428 → wajah → wahi body + _edit_reason → manzoori me", async () => {
  window.promptAsync = jest.fn().mockResolvedValue("  galat   budget ");
  const send = jest.fn()
    .mockResolvedValueOnce({ success: false, code: "EDIT_REASON_REQUIRED", message: "Only within 2 hours" })
    .mockResolvedValueOnce({ success: true, data: { mode: "pending_approval" }, message: "sent" });
  const r = await saveWithEditRule(send, { budget: "30L" });
  expect(window.promptAsync.mock.calls[0][0].message).toBe("Only within 2 hours");
  expect(send.mock.calls[1][0]).toEqual({ budget: "30L", _edit_reason: "galat budget" });
  expect(r).toMatchObject({ success: true, pending: true, message: "sent" });
});

test("saveWithEditRule: wajah nahi di = cancelled, dobara nahi bheja", async () => {
  window.promptAsync = jest.fn().mockResolvedValue(null);
  const send = jest.fn().mockResolvedValue({ success: false, code: "EDIT_REASON_REQUIRED", message: "m" });
  const r = await saveWithEditRule(send, { x: 1 });
  expect(send).toHaveBeenCalledTimes(1);
  expect(r).toMatchObject({ success: false, cancelled: true, pending: false });
});

test("saveWithEditRule: rok (409) ka message waisa hi", async () => {
  const send = jest.fn().mockResolvedValue({ success: false, code: "ENTRY_LOCKED", message: "Billed" });
  const r = await saveWithEditRule(send, {});
  expect(r).toMatchObject({ success: false, code: "ENTRY_LOCKED", message: "Billed", cancelled: false });
});
