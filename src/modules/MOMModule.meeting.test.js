// Meeting Mode v2 (29 Oct 2026) — web: kya banega (tick, project-wise yaad),
// pichhle baaki kaam, "Pehle se hai" → Purane me update, kisko diya zaroori,
// MOM me haazri + faisle, fail par wajah + Dobara try karo.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MeetingModeModal } from "./MOMModule";
import api from "../config/api";
import { loadFullPack } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api };
});
jest.mock("../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style, ...p }) => <select value={value} onChange={onChange} style={style} aria-label={p["aria-label"]}>{children}</select> }));
jest.mock("../components/SearchSelect", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/DataExport", () => ({ __esModule: true, default: () => null }));

window.IS_REACT_ACT_ENVIRONMENT = true; // jsdom me window === globalThis
beforeAll(() => loadFullPack());
const MEETING = {
  id: 50, status: "review", summary: "S", transcript: "x", allowed_types: ["work", "todo", "issue"], project_id: null,
  items: [
    { type: "work", title: "Plaster complete karo", assignee: "Ramesh", project: "", priority: "Medium", existing_ref: { type: "work", id: 7, title: "Plaster complete karo", days_open: 3 } },
    { type: "work", title: "Tile ka naap lo", assignee: "Mohan", project: "", priority: "Medium" },
    { type: "decision", title: "Slab casting roko", assignee: "", project: "" },
  ],
};
let root, box, failCreate;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 15)); });
const btn = (txt) => [...box.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith(txt));
const set = (el, v) => { const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value"); d.set.call(el, v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); };
beforeEach(async () => {
  failCreate = 0;
  api.get.mockImplementation((url) => Promise.resolve(
    url === "/projects" ? { success: true, data: [{ id: 11, name: "Site A" }] }
      : url === "/projects/team-members" ? { success: true, data: [{ id: 2, name: "Ramesh Kumar", role: "supervisor" }, { id: 3, name: "Suresh", role: "supervisor" }] }
        : url.startsWith("/meetings/prefs") ? { success: true, data: { types: ["work", "todo", "issue", "task", "task_update", "mr"] } }
          : url.startsWith("/meetings/open-items") ? { success: true, data: { items: [
            { type: "work", id: 7, title: "Plaster complete karo", days_open: 3, assignee: "Ramesh Kumar", overdue: true },
            { type: "todo", id: 5, title: "Purana todo", days_open: 45, source: "company_todo" }], last_meeting: { created_at: "2026-10-28T05:00:00Z", total: 4, done: 1 } } }
            : { success: true, data: [] }));
  api.post.mockImplementation((url) => Promise.resolve(
    url === "/meetings/extract" ? { success: true, data: JSON.parse(JSON.stringify(MEETING)) }
      : url === "/mom" ? { success: true, data: { id: 77 } }
        : url === "/work-items" ? (failCreate ? (failCreate--, { success: false, message: "Photo zaroori hai" }) : { success: true, data: { id: 91 } })
          : { success: true, data: {} }));
  api.put.mockResolvedValue({ success: true, data: {} });
  api.patch.mockResolvedValue({ success: true, data: {} });
  box = document.createElement("div"); document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<MeetingModeModal onClose={() => {}} />); });
  await flush();
});
afterEach(() => { act(() => root.unmount()); box.remove(); });

test("tick row + yaad: MR hatao → PUT /meetings/prefs (All); pichhle baaki kaam + 30+ din band", async () => {
  const grp = box.querySelector('[role="group"]');
  expect([...grp.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Work", "To-Do", "Issue", "Task", "Progress", "MR"]);
  await act(async () => { [...grp.querySelectorAll("button")].find((b) => b.textContent === "MR").click(); });
  expect(api.put).toHaveBeenCalledWith("/meetings/prefs", { project_id: "all", types: ["work", "todo", "issue", "task", "task_update"] });
  expect(box.textContent).toMatch(/Pichhle baaki kaam \(2\)/);
  expect(box.textContent).not.toMatch(/Purana todo/);
  await act(async () => { btn("Ho gaya").click(); });
  await flush();
  expect(api.put).toHaveBeenCalledWith("/work-items/7/done", {});
});

const toReview = async () => {
  await act(async () => { set(box.querySelector("textarea"), "Plaster abhi tak nahi hua"); });
  await act(async () => { btn("Extract").click(); });
  await flush();
};

test("review → purane me update, naya Work (kisko diya zaroori), MOM + committed; fail par Dobara try", async () => {
  failCreate = 1;
  await toReview();
  expect(api.post.mock.calls.find((c) => c[0] === "/meetings/extract")[1].allowed_types).toEqual(["work", "todo", "issue", "task", "task_update", "mr"]);
  expect(box.textContent).toMatch(/Pehle se hai: Plaster complete karo \(3 din se\)/);
  const typeSel = box.querySelectorAll('select[aria-label="Type"]');
  expect([...typeSel[1].options].map((o) => o.textContent)).toEqual(["Work", "To-Do", "Issue", "MOM point"]);
  await act(async () => { btn("Overview").click(); });
  expect(box.textContent).toMatch(/1 item me "Kisko diya" select karo/);
  const who = box.querySelectorAll('select[aria-label="Kisko diya — select karo"]');
  expect(who[0].value).toBe("2");
  await act(async () => { set(who[1], "3"); });
  await act(async () => { btn("Overview").click(); });
  await act(async () => { btn("Approve karke banao").click(); });
  await flush();
  expect(api.post).toHaveBeenCalledWith("/work-items/7/updates", expect.objectContaining({ meeting_id: 50 }));
  const mom = api.post.mock.calls.find((c) => c[0] === "/mom")[1];
  expect(mom.discussion[0].point).toBe("Slab casting roko");
  expect(box.textContent).toMatch(/Photo zaroori hai/);
  expect(api.patch.mock.calls.pop()[1].status).toBe("partial");
  await act(async () => { btn("Dobara try karo").click(); });
  await flush();
  expect(api.post.mock.calls.filter((c) => c[0] === "/work-items")).toHaveLength(2);
  expect(api.post.mock.calls.filter((c) => c[0] === "/work-items/7/updates")).toHaveLength(1);
  expect(api.post.mock.calls.filter((c) => c[0] === "/mom")).toHaveLength(1);
  expect(api.patch.mock.calls.pop()[1].status).toBe("committed");
});
