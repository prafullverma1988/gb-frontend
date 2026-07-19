import { useState, useEffect, useRef, useCallback } from "react";
import api from "../config/api";
import { T } from "./shared/tokens";

// ── ICONS (SVG only, no emoji) ──────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcSend = (p) => <Ic {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />;
const IcMic = (p) => <Ic {...p} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />;
const IcBot = (p) => <Ic {...p} d="M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M9 13v2M15 13v2" />;
const IcTicket = (p) => <Ic {...p} d="M3 7h18v4a2 2 0 000 4v3H3v-3a2 2 0 000-4V7zM13 7v14" />;

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
};

export default function SahayakModule() {
  const [messages, setMessages] = useState([]); // {id, role:'user'|'bot', text, transcript?, ticket?}
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
        const hist = r.data.map((m, i) => ({
          id: "h" + m.id,
          role: m.direction === "in" ? "user" : "bot",
          text: m.content || m.transcript || "",
          transcript: m.msg_type === "audio" ? (m.transcript || null) : null,
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
      const r = await api.post("/support-bot/chat", { text });
      if (r && r.success) {
        pushMessage({ role: "bot", text: r.reply, ticket: r.ticket_no || null });
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
      const r = await api.post("/support-bot/chat", { audio_base64: b64, mime_type: blob.type });
      setTranscribing(false);
      if (r && r.success) {
        pushMessage({ role: "user", text: r.transcript || "(awaaz)", transcript: r.transcript || null });
        pushMessage({ role: "bot", text: r.reply, ticket: r.ticket_no || null });
      } else {
        setErr((r && r.message) || L.errGeneric);
      }
    } catch (e) {
      setTranscribing(false);
      setErr(L.errGeneric);
    }
  };

  const onKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 780, margin: "0 auto", background: T.surface, borderLeft: `1px solid ${T.b1}`, borderRight: `1px solid ${T.b1}` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 18px", borderBottom: `1px solid ${T.b1}`, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: ACCENT_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IcBot size={19} color={ACCENT} />
        </div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1, letterSpacing: "-0.2px" }}>{L.title}</div>
          <div style={{ fontSize: 11.5, color: T.t4 }}>{L.subtitle}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: 12, background: T.bg }}>
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
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
    </div>
  );
}

// ── Message bubble ──
function MessageBubble({ m }) {
  const isUser = m.role === "user";
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
    </div>
  );
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
