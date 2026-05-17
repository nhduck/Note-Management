import { useEffect } from "react";
import { getQueue, clearQueue } from "../utils/offlineQueue";

export function useOfflineSync(onSyncDone) {
  useEffect(() => {

    const handleOnline = async () => {
      const queue = getQueue();
      if (queue.length === 0) return; // Nothing to sync

      const token = localStorage.getItem("token") || "";
      let allOk = true;

      // Send each note in the queue
      for (const action of queue) {
        try {
          const res = await fetch("/api/notes/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(action.payload),
          });
          if (!res.ok) allOk = false;
        } catch {
          allOk = false;
          break; // Weak network → stop and try again later
        }
      }

      if (allOk) {
        clearQueue();       // Clear the queue
        onSyncDone?.();     // Call fetchNotes() to reload data
      }
    };

    // Register event listeners
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);

  }, [onSyncDone]);
}