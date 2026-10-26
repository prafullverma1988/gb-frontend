import { darjTime, darjDay, darjWhen, darjIsBackdated, darjRowSuffix, darjDetailLine, istParts } from "./darjTime";

// t() stub — asli i18n pack ki jagah sirf key+params dikha de
const tt = (k, p) => ({
  "darj.tag": "darj",
  "darj.detail": "Darj: {when}",
  "darj.detail_by": "Darj: {when} — {name}",
}[k].replace(/\{(\w+)\}/g, (_, n) => p[n]));

describe("darjTime — IST me save time", () => {
  test("UTC ISO → IST (+5:30)", () => {
    expect(darjTime("2026-10-17T10:15:00.000Z")).toBe("3:45 PM");
    expect(darjDay("2026-10-17T10:15:00.000Z")).toBe("17 Oct");
    expect(darjDay("2026-10-17T10:15:00.000Z", true)).toBe("17 Oct 2026");
  });
  test("zone bina string = UTC; Date object bhi chalta hai", () => {
    expect(darjTime("2026-10-17 10:15:00")).toBe("3:45 PM");
    expect(darjTime(new Date(Date.UTC(2026, 9, 17, 10, 15)))).toBe("3:45 PM");
  });
  test("din badal jaata hai: 20:00 UTC = agle din 1:30 AM IST", () => {
    expect(darjTime("2026-10-16T20:00:00Z")).toBe("1:30 AM");
    expect(darjDay("2026-10-16T20:00:00Z")).toBe("17 Oct");
  });
  test("12 AM / 12 PM", () => {
    expect(darjTime("2026-10-16T18:30:00Z")).toBe("12:00 AM");
    expect(darjTime("2026-10-17T06:30:00Z")).toBe("12:00 PM");
  });
  test("missing / kharab value → kuch nahi", () => {
    for (const v of [null, undefined, "", "abc", "2026-10-17"]) {
      expect(istParts(v)).toBeNull();
      expect(darjTime(v)).toBe("");
      expect(darjRowSuffix(v, "2026-10-17", tt)).toBe("");
      expect(darjDetailLine(v, "Ramesh", tt)).toBe("");
    }
  });
  test("row suffix: same din → sirf time", () => {
    expect(darjRowSuffix("2026-10-17T10:15:00Z", "2026-10-17", tt)).toBe(" · 3:45 PM");
  });
  test("row suffix: back-dated → darj <din> <time>", () => {
    expect(darjRowSuffix("2026-10-17T03:40:00Z", "2026-10-15", tt)).toBe(" · darj 17 Oct 9:10 AM");
  });
  test("IST din se compare, UTC din se nahi", () => {
    // 17 Oct 01:00 IST = 16 Oct 19:30 UTC — business date 17 Oct → back-dated nahi
    expect(darjIsBackdated("2026-10-16T19:30:00Z", "2026-10-17")).toBe(false);
    expect(darjIsBackdated("2026-10-16T19:30:00Z", "2026-10-16")).toBe(true);
  });
  test("business date na ho → back-date nishaan nahi, time dikhta hai", () => {
    expect(darjIsBackdated("2026-10-17T10:15:00Z", null)).toBe(false);
    expect(darjRowSuffix("2026-10-17T10:15:00Z", null, tt)).toBe(" · 3:45 PM");
  });
  test("business date timestamp ho to uska IST din", () => {
    expect(darjIsBackdated("2026-10-17T10:15:00Z", "2026-10-17T02:00:00.000Z")).toBe(false);
  });
  test("darjWhen", () => {
    expect(darjWhen("2026-10-17T10:15:00Z")).toBe("17 Oct 2026, 3:45 PM");
    expect(darjWhen(null)).toBe("");
  });
  test("detail line", () => {
    expect(darjDetailLine("2026-10-17T10:15:00Z", "Ramesh", tt)).toBe("Darj: 17 Oct 2026, 3:45 PM — Ramesh");
    expect(darjDetailLine("2026-10-17T10:15:00Z", "  ", tt)).toBe("Darj: 17 Oct 2026, 3:45 PM");
    expect(darjDetailLine("2026-10-17T10:15:00Z", null, tt)).toBe("Darj: 17 Oct 2026, 3:45 PM");
  });
  test("teeno pack me darj key hain", () => {
    for (const lang of ["hi-Latn", "hi", "en"]) {
      const pack = require("../i18n/" + lang).default;
      for (const k of ["darj.tag", "darj.detail", "darj.detail_by"]) expect(typeof pack[k]).toBe("string");
    }
  });
});
