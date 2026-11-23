// BOQ me sirf kaam (24 Nov 2026): stage wali line ek row, Edit BOQ ka badlaav wapas har stage par
import { expandWork, groupWorks } from "./boqWorks";

const P = (id, part, rate, extra = {}) => ({ id, description: "[GF] Ground Floor · " + part, unit: "sq.ft.", qty: "1465", rate: String(rate),
  amount: String(1465 * rate), part_of: "Ground Floor", ...extra });

test("groupWorks: Tikendra GF ke stage ek row — qty 1465, rate ₹1,500, amount ₹21,97,500; bina stage wali line waisi hi", () => {
  const items = [P(1, "Plinth (20%)", 300), P(2, "Lintel (10%)", 150), P(3, "Slab casting (15%)", 225), P(4, "Plaster (5%)", 75),
    { id: 9, description: "[SEPTIC TANK] Septic tank", unit: "LS", qty: "1", rate: "50000", amount: "50000", part_of: null }];
  const w = groupWorks(items.concat([P(5, "Tile (50%)", 750)]));
  expect(w.length).toBe(2);
  expect(w[0]._work).toBe(true);
  expect(w[0]._cleanDesc).toBe("Ground Floor");
  expect(w[0].rate).toBe(1500);
  expect(w[0].amount).toBe(2197500);
  expect(w[0]._parts.map((p) => p.id)).toEqual([1, 2, 3, 4, 5]);
  expect(w[1].id).toBe(9);
  expect(w[1]._work).toBeUndefined();
});

test("groupWorks: alag floor / alag qty = alag row; akeli stage line jaisi thi", () => {
  const ff = (id, rate) => ({ ...P(id, "Slab", rate), description: "[FF] First Floor · Slab", part_of: "First Floor", qty: "1470" });
  const w = groupWorks([P(1, "Plinth", 300), P(2, "Lintel", 200), ff(3, 500), ff(4, 400), { ...P(7, "Odd", 10), part_of: "Porch", description: "[GF] Porch · Odd" }]);
  expect(w.map((x) => x._work ? x.part_of + ":" + x.rate : "line:" + x.id)).toEqual(["Ground Floor:500", "First Floor:900", "line:7"]);
});

test("expandWork: qty sab stage par; rate badla to usi anupaat me, jod wahi; na badla to stage ki rate jaisi thi", () => {
  const row = { id: 1, description: "[GF] Ground Floor", unit: "sq.ft.", qty: 1500, rate: 1500,
    _parts: [{ id: 1, description: "a", unit: "sq.ft.", rate: 300 }, { id: 2, description: "b", unit: "sq.ft.", rate: 450 }, { id: 3, description: "c", unit: "sq.ft.", rate: 750 }] };
  const same = expandWork(row);
  expect(same.map((x) => [x.id, x.qty, x.rate])).toEqual([[1, 1500, 300], [2, 1500, 450], [3, 1500, 750]]);
  const up = expandWork({ ...row, rate: 1600 });
  expect(up.map((x) => x.rate)).toEqual([320, 480, 800]);
  const odd = expandWork({ ...row, rate: 1001 });
  expect(Math.round(odd.reduce((a, x) => a + x.rate, 0) * 100) / 100).toBe(1001);
  expect(expandWork({ id: 9, rate: 5, qty: 1 })).toEqual([{ id: 9, rate: 5, qty: 1 }]);
  // ₹ se bane stage ka naam naye ₹ se; % wala naam wahi
  const rs = expandWork({ ...row, rate: 3000, _parts: [{ id: 1, description: "[GF] Ground Floor · Plinth (₹1200)", rate: 1200 }, { id: 2, description: "[GF] Ground Floor · Tile (60%)", rate: 1800 }] });
  expect(rs.map((x) => [x.description, x.rate])).toEqual([["[GF] Ground Floor · Plinth (₹1200)", 1200], ["[GF] Ground Floor · Tile (60%)", 1800]]);
  const rs2 = expandWork({ ...row, rate: 1500, _parts: [{ id: 1, description: "[GF] Ground Floor · Plinth (₹1200)", rate: 1200 }, { id: 2, description: "[GF] Ground Floor · Tile (60%)", rate: 1800 }] });
  expect(rs2.map((x) => [x.description, x.rate])).toEqual([["[GF] Ground Floor · Plinth (₹600)", 600], ["[GF] Ground Floor · Tile (60%)", 900]]);
});
