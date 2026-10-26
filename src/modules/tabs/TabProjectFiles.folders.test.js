// Files tab — folder + tag (27 Oct 2026, Prafull): apne aap ke document / photo
// folder rail me, "Sab photos" me sab aur folder me sirf uski, tag se chhanto,
// "+ Naya folder", aur file ka 📁 se doosre folder / tag.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import TabProjectFiles from "./TabProjectFiles";
import api from "../../config/api";
import { loadFullPack } from "../../i18n";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api };
});
jest.mock("../../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style }) => <select value={value} onChange={onChange} style={style}>{children}</select> }));
jest.mock("../../utils/perms", () => ({ canEntry: () => true, currentUser: () => ({ id: 1, role: "admin" }) }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const now = new Date().toISOString();
const HUB = {
  project: { id: 5, name: "Sharda Villa" },
  cats: [],
  folders: [
    { id: 11, kind: "document", name: "BOQ / Estimate", sys_key: "boq", custom: false },
    { id: 19, kind: "document", name: "Other Documents", sys_key: "other", custom: false },
    { id: 30, kind: "document", name: "Client drawings", sys_key: null, custom: true },
    { id: 21, kind: "photo", name: "Site progress", sys_key: "photo_progress", custom: false },
    { id: 22, kind: "photo", name: "Interior", sys_key: "photo_interior", custom: false },
  ],
  documents: [
    { ref: "f1", id: 1, category: "boq", category_label: "BOQ / Estimate", title: "BOQ rev 2", url: "https://x/a.pdf", folder_id: 11, tags: ["GFC"], created_at: now, uploaded_by: 1 },
    { ref: "f2", id: 2, category: "other", category_label: "Other Documents", title: "Naksha", url: "https://x/b.pdf", folder_id: 30, tags: [], created_at: now, uploaded_by: 2 },
  ],
  photos: [
    { ref: "f3", source: "project", kind: "photo", url: "https://x/1.jpg", caption: "Kitchen", folder_id: 22, tags: ["kitchen"], created_at: now, uploaded_by: 1 },
    { ref: "f4", source: "project", kind: "photo", url: "https://x/2.jpg", caption: "Hall", folder_id: 22, tags: ["hall"], created_at: now, uploaded_by: 1 },
    { ref: "t5", source: "task", kind: "photo", url: "https://x/3.jpg", task_name: "Slab", folder_id: null, tags: [], created_at: now },
  ],
  issue_photos: [],
  can_folders: true, can_move: true, can_remove: true, unfiled_photos: 0,
};

let root;
let box;
beforeAll(() => loadFullPack()); // lazy module ki keys poore pack me
beforeEach(async () => {
  api.get.mockResolvedValue({ success: true, data: HUB });
  api.post.mockResolvedValue({ success: true, data: { id: 31, kind: "photo", name: "Kitchen side" } });
  api.patch.mockResolvedValue({ success: true });
  box = document.createElement("div");
  document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<TabProjectFiles projectId={5} />); });
  await act(async () => {});
});
afterEach(() => { act(() => root.unmount()); box.remove(); });

const leaf = (txt) => [...document.body.querySelectorAll("*")].find((n) => n.textContent.trim() === txt && ![...n.children].some((c) => c.textContent.trim() === txt));
const has = (txt) => document.body.textContent.includes(txt);
const click = async (el) => { await act(async () => { el.click(); }); };
const byTitle = (s) => document.body.querySelector(`[title="${s}"]`);
const setVal = async (el, v) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, v);
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
};
const photoTiles = () => box.querySelectorAll("img[loading='lazy']").length;

test("rail: document folder + apna folder; folder kholo to sirf uski file, apne folder par hatao", async () => {
  expect(has("BOQ rev 2")).toBe(true);
  expect(has("Naksha")).toBe(true);
  await click(byTitle("Client drawings"));
  expect(has("BOQ rev 2")).toBe(false);
  expect(has("Naksha")).toBe(true);
  expect(leaf("Folder hatao")).toBeTruthy();
});

test("Sab photos me sab, Interior me 2, tag kitchen se 1", async () => {
  await click(byTitle("Sab photos"));
  expect(photoTiles()).toBe(3);
  await click(byTitle("Interior"));
  expect(photoTiles()).toBe(2);
  await click(leaf("#kitchen 1").closest("button"));
  expect(photoTiles()).toBe(1);
});

test("+ Naya folder (photo) → POST", async () => {
  const add = [...document.body.querySelectorAll("button")].filter((b) => b.textContent.trim() === "+ Naya folder");
  expect(add.length).toBe(2);
  await click(add[1]);
  await setVal(document.body.querySelector("input[placeholder='Folder ka naam']"), "Kitchen side");
  await click([...document.body.querySelectorAll("button")].find((b) => b.textContent.trim() === "✓"));
  expect(api.post).toHaveBeenCalledWith("/projects/5/folders", { kind: "photo", name: "Kitchen side" });
});

test("document ka 📁 → doosre folder + tag wahi (PATCH)", async () => {
  await click(document.body.querySelectorAll("[title='Folder / tag badlo']")[0]);
  const sel = document.body.querySelector("div[style*='z-index: 1500'] select");
  await setVal(sel, "30");
  await click([...document.body.querySelectorAll("button")].find((b) => b.textContent.trim() === "Save karo"));
  expect(api.patch).toHaveBeenCalledWith("/projects/5/files/1", { folder_id: 30, tags: "GFC" });
});
