import { useEffect } from "react";
import { getQueue, removeFromQueue, clearQueue, setSyncing } from "../utils/offlineQueue";

export function useOfflineSync(onSyncDone, onSyncItem) {
  useEffect(() => {

    const handleOnline = async () => {
      // Delay: "online" event fires before network is truly ready
      await new Promise((r) => setTimeout(r, 600));

      const queue = getQueue();
      if (queue.length === 0) return;

      const token = localStorage.getItem("token") || "";
      if (!token) return;

      // Lock: tell autosave NOT to send anything while we're syncing
      setSyncing(true);

      let allOk = true;

      try {
        for (const action of queue) {
          const payload = {
            ...action.payload,
            // Belt-and-suspenders: never send a temp_ id to server
            noteId: typeof action.payload.noteId === "string" &&
                    action.payload.noteId.startsWith("temp_")
              ? null
              : (action.payload.noteId || null),
          };

          try {
            const res = await fetch("/api/notes/save", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              console.error("[offlineSync] save failed:", res.status);
              allOk = false;
              break;
            }

            // Notify parent so it can update activeNote._id to the real server ID
            try {
              const data = await res.json();
              if (data?.note) {
                onSyncItem?.({ tempId: action.tempId, note: data.note });
              }
            } catch { /* non-critical — ignore parse errors */ }

            removeFromQueue(action.tempId);
          } catch (err) {
            console.error("[offlineSync] network error:", err);
            allOk = false;
            break;
          }
        }
      } finally {
        // Always release the lock
        setSyncing(false);
      }

      if (allOk) {
        clearQueue();
        // Single fetchNotes call after all items synced
        setTimeout(() => onSyncDone?.(), 300);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);

  }, [onSyncDone, onSyncItem]);
}