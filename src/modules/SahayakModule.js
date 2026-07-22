import { useState, useEffect, useRef, useCallback } from "react";
import api, { getUser } from "../config/api";
import { getDiagBundle } from "../utils/diag";
import { T } from "./shared/tokens";

// ── ICONS (SVG only, no emoji) ──────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcSend = (p) => <Ic {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />;
const IcMic = (p) => <Ic {...p} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />;
const IcBot = (p) => <Ic {...p} d="M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M9 13v2M15 13v2" />;
const IcTicket = (p) => <Ic {...p} d="M3 7h18v4a2 2 0 000 4v3H3v-3a2 2 0 000-4V7zM13 7v14" />;
const IcUp = (p) => <Ic {...p} d="M7 22V11l5-9a2 2 0 012 2v5h5a2 2 0 012 2.4l-1.6 8A2 2 0 0119 21H7zM7 22H4a1 1 0 01-1-1v-9a1 1 0 011-1h3" />;
const IcDown = (p) => <Ic {...p} d="M17 2v11l-5 9a2 2 0 01-2-2v-5H5a2 2 0 01-2-2.4l1.6-8A2 2 0 016.6 3H17zM17 2h3a1 1 0 011 1v9a1 1 0 01-1 1h-3" />;
const IcShield = (p) => <Ic {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcCheck = (p) => <Ic {...p} d="M20 6L9 17l-5-5" />;
const IcImage = (p) => <Ic {...p} d="M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6" />;
const IcChevron = (p) => <Ic {...p} d="M9 18l6-6-6-6" />;

// The app-wide fetch timeout is 15s, which is too short for an LLM reply
// (and for voice: STT + LLM). Sahayak asks for 60s on its own calls only.
const CHAT_TIMEOUT_MS = 60000;

const ACCENT = T.blu;          // repo token — sober indigo/blue accent
const ACCENT_SOFT = T.bluL;

// Roman Hinglish labels
const L = {
  title: "Sanchalan Sahayak",
  subtitle: "App ke baare me kuch bhi poochein",
  placeholder: "Apna sawal likhein...",
  thinking: "soch raha hu...",
  recording: "Sun raha hu... chhodne par bhej dunga",
  transcribing: "Aapki awaaz samajh raha hu...",
  micHint: "Bolne ke liye daba ke rakhein",
  welcome: "Namaste! Main Sanchalan Sahayak hoon. App chalane me koi bhi dikkat ho — attendance, project, finance, material, salary — mujhse poochein. Main aapki bhasha me madad karunga.",
  errGeneric: "Kuch gadbad ho gayi — dobara try karein.",
  micUnsupported: "Is browser me recording support nahi — kripya likh kar bhejein.",
  micDenied: "Mic ki permission chahiye — allow karke dobara try karein.",
  // Diagnostic consent
  consentTitle: "Screen ki jaankari team ko bhejein?",
  consentBody: "App me abhi kya error aaye — team ko bhej dein to dikkat jaldi pakdi jayegi. Aapka data ya password kabhi nahi jata.",
  consentYes: "Haan, bhej do",
  consentNo: "Nahi",
  consentShot: "Screenshot jodein",
  consentSending: "Bhej raha hu...",
  consentFail: "Bundle bhej nahi paya — baad me try karein.",
  shotTooBig: "Screenshot 5MB se bada hai.",
  // Feedback
  fbDownAsk: "Kya galat tha?",
  fbSubmit: "Bhejein",
  fbThanks: "Dhanyavaad",
  // Tickets inbox
  tabChat: "Chat",
  tabTickets: "Tickets",
  ticketsEmpty: "Koi ticket nahi.",
  resolvePlaceholder: "Kya kiya / kya jawab diya...",
  resolveBtn: "Resolve karein",
};

export default function SahayakModule() {
  const user = getUser();
  const isAdmin = ["admin", "super_admin"].includes(user?.role);
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([]); // {id, role:'user'|'bot', text, transcript?, ticket?, messageId?, bugSuspect?}
  // messageId -> 'up' | 'down'. Session-only: /history does not return votes,
  // and an extra join per open is not worth it for a purely cosmetic fill.
  const [votes, setVotes] = useState({});
  // ticket_no -> 'sent' | 'dismissed', so a consent card is answered once.
  const [bundles, setBundles] = useState({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [err, setErr] = useState("");
  const scrollRef = useRef(null);
  const mrRef = useRef(null), chunksRef = useRef([]), streamRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
  }, []);

  // Load history on open.
  useEffect(() => {
    api.get("/support-bot/history?limit=100").then((r) => {
      if (r && r.success && Array.isArray(r.data) && r.data.length) {
        const hist = r.data.map((m) => ({
          id: "h" + m.id,
          role: m.direction === "in" ? "user" : "bot",
          text: m.content || m.transcript || "",
          transcript: m.msg_type === "audio" ? (m.transcript || null) : null,
          // bot_messages.id — what a thumbs vote is recorded against.
          messageId: m.direction === "out" ? m.id : null,
        }));
        setMessages(hist);
      } else {
        setMessages([{ id: "welcome", role: "bot", text: L.welcome }]);
      }
      scrollToEnd();
    }).catch(() => {
      setMessages([{ id: "welcome", role: "bot", text: L.welcome }]);
    });
    return () => { try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (_) {} };
  }, [scrollToEnd]);

  useEffect(scrollToEnd, [messages, sending, transcribing, scrollToEnd]);

  const pushMessage = (m) => setMessages((prev) => [...prev, { id: "m" + Date.now() + Math.random(), ...m }]);

  // ── send text ──
  const sendText = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setErr("");
    setInput("");
    pushMessage({ role: "user", text });
    setSending(true);
    try {
      // LLM answers routinely take longer than the app-wide 15s default.
      const r = await api.post("/support-bot/chat", { text }, { timeoutMs: CHAT_TIMEOUT_MS });
      if (r && r.success) {
        pushMessage({ role: "bot", text: r.reply, ticket: r.ticket_no || null, messageId: r.message_id || null, bugSuspect: !!r.bug_suspect });
      } else {
        pushMessage({ role: "bot", text: (r && r.message) || L.errGeneric });
      }
    } catch (e) {
      pushMessage({ role: "bot", text: L.errGeneric });
    }
    setSending(false);
  };

  // ── audio: hold-to-record (mirrors MOM's MediaRecorder → base64 flow) ──
  const blobToB64 = (blob) => new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = rej; fr.onloadend = () => res(fr.result); fr.readAsDataURL(blob); });

  const startRec = async () => {
    setErr("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { setErr(L.micUnsupported); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => { try { return window.MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || "";
      const mr = mime ? new window.MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 }) : new window.MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = onRecStop;
      mrRef.current = mr; mr.start();
      setRecording(true);
    } catch (e) {
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (_) {}
      setErr(L.micDenied);
    }
  };

  const stopRec = () => {
    try { if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop(); } catch (e) {}
    setRecording(false);
  };

  const onRecStop = async () => {
    const blob = new Blob(chunksRef.current, { type: (mrRef.current && mrRef.current.mimeType) || "audio/webm" });
    chunksRef.current = [];
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) {}
    streamRef.current = null;
    if (!blob.size) { setErr("Recording khali rahi — dobara try karein."); return; }
    setTranscribing(true);
    try {
      const b64 = await blobToB64(blob);
      // Voice = speech-to-text + LLM, so it needs the longer budget too.
      const r = await api.post("/support-bot/chat", { audio_base64: b64, mime_type: blob.type }, { timeoutMs: CHAT_TIMEOUT_MS });
      setTranscribing(false);
      if (r && r.success) {
        pushMessage({ role: "user", text: r.transcript || "(awaaz)", transcript: r.transcript || null });
        pushMessage({ role: "bot", text: r.reply, ticket: r.ticket_no || null, messageId: r.message_id || null, bugSuspect: !!r.bug_suspect });
      } else {
        setErr((r && r.message) || L.errGeneric);
      }
    } catch (e) {
      setTranscribing(false);
      setErr(L.errGeneric);
    }
  };

  const onKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } };

  // ── feedback ──
  // Optimistic: the vote fills immediately. A failed POST is not worth an
  // error strip in the user's face — the reply itself was still delivered.
  const sendVote = useCallback(async (messageId, rating, comment) => {
    if (!messageId) return;
    setVotes((p) => ({ ...p, [messageId]: rating }));
    try { await api.post("/support-bot/feedback", { message_id: messageId, rating, comment: comment || undefined }); } catch (_) {}
  }, []);

  // ── diagnostic bundle (consent only) ──
  const sendBundle = useCallback(async (ticketNo, shotB64, shotMime) => {
    const bundle = getDiagBundle();
    const r = await api.post("/support-bot/bundle", {
      ticket_no: ticketNo,
      meta: bundle,
      ...(shotB64 ? { screenshot_base64: shotB64, mime_type: shotMime } : {}),
    }, { timeoutMs: CHAT_TIMEOUT_MS });
    if (!r || !r.success) throw new Error((r && r.message) || "failed");
    return { errors: (bundle.errors || []).length, calls: (bundle.failed_calls || []).length };
  }, []);

  if (tab === "tickets" && isAdmin) {
    return (
      <Shell tab={tab} setTab={setTab} isAdmin={isAdmin}>
        <TicketsInbox />
      </Shell>
    );
  }

  return (
    <Shell tab={tab} setTab={setTab} isAdmin={isAdmin}>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: 12, background: T.bg }}>
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            m={m}
            vote={m.messageId ? votes[m.messageId] : undefined}
            onVote={sendVote}
            bundleState={m.ticket ? bundles[m.ticket] : undefined}
            onBundle={sendBundle}
            onBundleDone={(t, s) => setBundles((p) => ({ ...p, [t]: s }))}
          />
        ))}
        {(sending || transcribing) && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: "12px 12px 12px 3px", padding: "9px 13px" }}>
            <Dots />
            <span style={{ fontSize: 12.5, color: T.t3 }}>{transcribing ? L.transcribing : L.thinking}</span>
          </div>
        )}
      </div>

      {/* Error strip */}
      {err && (
        <div style={{ padding: "8px 18px", background: T.redL, borderTop: `1px solid ${T.redM}`, color: T.red, fontSize: 12, flexShrink: 0 }}>{err}</div>
      )}

      {/* Input row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "12px 14px", borderTop: `1px solid ${T.b1}`, background: T.surface, flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={recording ? L.recording : L.placeholder}
          rows={1}
          disabled={recording || transcribing}
          style={{ flex: 1, resize: "none", maxHeight: 120, minHeight: 40, padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${T.b1}`, fontSize: 13.5, color: T.t1, background: recording ? T.sltL : T.surfaceB, outline: "none", fontFamily: "inherit", lineHeight: 1.4 }}
          onFocus={(e) => (e.target.style.borderColor = ACCENT)}
          onBlur={(e) => (e.target.style.borderColor = T.b1)}
        />
        {/* Mic — hold to record */}
        <button
          title={L.micHint}
          onMouseDown={startRec} onMouseUp={stopRec} onMouseLeave={() => { if (recording) stopRec(); }}
          onTouchStart={(e) => { e.preventDefault(); startRec(); }} onTouchEnd={(e) => { e.preventDefault(); stopRec(); }}
          disabled={sending || transcribing}
          style={{ width: 42, height: 42, borderRadius: 10, border: "none", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: recording ? T.red : T.sltL, color: recording ? "#fff" : T.t2, transition: "all .15s", transform: recording ? "scale(1.06)" : "none" }}>
          <IcMic size={19} color="currentColor" />
        </button>
        {/* Send */}
        <button
          onClick={sendText}
          disabled={!input.trim() || sending || recording}
          style={{ width: 42, height: 42, borderRadius: 10, border: "none", flexShrink: 0, cursor: input.trim() && !sending ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", background: input.trim() && !sending ? ACCENT : T.b1, color: input.trim() && !sending ? "#fff" : T.t4, transition: "all .15s" }}>
          <IcSend size={18} color="currentColor" />
        </button>
      </div>
    </Shell>
  );
}

// ── Shell: header + (admin) Chat/Tickets tabs ──
function Shell({ tab, setTab, isAdmin, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 780, margin: "0 auto", background: T.surface, borderLeft: `1px solid ${T.b1}`, borderRight: `1px solid ${T.b1}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 18px", borderBottom: `1px solid ${T.b1}`, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IcBot size={19} color={ACCENT} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1, letterSpacing: "-0.2px" }}>{L.title}</div>
          <div style={{ fontSize: 11.5, color: T.t4 }}>{L.subtitle}</div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 2, background: T.sltL, borderRadius: 8, padding: 2 }}>
            {[["chat", L.tabChat], ["tickets", L.tabTickets]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ border: "none", cursor: "pointer", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  background: tab === id ? T.surface : "transparent", color: tab === id ? T.t1 : T.t3 }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Message bubble ──
function MessageBubble({ m, vote, onVote, bundleState, onBundle, onBundleDone }) {
  const isUser = m.role === "user";
  // Consent card only on an escalated reply the engine flagged as a bug, and
  // only until the user answers it once.
  const showConsent = !isUser && m.ticket && m.bugSuspect && !bundleState;
  return (
    <div style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "84%", display: "flex", flexDirection: "column", gap: 4 }}>
      {/* audio transcript quote (muted, above the user's own bubble text) */}
      {m.transcript && isUser && (
        <div style={{ fontSize: 11, color: T.t4, fontStyle: "italic", background: T.sltL, border: `1px solid ${T.b1}`, borderRadius: 8, padding: "5px 9px", alignSelf: "flex-end" }}>
          <span style={{ opacity: 0.7 }}>Aapne bola: </span>"{m.transcript}"
        </div>
      )}
      <div style={{
        background: isUser ? ACCENT : T.surface,
        color: isUser ? "#fff" : T.t1,
        border: isUser ? "none" : `1px solid ${T.b1}`,
        borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
        padding: "10px 14px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {m.ticket ? renderWithTicket(m.text) : m.text}
      </div>

      {/* thumbs — bot replies only, and only once the reply has a db id */}
      {!isUser && m.messageId && <Thumbs vote={vote} onVote={(r, c) => onVote(m.messageId, r, c)} />}

      {showConsent && <ConsentCard ticket={m.ticket} onBundle={onBundle} onDone={onBundleDone} />}
      {!isUser && bundleState && bundleState !== "dismissed" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.grn, background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 8, padding: "6px 10px" }}>
          <IcCheck size={13} color={T.grn} />
          <span>{bundleState}</span>
        </div>
      )}
    </div>
  );
}

// ── Thumbs up / down ──
// Muted until used; a down-vote opens one optional line asking what was wrong.
function Thumbs({ vote, onVote }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const btn = (active) => ({
    border: "none", background: "transparent", cursor: "pointer", padding: 3, lineHeight: 0,
    borderRadius: 5, color: active ? ACCENT : T.t4, opacity: active ? 1 : 0.55,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button title="Sahi jawab" style={btn(vote === "up")} onClick={() => { onVote("up"); setAsking(false); }}>
          <IcUp size={14} color="currentColor" fill={vote === "up" ? ACCENT : "none"} />
        </button>
        <button title="Galat jawab" style={btn(vote === "down")} onClick={() => { onVote("down"); setAsking(true); }}>
          <IcDown size={14} color="currentColor" fill={vote === "down" ? ACCENT : "none"} />
        </button>
        {done && <span style={{ fontSize: 11, color: T.t4, marginLeft: 4 }}>{L.fbThanks}</span>}
      </div>
      {asking && !done && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            value={note} onChange={(e) => setNote(e.target.value)} placeholder={L.fbDownAsk} maxLength={300}
            onKeyDown={(e) => { if (e.key === "Enter") { onVote("down", note.trim()); setDone(true); setAsking(false); } }}
            style={{ flex: 1, minWidth: 0, padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.b1}`, fontSize: 12, color: T.t1, background: T.surfaceB, outline: "none", fontFamily: "inherit" }}
          />
          <button
            onClick={() => { onVote("down", note.trim()); setDone(true); setAsking(false); }}
            style={{ border: "none", cursor: "pointer", borderRadius: 7, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", background: T.sltL, color: T.t2 }}>
            {L.fbSubmit}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Diagnostic consent card ──
// The ONLY path that ever transmits diagnostics. Rendered on a bug-suspect
// escalation; nothing leaves the browser until "Haan, bhej do" is tapped.
function ConsentCard({ ticket, onBundle, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shot, setShot] = useState(null); // { b64, mime, name }
  const fileRef = useRef(null);

  const pickShot = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return;
    if (f.size > 5 * 1024 * 1024) { setErr(L.shotTooBig); return; }
    const fr = new FileReader();
    fr.onload = () => setShot({ b64: fr.result, mime: f.type, name: f.name });
    fr.readAsDataURL(f);
  };

  const yes = async () => {
    setBusy(true); setErr("");
    try {
      const c = await onBundle(ticket, shot?.b64, shot?.mime);
      onDone(ticket, `Diagnostic bundle Ticket #${ticket} se jud gaya — errors: ${c.errors}, failed calls: ${c.calls}`);
    } catch (_) {
      setErr(L.consentFail);
      setBusy(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${T.b1}`, background: T.surfaceB, borderRadius: 10, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <IcShield size={14} color={T.slt} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{L.consentTitle}</span>
      </div>
      <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.5 }}>{L.consentBody}</div>

      {shot && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.t3 }}>
          <IcImage size={12} color={T.t4} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shot.name}</span>
        </div>
      )}
      {err && <div style={{ fontSize: 11, color: T.red }}>{err}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        <button onClick={yes} disabled={busy}
          style={{ border: "none", cursor: busy ? "default" : "pointer", borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: busy ? T.b1 : ACCENT, color: busy ? T.t4 : "#fff" }}>
          {busy ? L.consentSending : L.consentYes}
        </button>
        <button onClick={() => onDone(ticket, "dismissed")} disabled={busy}
          style={{ border: `1px solid ${T.b1}`, cursor: "pointer", borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: T.surface, color: T.t2 }}>
          {L.consentNo}
        </button>
        <button onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 11.5, color: T.t3, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, padding: "7px 4px" }}>
          <IcImage size={13} color={T.t4} />{L.consentShot}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickShot} style={{ display: "none" }} />
      </div>
    </div>
  );
}

// ── Admin ticket inbox ──
// Reuses the M1 endpoints: GET /escalations?status= and POST
// /escalations/:id/resolve. Expanding a ticket shows the diagnostic bundle
// the user consented to send, if any.
function TicketsInbox() {
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (s) => {
    setRows(null);
    const r = await api.get(`/support-bot/escalations?status=${s}`);
    setRows(r && r.success && Array.isArray(r.data) ? r.data : []);
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  const resolve = async (id) => {
    setBusy(true);
    const r = await api.post(`/support-bot/escalations/${id}/resolve`, { resolution: note.trim() || undefined });
    setBusy(false);
    if (r && r.success) { setOpenId(null); setNote(""); load(status); }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      {/* status filter */}
      <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: `1px solid ${T.b1}`, background: T.surface, position: "sticky", top: 0, zIndex: 1 }}>
        {[["open", "Open"], ["resolved", "Resolved"]].map(([id, label]) => (
          <button key={id} onClick={() => { setStatus(id); setOpenId(null); }}
            style={{ border: `1px solid ${status === id ? ACCENT : T.b1}`, cursor: "pointer", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: status === id ? ACCENT_SOFT : T.surface, color: status === id ? ACCENT : T.t3 }}>
            {label}
          </button>
        ))}
      </div>

      {rows === null && <div style={{ padding: 18, fontSize: 12.5, color: T.t4 }}>Loading...</div>}
      {rows && !rows.length && <div style={{ padding: 18, fontSize: 12.5, color: T.t4 }}>{L.ticketsEmpty}</div>}

      {rows && rows.map((t) => {
        const isBug = t.type === "bug";
        const expanded = openId === t.id;
        return (
          <div key={t.id} style={{ borderBottom: `1px solid ${T.b1}`, background: T.surface }}>
            <button onClick={() => { setOpenId(expanded ? null : t.id); setNote(""); }}
              style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "inherit" }}>
              <span style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s", marginTop: 2, lineHeight: 0 }}>
                <IcChevron size={13} color={T.t4} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                  <Badge text={isBug ? "Bug" : "Sawaal"} color={isBug ? T.red : T.slt} bg={isBug ? T.redL : T.sltL} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{t.ticket_no}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{t.user_name || "—"}</span>
                  <span style={{ fontSize: 11, color: T.t4 }}>{fmtTime(t.created_at)}</span>
                  {t.bundle_meta && <Badge text="Diagnostics" color={ACCENT} bg={ACCENT_SOFT} />}
                </span>
                <span style={{ display: "block", fontSize: 12.5, color: T.t2, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expanded ? "normal" : "nowrap" }}>
                  {t.question || "—"}
                </span>
              </span>
            </button>

            {expanded && (
              <div style={{ padding: "0 16px 14px 39px", display: "flex", flexDirection: "column", gap: 10 }}>
                {t.reason && <div style={{ fontSize: 11.5, color: T.t3 }}>Reason: {t.reason}</div>}
                <BundleView meta={t.bundle_meta} url={t.bundle_url} />

                {t.status === "open" ? (
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={L.resolvePlaceholder}
                      style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 7, border: `1px solid ${T.b1}`, fontSize: 12, color: T.t1, background: T.surfaceB, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={() => resolve(t.id)} disabled={busy}
                      style={{ border: "none", cursor: busy ? "default" : "pointer", borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: busy ? T.b1 : T.grn, color: busy ? T.t4 : "#fff", flexShrink: 0 }}>
                      {L.resolveBtn}
                    </button>
                  </div>
                ) : (
                  t.resolution && <div style={{ fontSize: 11.5, color: T.t3, background: T.grnL, border: `1px solid ${T.grnM}`, borderRadius: 7, padding: "7px 10px" }}>{t.resolution}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Diagnostic bundle rendered as a readable list (it is stored as JSON text).
function BundleView({ meta, url }) {
  if (!meta && !url) return null;
  let d = null;
  if (meta) { try { d = typeof meta === "string" ? JSON.parse(meta) : meta; } catch (_) { d = null; } }

  const row = (label, value) => (
    <div style={{ display: "flex", gap: 8, fontSize: 11.5, lineHeight: 1.5 }}>
      <span style={{ color: T.t4, minWidth: 88, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.t2, wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ border: `1px solid ${T.b1}`, background: T.surfaceB, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t2 }}>Diagnostic bundle</div>
      {!d && meta && <div style={{ fontSize: 11, color: T.t4 }}>Bundle padha nahi ja saka.</div>}
      {d && (
        <>
          {row("App", `${d.app_version || "—"} · ${d.online === false ? "offline" : "online"}`)}
          {d.captured_at && row("Kab", fmtTime(d.captured_at))}
          {d.user_agent && row("Device", d.user_agent)}
          {row("Screens", (d.screens || []).map((s) => s.name).join(" → ") || "—")}
          <div>
            <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 3 }}>Failed calls ({(d.failed_calls || []).length})</div>
            {(d.failed_calls || []).map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: T.t2, fontFamily: "ui-monospace, monospace" }}>{c.status} {c.method} {c.path}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 3 }}>Errors ({(d.errors || []).length})</div>
            {(d.errors || []).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: T.t2, wordBreak: "break-word" }}>{e.msg}</div>
            ))}
          </div>
        </>
      )}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: ACCENT, textDecoration: "none" }}>
          <IcImage size={13} color={ACCENT} />Screenshot kholein
        </a>
      )}
    </div>
  );
}

function Badge({ text, color, bg }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, borderRadius: 5, padding: "2px 7px", letterSpacing: "0.2px" }}>{text}</span>;
}

function fmtTime(v) {
  if (!v) return "";
  try { return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch (_) { return String(v); }
}

// Subtly highlight the escalation ticket line inside a bot reply.
function renderWithTicket(text) {
  const idx = text.indexOf("Ticket #");
  if (idx === -1) return text;
  const lineStart = text.lastIndexOf("\n", idx);
  const head = text.slice(0, lineStart === -1 ? idx : lineStart);
  const ticketPart = text.slice(lineStart === -1 ? idx : lineStart + 1).trim();
  return (
    <>
      {head}
      <span style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 8, padding: "8px 10px", background: ACCENT_SOFT, borderRadius: 8, color: T.t2, fontSize: 12.5 }}>
        <IcTicket size={14} color={ACCENT} />
        <span>{ticketPart}</span>
      </span>
    </>
  );
}

// Typing dots.
function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.t4, animation: `sahayakBlink 1.2s ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes sahayakBlink{0%,60%,100%{opacity:.25}30%{opacity:1}}`}</style>
    </span>
  );
}
