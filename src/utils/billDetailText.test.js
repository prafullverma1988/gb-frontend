/* Bill ka byora jab line items / note nahi (billDetailText.js) — purane import ke bill me item ka naam
   description me hota hai; wahi dikhna chahiye, auto-text ya aur kisi row par nahi. */
import { billDetailText } from './billDetailText';

const bill = (o) => ({ txnType: 'material_purchase', items: [], note: '', sub: '', ...o });

describe('billDetailText', () => {
  test('purane import ka bill: description hi byora', () => {
    expect(billDetailText(bill({ sub: 'Jali Door' }))).toBe('Jali Door');
    expect(billDetailText(bill({ sub: 'Tmt 10mm, Transport, Tmt 12mm, Tmt 8mm' }))).toBe('Tmt 10mm, Transport, Tmt 12mm, Tmt 8mm');
    expect(billDetailText(bill({ sub: '  Cement  ' }))).toBe('Cement');
  });

  test('description field se bhi (drawer / purana mapping)', () => {
    expect(billDetailText(bill({ description: 'Brick' }))).toBe('Brick');
  });

  test('har bill-type: material / site / subcon (dono naam ke roop me)', () => {
    for (const t of ['material_purchase', 'site_expense', 'subcon_expense', 'Material Purchase', 'Site Expense', 'Sub-Con Expense']) {
      expect(billDetailText(bill({ txnType: t, sub: 'Murum' }))).toBe('Murum');
    }
    expect(billDetailText({ type: 'Material Purchase', sub: 'Murum' })).toBe('Murum');
  });

  test('line items hon to "" (items hi byora hain)', () => {
    expect(billDetailText(bill({ sub: 'Cement', items: [{ item_name: 'Cement', qty: 30 }] }))).toBe('');
    expect(billDetailText(bill({ sub: 'Cement', items: null, line_items: [{ item_name: 'Cement' }] }))).toBe('');
  });

  test('Note likha ho to "" (Note hi dikhta hai)', () => {
    expect(billDetailText(bill({ sub: 'Cement', note: 'TMT' }))).toBe('');
  });

  test('auto-text ("Type — Party") kabhi nahi', () => {
    expect(billDetailText(bill({ sub: 'Material Purchase — Mahadev Febrication' }))).toBe('');
    expect(billDetailText(bill({ sub: 'Material Purchase — Mahadev — Site A' }))).toBe('');
  });

  test('bill nahi (payment / receipt / trip bill) → ""', () => {
    expect(billDetailText({ txnType: 'payment', sub: 'Cash diya', items: [] })).toBe('');
    expect(billDetailText({ txnType: 'party_payment', sub: 'Advance' })).toBe('');
    expect(billDetailText(bill({ sub: 'Trip', tripBillId: 5 }))).toBe('');
  });

  test('khaali / null', () => {
    expect(billDetailText(null)).toBe('');
    expect(billDetailText(bill({}))).toBe('');
    expect(billDetailText(bill({ sub: '   ' }))).toBe('');
  });
});
