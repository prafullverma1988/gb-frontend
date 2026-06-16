// ── COMPANY-WIDE SITE TRANSFERS TAB ───────────────────────────────
// Same company-wide material site-transfer experience as the Warehouse
// module's Transfers tab, packaged as a self-contained tab so other
// modules (e.g. Procurement) can let their team handle site transfers
// too. Reuses the Warehouse module's transfer list / new-transfer modal
// / detail drawer (single source of truth — no duplicated UI/logic).
//
// Backend: /warehouse/transfers (+ /:id/approve /:id/reject /:id/receive)
import { useState, useEffect, useCallback } from "react";
import api from "../config/api";
import { TransfersTab, NewTransferModal, TransferDetailDrawer } from "../modules/WarehouseModule";

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
  catch { return d; }
};

export default function CompanyTransfersTab() {
  // Admin/PM gate (mirrors WarehouseModule) — controls delete on the drawer.
  const meUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin", "super_admin", "project_manager"].includes((meUser?.role || "").toLowerCase());

  const [transfers, setTransfers] = useState([]);
  const [stock, setStock]         = useState([]);
  const [projects, setProjects]   = useState([]);
  const [newOpen, setNewOpen]     = useState(false);
  const [detail, setDetail]       = useState(null);

  const load = useCallback(() => {
    api.get("/warehouse/transfers").then(r => {
      if (r.success) setTransfers((r.data || []).map(t => ({
        ...t,
        from: t.from_project_name || t.from_location || "—",
        to:   t.to_project_name   || t.to_location   || "—",
        by:   t.transferred_by_name || "—",
        id:   t.transfer_no || `TRF-${t.id}`,
        dbId: t.id,
        date: fmtDate(t.date),
        items: t.items || [],
        total_value: Number(t.total_value) || 0,
      })));
    }).catch(() => {});
    api.get("/warehouse/materials").then(r => {
      if (r.success) setStock((r.data || []).map(m => ({
        ...m, qty: Number(m.qty) || 0, rate: Number(m.rate) || 0, category: m.category || "Other",
      })));
    }).catch(() => {});
    api.get("/projects").then(r => {
      if (r.success) setProjects((r.data || []).map(p => ({ id: p.id, name: p.name })));
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <TransfersTab transfers={transfers} onNew={() => setNewOpen(true)} onSelect={t => setDetail(t)} />
      {newOpen && (
        <NewTransferModal stock={stock} projects={projects}
          onClose={() => setNewOpen(false)} onSaved={() => { setNewOpen(false); load(); }} />
      )}
      {detail && (
        <TransferDetailDrawer transfer={detail} canDelete={isAdmin} canReceive={true}
          onClose={() => setDetail(null)}
          onDeleted={() => { setDetail(null); load(); }}
          onReceived={() => { setDetail(null); load(); }} />
      )}
    </div>
  );
}
