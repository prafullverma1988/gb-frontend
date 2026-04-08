// ── BACKGROUND UPLOAD MANAGER ─────────────────────────────────────────
// WhatsApp-style: user selects file → modal closes → upload runs silently
// Shows floating toast with progress → success/fail notification
//
// Usage:
//   import uploadManager from "../utils/uploadManager";
//   uploadManager.add({ file, folder, onDone: (url) => api.post(...) });

const CLOUD_NAME = "dd632nqfm";
const PRESET     = "gb_buildcon_drawings";

let _listeners = [];
let _queue = [];    // { id, file, folder, status, pct, name, onDone, onError, error }
let _idCounter = 0;

function notify() {
  const snapshot = [..._queue];
  _listeners.forEach(fn => fn(snapshot));
}

function add({ file, folder = "gb_buildcon/uploads", onDone, onError, label }) {
  const id = ++_idCounter;
  const item = {
    id,
    name: label || file.name,
    file,
    folder,
    status: "queued",   // queued → uploading → done → error
    pct: 0,
    url: null,
    error: null,
    onDone,
    onError,
    startedAt: Date.now(),
  };
  _queue.push(item);
  notify();
  _processNext();
  return id;
}

// Max 2 concurrent uploads
function _activeCount() {
  return _queue.filter(q => q.status === "uploading").length;
}

function _processNext() {
  if (_activeCount() >= 2) return;
  const next = _queue.find(q => q.status === "queued");
  if (!next) return;
  _upload(next);
}

function _upload(item) {
  item.status = "uploading";
  item.pct = 2;
  notify();

  const fd = new FormData();
  fd.append("file", item.file);
  fd.append("upload_preset", PRESET);
  fd.append("folder", item.folder);

  const xhr = new XMLHttpRequest();

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      item.pct = Math.round((e.loaded / e.total) * 95);
      notify();
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      item.status = "done";
      item.pct = 100;
      item.url = data.secure_url;
      notify();
      // Callback — caller saves URL to DB
      if (item.onDone) {
        try { item.onDone(data.secure_url, data); } catch(e) { console.error("Upload onDone error:", e); }
      }
      // Auto-remove from queue after 4s
      setTimeout(() => { _remove(item.id); }, 4000);
    } else {
      let msg = "Upload failed";
      try { msg = JSON.parse(xhr.responseText)?.error?.message || msg; } catch(e) {}
      _fail(item, msg);
    }
    _processNext();
  };

  xhr.onerror = () => {
    _fail(item, "Network error — check internet");
    _processNext();
  };

  const isPDF = item.file.name.match(/\.(pdf|dwg|dxf|doc|docx|xls|xlsx)$/i);
  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${isPDF ? "raw" : "image"}/upload`);
  xhr.send(fd);

  // Store xhr so we can cancel
  item._xhr = xhr;
}

function _fail(item, msg) {
  item.status = "error";
  item.error = msg;
  notify();
  if (item.onError) {
    try { item.onError(msg); } catch(e) {}
  }
  // Auto-remove errors after 6s
  setTimeout(() => { _remove(item.id); }, 6000);
}

function _remove(id) {
  _queue = _queue.filter(q => q.id !== id);
  notify();
}

function cancel(id) {
  const item = _queue.find(q => q.id === id);
  if (item && item._xhr && item.status === "uploading") {
    item._xhr.abort();
  }
  _remove(id);
  _processNext();
}

function retry(id) {
  const item = _queue.find(q => q.id === id);
  if (item && item.status === "error") {
    item.status = "queued";
    item.pct = 0;
    item.error = null;
    notify();
    _processNext();
  }
}

function dismiss(id) {
  _remove(id);
}

// Subscribe to queue changes — returns unsubscribe fn
function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(f => f !== fn); };
}

function getQueue() {
  return [..._queue];
}

const uploadManager = { add, cancel, retry, dismiss, subscribe, getQueue };
export default uploadManager;
