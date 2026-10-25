// ════════════════════════════════════════════════════════════════
// Store issue ki site wali unit (26 Oct 2026, Prafull)
//
// Store Binding Wire Kg me deta hai, site par Bundle me ginta hai. Receive par
// server 400 ISSUE_SITE_UNIT deta hai — sawaal ("store se 16 Kg aaya … site par
// kitne Bundle gine?") + data.line_id. Site wale se ginti poochh kar wahi receive
// dobara (body.stock_qty[line_id]); har line ek hi baar. Pul line par likh jaata
// hai — agla aadha receive aur Material Zimmedari usi se (routes/warehouse.js).
//
// send(extra) → server ka jawab (extra = {} ya { stock_qty }).
// Lautata: aakhri jawab; mana kiya / galat number → { success:false, message }.
// ════════════════════════════════════════════════════════════════
export async function receiveWithSiteUnit(send) {
  const stockQty = {};
  for (let n = 0; n < 8; n++) {
    const r = await send(Object.keys(stockQty).length ? { stock_qty: { ...stockQty } } : {});
    const lineId = r && r.code === 'ISSUE_SITE_UNIT' && r.data ? r.data.line_id : null;
    if (!lineId || stockQty[lineId] != null) return r;
    const ask = window.promptAsync || ((m, d) => Promise.resolve(window.prompt(m, d)));
    const v = await ask(r.message, r.data.suggest != null ? String(r.data.suggest) : '');
    const num = Number(String(v == null ? '' : v).trim().replace(',', '.'));
    if (!(num > 0)) return { success: false, code: r.code, message: r.message, cancelled: v == null };
    stockQty[lineId] = num;
  }
  return { success: false };
}
