/* Web GRN → Ordered ka hisaab (27 Oct 2026, grnOrdered.js): IST din, chip ginti +
   default, vendor card ka kram, khoj (MR / PO no.), ek GRN = ek vendor. */
import { istDay, dayOf, dueOf, countChips, defaultChip, groupByVendor, lockedVendor, pickedLines, matchSearch } from "./grnOrdered";

const TODAY = "2026-10-27";
const L = [
  { key: "mr:1", vendor: "Ram Traders", material: "Cement", label: "MR-1", day: "2026-10-24" },
  { key: "mr:2", vendor: "Ram Traders", material: "Sariya", label: "MR-2", day: "2026-10-27" },
  { key: "mr:3", vendor: "Maa Durga", material: "Gitti", label: "MR-3", day: "2026-10-27" },
  { key: "po:9", vendor: "Shiv Sand", material: "Reti", label: "PO-12", day: "2026-10-29" },
  { key: "mr:4", vendor: "", material: "Bricks", label: "MR-4", day: null },
];

test("IST din aur tareekh", () => {
  expect(istDay(Date.parse("2026-10-26T18:31:00Z"))).toBe("2026-10-27");
  expect(dayOf("2026-10-26T18:30:00.000Z")).toBe("2026-10-27");
  expect(dueOf("2026-10-26", TODAY)).toBe("late");
  expect(dueOf(null, TODAY)).toBe("none");
});

test("chip ginti + default; card kram; khoj; vendor lock", () => {
  const c = countChips(L, TODAY);
  expect(c).toEqual({ late: 1, aaj: 2, aage: 1, sab: 5 });
  expect(defaultChip(c)).toBe("late");
  expect(groupByVendor(L, { today: TODAY }).map((x) => x.vendor)).toEqual(["Ram Traders", "Maa Durga", "Shiv Sand", ""]);
  expect(groupByVendor(L, { today: TODAY, chip: "late" })[0].lines).toHaveLength(2);
  expect(matchSearch(L[3], "po-12")).toBe(true);
  expect(lockedVendor(L, { "po:9": true })).toBe("Shiv Sand");
  expect(pickedLines(L, { "mr:1": true, "mr:3": true }).map((l) => l.key)).toEqual(["mr:1"]);
});
