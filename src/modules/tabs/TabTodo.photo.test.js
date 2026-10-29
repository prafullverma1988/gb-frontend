// To-Do poora karte waqt ki photo (29 Oct 2026): project_task wala todo (meeting
// ka task bhi) tick par from: "todo" + photo_urls bhejta hai — server "To-Do poora
// karne par photo" (key todo) maangta hai. Server mana kare to tick wapas + wajah.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import TabTodo from "./TabTodo";
import api from "../../config/api";
import { loadFullPack } from "../../i18n";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api };
});
jest.mock("../../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style }) => <select value={value} onChange={onChange} style={style}>{children}</select> }));
jest.mock("../../components/SearchSelect", () => ({ __esModule: true, default: () => null }));
jest.mock("../../utils/perms", () => ({ canAny: () => true, currentUser: () => ({ id: 1, role: "admin" }) }));
jest.mock("../../utils/uploadManager", () => ({ __esModule: true, default: { add: jest.fn() } }));

window.IS_REACT_ACT_ENVIRONMENT = true; // jsdom me window === globalThis
const TODOS = [
  { id: 9, project_id: 5, title: "Plaster complete karo", status: "Not Started", priority: "Medium", _source: "project_task", photo_urls: ["https://x/old.jpg"] },
  { id: 4, project_id: 5, title: "Client ko photo bhejo", status: "Pending", priority: "Low", _source: "company_todo", photo_urls: [] },
];
let root, box;
beforeAll(() => loadFullPack());
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });
beforeEach(async () => {
  api.get.mockImplementation((url) => Promise.resolve(
    url === "/projects/all-todos" ? { success: true, data: TODOS }
      : url === "/settings/photo" ? { success: true, data: { settings: { todo: { mode: "required" } } } }
        : { success: true, data: [] }));
  api.put.mockReset();
  window.alert = jest.fn();
  box = document.createElement("div"); document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<TabTodo projectId={5} />); });
  await flush();
});
afterEach(() => { act(() => root.unmount()); box.remove(); });

const ticks = () => [...box.querySelectorAll('[role="checkbox"]')];

test("detail me pehle ki photo + Photo khaana (Zaroori)", async () => {
  await act(async () => { box.querySelector('[aria-expanded="false"]').click(); });
  expect(box.querySelector('img[src*="old.jpg"]')).toBeTruthy();
  expect(box.textContent).toMatch(/Photo \(poora karte waqt\)\s*Zaroori/);
});

test("project_task todo: tick → /tasks/:id + from todo + photo_urls; server mana → wapas + wajah", async () => {
  api.put.mockResolvedValueOnce({ success: false, message: "To-Do poora karne par photo ke bina save nahi hoga" });
  await act(async () => { ticks()[0].click(); });
  await flush();
  expect(api.put).toHaveBeenCalledWith("/tasks/9", { status: "Completed", photo_urls: [], from: "todo" });
  expect(window.alert).toHaveBeenCalledWith("To-Do poora karne par photo ke bina save nahi hoga");
  expect(ticks()).toHaveLength(2);   // wapas khula
});

test("company todo: from nahi jaata (apna raasta)", async () => {
  api.put.mockResolvedValueOnce({ success: true, data: {} });
  await act(async () => { ticks()[1].click(); });
  await flush();
  expect(api.put).toHaveBeenCalledWith("/projects/company-todos/4", { status: "Completed", photo_urls: [] });
});
