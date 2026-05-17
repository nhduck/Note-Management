const QUEUE_KEY  = "offline_queue";
const SYNCING_KEY = "offline_syncing"; // flag: sync đang chạy, autosave không được gửi

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ─── Sync-lock helpers ────────────────────────────────────────────────────────

export function setSyncing(val) {
  if (val) localStorage.setItem(SYNCING_KEY, "1");
  else     localStorage.removeItem(SYNCING_KEY);
}

export function isSyncing() {
  return localStorage.getItem(SYNCING_KEY) === "1";
}

// ─── Queue operations ─────────────────────────────────────────────────────────
export function upsertQueue(payload, existingTempId = null) {
  const queue = getQueue();

  const cleanPayload = {
    ...payload,
    noteId: typeof payload.noteId === "string" && payload.noteId.startsWith("temp_")
      ? null
      : (payload.noteId || null),
  };

  if (existingTempId) {
    const idx = queue.findIndex((item) => item.tempId === existingTempId);
    if (idx !== -1) {
      queue[idx] = { ...queue[idx], payload: cleanPayload };
      saveQueue(queue);
      return existingTempId;
    }
  }

  const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  queue.push({ payload: cleanPayload, tempId });
  saveQueue(queue);
  return tempId;
}

// Check if a given tempId exists in the queue
export function isInQueue(tempId) {
  if (!tempId) return false;
  return getQueue().some((item) => item.tempId === tempId);
}

export function removeFromQueue(tempId) {
  saveQueue(getQueue().filter((item) => item.tempId !== tempId));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function isOnline() {
  return navigator.onLine;
}