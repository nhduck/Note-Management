const QUEUE_KEY = "offline_queue";

// Get the entire queue
export function getQueue() {
  const raw = localStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Add a note/action to the queue
export function addToQueue(action) {
  const queue = getQueue();
  queue.push({ ...action, id: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// Clear the queue after synchronization is complete
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// Check network connection status
export function isOnline() {
  return navigator.onLine; // true / false
}