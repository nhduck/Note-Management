import { useEffect } from "react";
import { getQueue, clearQueue } from "../utils/offlineQueue";

export function useOfflineSync(onSyncDone) {
  useEffect(() => {

    const handleOnline = async () => {
      const queue = getQueue();
      if (queue.length === 0) return;

      // Read token directly from localStorage — independent of profile state
      const token = localStorage.getItem("token") || "";
      if (!token) return; // skip if the user is not logged in

      let allOk = true;

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
          if (!res.ok) { allOk = false; break; }
        } catch {
          allOk = false;
          break;
        }
      }

      if (allOk) {
        clearQueue();
        // Wait 300ms for the server to finish processing before calling fetchNotes
        setTimeout(() => onSyncDone?.(), 300);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);

  }, [onSyncDone]);
}