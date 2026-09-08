// ── "Aaj" ki tareekh — APNI ghadi se, UTC se nahi ───────────────
// `new Date().toISOString().slice(0,10)` UTC ka din deta hai. India (UTC+5:30)
// me iska matlab: raat 12:00 se 5:30 ke beech wo KAL ki tareekh deta hai.
//
// Ye koi kitaabi baat nahi — prod me pakda gaya (2026-09-08): 7 Sept ko
// 00:26 aur 00:28 IST par likhi do qty-entry par `report_date` 2026-09-06
// chadh gaya tha. Wo kaam us din ke report aur MB draft dono se gayab tha.
//
// Aur `new Date(y, m, 1).toISOString()` to aur bhi peechhe le jaata hai:
// mahine ki 1 taareekh ka local aadhi-raat UTC me PICHHLE mahine ki aakhri
// taareekh hai — isliye "is mahine ka" period hamesha ek din pehle se shuru
// hota tha.
//
// Jahan bhi tareekh SERVER ko jaati hai (ya kisi period/filter me lagti hai),
// wahan yahi function use karo.

/** Kisi bhi Date ko uski APNI (local) tareekh me — "YYYY-MM-DD" */
export const isoDate = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  if (isNaN(x.getTime())) return "";
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Aaj — apni ghadi ke hisaab se */
export const todayISO = () => isoDate(new Date());

/** Is mahine ki pehli tareekh (string se banti hai, isliye khisakti nahi) */
export const monthStartISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-01";
};

/** N din pehle ka din */
export const daysAgoISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - Number(n || 0));
  return isoDate(d);
};

export default todayISO;
