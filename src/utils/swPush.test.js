// public/sw-push.js (30 Oct 2026, PC browser push) — nakli `self` me chalao:
// activate par purane sw.js ka cache (gb-buildcon-*) saaf, baaki cache nahi;
// push → notification + khule tab ko "san-push"; dabaya → khula tab aage +
// "san-push-open", warna web URL ke saath (utils/push.js wahi padhta hai).
const fs = require("fs");
const path = require("path");

const CODE = fs.readFileSync(path.join(__dirname, "..", "..", "public", "sw-push.js"), "utf8");

function boot(clientsList, cacheKeys = []) {
  const handlers = {};
  const self = {
    addEventListener: (ev, fn) => { handlers[ev] = fn; },
    skipWaiting: jest.fn(),
    registration: { showNotification: jest.fn(() => Promise.resolve()) },
    clients: {
      matchAll: jest.fn(() => Promise.resolve(clientsList)),
      openWindow: jest.fn(() => Promise.resolve()),
      claim: jest.fn(() => Promise.resolve()),
    },
  };
  const caches = { keys: jest.fn(() => Promise.resolve(cacheKeys)), delete: jest.fn(() => Promise.resolve(true)) };
  // eslint-disable-next-line no-new-func
  new Function("self", "caches", CODE)(self, caches);
  return { self, handlers, caches };
}
const run = async (handler, ev) => {
  let p = Promise.resolve();
  handler({ ...ev, waitUntil: (x) => { p = x; } });
  await p;
};

test("activate: sirf purane gb-buildcon cache hate, claim", async () => {
  const b = boot([], ["gb-buildcon-v1", "other-cache"]);
  await run(b.handlers.activate, {});
  expect(b.caches.delete).toHaveBeenCalledTimes(1);
  expect(b.caches.delete).toHaveBeenCalledWith("gb-buildcon-v1");
  expect(b.self.clients.claim).toHaveBeenCalled();
});

test("push: notification dikhao (title notification se, warna data se) + khule tab ko san-push", async () => {
  const win = { postMessage: jest.fn(), focus: jest.fn() };
  const b = boot([win]);
  const data = { notification_id: "41", type: "wallet_approved", link: "/finance?id=7" };
  await run(b.handlers.push, { data: { json: () => ({ notification: { title: "Kharcha approve", body: "₹1200" }, data }) } });
  expect(b.self.registration.showNotification).toHaveBeenCalledWith("Kharcha approve",
    expect.objectContaining({ body: "₹1200", tag: "n41", data, icon: "/icon-192.png" }));
  expect(win.postMessage).toHaveBeenCalledWith({ type: "san-push", data });
  await run(b.handlers.push, { data: { json: () => ({ data: { title: "T", body: "B" } }) } });
  expect(b.self.registration.showNotification).toHaveBeenLastCalledWith("T", expect.objectContaining({ body: "B" }));
});

test("click: khula tab → focus + san-push-open; koi tab nahi → web URL ke saath", async () => {
  const win = { postMessage: jest.fn(), focus: jest.fn(() => Promise.resolve()) };
  const d = { notification_id: "9", type: "mr_issued", link: "/warehouse?id=3" };
  let b = boot([win]);
  await run(b.handlers.notificationclick, { notification: { close: jest.fn(), data: d } });
  expect(win.focus).toHaveBeenCalled();
  expect(win.postMessage).toHaveBeenCalledWith({ type: "san-push-open", data: d });
  b = boot([]);
  await run(b.handlers.notificationclick, { notification: { close: jest.fn(), data: d } });
  expect(b.self.clients.openWindow).toHaveBeenCalledWith("/?pushn=9&pusht=mr_issued&pushl=%2Fwarehouse%3Fid%3D3");
});
