import { askBackdateReason, reasonHeader, REASON_MAX } from "./backdateReason";

const dialog = () => document.querySelector('[role="dialog"]');
const type = (v) => { const ta = dialog().querySelector("textarea"); ta.value = v; ta.dispatchEvent(new Event("input")); };
const buttons = () => dialog().querySelectorAll("button");

describe("back-date wajah ka box", () => {
  afterEach(() => { const d = dialog(); if (d) d.remove(); });

  test("wajah likh kar save → wahi wajah lautti hai, box band", async () => {
    const p = askBackdateReason({ can_override: false });
    expect(dialog()).not.toBeNull();
    expect(buttons()[1].disabled).toBe(true);          // khaali wajah par save band
    type("  bill   der se aaya ");
    expect(buttons()[1].disabled).toBe(false);
    buttons()[1].click();
    await expect(p).resolves.toBe("bill der se aaya");
    expect(dialog()).toBeNull();
  });

  test("Rehne do → null", async () => {
    const p = askBackdateReason({});
    buttons()[0].click();
    await expect(p).resolves.toBeNull();
    expect(dialog()).toBeNull();
  });

  test("Escape → null", async () => {
    const p = askBackdateReason({});
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await expect(p).resolves.toBeNull();
  });

  test("saath ki do request — ek hi box", async () => {
    const a = askBackdateReason({});
    const b = askBackdateReason({});
    expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
    type("x"); buttons()[1].click();
    await expect(Promise.all([a, b])).resolves.toEqual(["x", "x"]);
  });

  test("header sirf ASCII — Hindi encode, lambai kati", () => {
    const h = reasonHeader("बिल देर से आया")["X-Backdate-Reason"];
    expect(/^[\x20-\x7E]+$/.test(h)).toBe(true);
    expect(decodeURIComponent(h)).toBe("बिल देर से आया");
    expect(decodeURIComponent(reasonHeader("a".repeat(999))["X-Backdate-Reason"]).length).toBe(REASON_MAX);
  });
});
