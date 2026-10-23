// ════════════════════════════════════════════════════════════════
// Site par abhi kitna — store issue form ke liye (24 Oct 2026, Prafull D5)
//
// Store incharge jis site ke liye issue kar raha hai, usi material ki us
// site par abhi ki haalat: pada hua (Project → Material → Inventory jaisa),
// store se raste me (issue hua, receive baaki), aur usme se kisi ki
// zimmedari me. Server: GET /warehouse/project-stock (gb-backend).
// ════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import api from "../config/api";
import { T } from "../modules/shared/tokens";
import { t } from "../i18n";

// Minus bhi dikhe (site par zyada kharch likha ho) — fmtN abs leta hai.
const num = (n) => (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const keyOf = (s) => String(s == null ? "" : s).trim().toLowerCase();

// projectId + material ke naam → Map(key → { balance, unit, on_way, in_custody, known })
export function useSiteStock(projectId, names) {
  const list = [...new Set((names || []).map((n) => String(n || "").trim()).filter(Boolean))];
  const sig = projectId + "|" + list.map(keyOf).sort().join("|");
  const [data, setData] = useState(new Map());
  useEffect(() => {
    let live = true;
    if (!projectId || !list.length) { setData(new Map()); return undefined; }
    const tm = setTimeout(() => {
      api.get(`/warehouse/project-stock?project_id=${projectId}&names=${encodeURIComponent(list.join("|"))}`)
        .then((r) => { if (live && r && r.success) setData(new Map((r.data || []).map((d) => [keyOf(d.name), d]))); })
        .catch(() => {});
    }, 250);
    return () => { live = false; clearTimeout(tm); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return data;
}

export default function SiteStockLine({ info, unit, style }) {
  if (!info) return null;
  const u = info.unit || unit || "";
  return (
    <div style={{ fontSize: 10.5, color: T.t3, margin: "2px 0 6px", ...style }}>
      📍 {info.known || info.on_way > 0
        ? <>
            {t("site_stock.now", { n: num(info.balance), unit: u })}
            {info.on_way > 0 && <span style={{ color: T.blu }}>{t("site_stock.on_way", { n: num(info.on_way), unit: u })}</span>}
            {info.in_custody > 0 && <span style={{ color: T.amb }}>{t("site_stock.in_custody", { n: num(info.in_custody), unit: u })}</span>}
          </>
        : t("site_stock.none")}
    </div>
  );
}

export { keyOf as siteStockKey };
