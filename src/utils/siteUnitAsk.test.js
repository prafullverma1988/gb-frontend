// Store issue receive — site ki unit alag ho to ginti poochh kar dobara (26 Oct 2026).
import { receiveWithSiteUnit } from './siteUnitAsk';

const Q = (line, msg) => ({ success: false, code: 'ISSUE_SITE_UNIT', message: msg || 'Binding Wire: store se 16 Kg aaya … kitne Bundle gine?',
  data: { line_id: line, qty: 16, unit: 'Kg', stock_unit: 'Bundle', suggest: null } });

afterEach(() => { delete window.promptAsync; });

test('sawaal → ginti → wahi receive stock_qty ke saath; do line ho to dono', async () => {
  const asked = [];
  window.promptAsync = (m) => { asked.push(m); return Promise.resolve(asked.length === 1 ? '2' : '1,5'); };
  const sent = [];
  const replies = [Q(11), Q(12, 'GITTI …'), { success: true, message: 'ho gaya' }];
  const r = await receiveWithSiteUnit((extra) => { sent.push(extra); return Promise.resolve(replies[sent.length - 1]); });
  expect(r).toEqual({ success: true, message: 'ho gaya' });
  expect(sent).toEqual([{}, { stock_qty: { 11: 2 } }, { stock_qty: { 11: 2, 12: 1.5 } }]);
  expect(asked[1]).toBe('GITTI …');
});

test('mana kiya ya galat number → receive nahi, server ka sandesh', async () => {
  window.promptAsync = () => Promise.resolve(null);
  let calls = 0;
  let r = await receiveWithSiteUnit(() => { calls++; return Promise.resolve(Q(11)); });
  expect(calls).toBe(1);
  expect(r).toEqual(expect.objectContaining({ success: false, cancelled: true, message: expect.stringContaining('Bundle') }));
  window.promptAsync = () => Promise.resolve('abc');
  r = await receiveWithSiteUnit(() => Promise.resolve(Q(11)));
  expect(r.success).toBe(false);
  expect(r.cancelled).toBe(false);
});

test('doosra error ya wahi line dobara → seedha lautao (chakkar nahi)', async () => {
  window.promptAsync = () => Promise.resolve('3');
  const other = { success: false, code: 'ISSUE_RECEIVE_EXCEEDS', message: 'zyada' };
  expect(await receiveWithSiteUnit(() => Promise.resolve(other))).toBe(other);
  let calls = 0;
  const r = await receiveWithSiteUnit(() => { calls++; return Promise.resolve(Q(11)); });
  expect(calls).toBe(2);
  expect(r.code).toBe('ISSUE_SITE_UNIT');
});
