// ════════════════════════════════════════════════════════════════
// Cloudinary photo sizes (PHOTO-01)
// ----------------------------------------------------------------
// Ek 56px ka thumbnail bhi poori original photo (2–3.7 MB, kabhi 12 MP) khinch
// raha tha. Cloudinary URL me /upload/ ke baad ek transformation daal do to
// wahi photo chhoti + auto-compress (q_auto, f_auto) ban kar aati hai.
//
//   <img src={cld(url, "thumb")}/>   chhota tile / list           (~320 px)
//   <img src={cld(url, "tile")}/>    do-teen column ka grid       (~480 px)
//   <img src={cld(url, "card")}/>    feed card / poori chaudai    (~720 px)
//   <img src={cld(url, "view")}/>    poori screen ka viewer       (~1600 px)
//
// Sirf width par bandhte hain (c_limit): photo kabhi bada nahi hota (chhoti
// photo waise hi aati hai) aur crop wahi rehta hai jo CSS objectFit:cover
// pehle karta tha — dikhne wali framing badalti nahi.
//
// Jo Cloudinary ka image URL nahi hai (unsplash demo, blob:, data:, apna
// server, raw/video, PDF) use waise hi laut diya jaata hai. Kuch bhi ajeeb
// mile to original — photo kabhi rukti nahi.
//
// Ye file gb-frontend aur sanchalan-app dono me ek jaisi hai.
// ════════════════════════════════════════════════════════════════
export const CLD_PRESETS = {
  thumb: "w_320,c_limit,q_auto,f_auto",
  tile:  "w_480,c_limit,q_auto,f_auto",
  card:  "w_720,c_limit,q_auto,f_auto",
  view:  "w_1600,c_limit,q_auto,f_auto",
};

// /upload/ ke turant baad pehle se transformation ho (w_240,c_fill / q_auto ..)
// to use dobara nahi chhedte. Version (v1690000000) transformation nahi hai.
const HAS_TRANSFORM = /^\/(?:[a-z]{1,3}_[^/,]+)(?:,[a-z]{1,3}_[^/,]+)*\//;
const IMG_EXT = /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?|avif)$/i;

export function cld(url, preset = "thumb") {
  try {
    if (!url || typeof url !== "string") return url;
    const m = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)(\/.*)$/.exec(url);
    if (!m) return url;
    const rest = m[2];
    if (HAS_TRANSFORM.test(rest)) return url;
    if (!IMG_EXT.test(rest.split("?")[0].split("#")[0])) return url;
    const tr = CLD_PRESETS[preset] || preset;
    return m[1] + "/" + tr + rest;
  } catch (_) {
    return url;
  }
}

export default cld;
