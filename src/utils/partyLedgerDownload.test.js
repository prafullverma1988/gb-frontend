import { fromApiRow, fromScreenRow, particularsOf } from "./partyLedgerDownload";

const items = [
  { item_name: "Cement", description: "Acc Gold", qty: 40, unit: "Bag", rate: 345 },
  { item_name: "Cement Transport", description: "", qty: 1, unit: "Nos", rate: 400 },
];

test("bill ki row: Particulars me material, matra, rate", () => {
  const r = fromApiRow({ id: 1, type: "material_purchase", amount: 14200, date: "2026-10-25",
    description: "Material Purchase Bill — Verma Traders Raipur.", note: "", line_items: items });
  expect(r.particulars).toBe("Cement (Acc Gold) 40 Bag @ ₹345, Cement Transport 1 Nos @ ₹400");
});

test("note ho to material ke baad", () => {
  expect(particularsOf({ note: "advance wala" }, [{ item_name: "Murum", qty: 4200, unit: "CFT", rate: 6.1667 }]))
    .toBe("Murum 4,200 CFT @ ₹6.167 — advance wala");
});

test("line items na hon (payment) → pehle jaisa note / description", () => {
  expect(fromApiRow({ id: 2, type: "payment", amount: 5, note: "For material payment", description: "x" }).particulars)
    .toBe("For material payment");
  expect(fromApiRow({ id: 3, type: "payment", amount: 5, description: "Only desc" }).particulars).toBe("Only desc");
});

test("screen ki row (Finance → Parties ka Excel) bhi wahi", () => {
  expect(fromScreenRow({ id: 1, amount: 14200, dateRaw: "2026-10-25", sub: "Material Purchase Bill — X", items }).particulars)
    .toBe("Cement (Acc Gold) 40 Bag @ ₹345, Cement Transport 1 Nos @ ₹400");
  expect(fromScreenRow({ id: 2, amount: 1, dateRaw: "2026-10-25", note: "", sub: "Payment note" }).particulars).toBe("Payment note");
});
