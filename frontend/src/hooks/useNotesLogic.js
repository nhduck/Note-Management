import { useState, useEffect, useRef, useCallback } from "react";
import { upsertQueue, isInQueue, isOnline, isSyncing } from "../utils/offlineQueue";
import { useOfflineSync } from "./useOfflineSync";
import { getSocket, joinUserRoom } from "./useSocket";
import { useNotesAPI } from "./useNotesAPI";
import { useNotesActions } from "./useNotesActions";

export function useNotesLogic() {
  const [notes, setNotes]             = useState([]);
  const [labels, setLabels]           = useState([]);
  const [activeLabel, setActiveLabel] = useState(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeNote, setActiveNote]   = useState(null);
  const [profile, setProfile]         = useState(null);
  const [saveStatus, setSaveStatus]   = useState("idle");

  // tempId of the current offline note in the queue
  const offlineTempIdRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setProfile(JSON.parse(savedUser));
    else window.location.href = "/";
  }, []);

  useEffect(() => {
    if (!profile) return;
    joinUserRoom(profile.id);
  }, [profile]);

  const { fetchNotes, fetchLabels } = useNotesAPI(profile, setNotes, setLabels, activeLabel);

  // Called by useOfflineSync after each note is successfully synced.
  const handleSyncItem = useCallback(({ tempId, note }) => {
    if (offlineTempIdRef.current === tempId) {
      offlineTempIdRef.current = null;
      if (note?._id) {
        setActiveNote((prev) => (prev ? { ...prev, _id: note._id } : prev));
        // Also replace the temp note in the list with the real one
        setNotes((prev) =>
          prev.map((n) => (n._id === `temp_${tempId}` ? { ...n, _id: note._id } : n))
        );
      }
    }
  }, []);

  // useOfflineSync handles the sync and calls fetchNotes once when done
  useOfflineSync(fetchNotes, handleSyncItem);

  useEffect(() => { fetchNotes();  }, [fetchNotes]);
  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  // Socket: refresh list on remote changes, but NOT when we caused the change
  useEffect(() => {
    if (!profile) return;
    const socket = getSocket();
    const refresh = () => {
      // Skip while offline sync is running (useOfflineSync will call fetchNotes itself)
      if (isSyncing()) return;
      fetchNotes();
    };
    socket.on("note-updated", refresh);
    socket.on("note-created", refresh);
    socket.on("note-deleted", refresh);
    return () => {
      socket.off("note-updated", refresh);
      socket.off("note-created", refresh);
      socket.off("note-deleted", refresh);
    };
  }, [profile, fetchNotes]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ─── Auto-save ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeNote || (!activeNote.title && !activeNote.content)) return;
    setSaveStatus("saving");

    const timer = setTimeout(async () => {

      // If offline sync is running right now, skip — sync will handle it
      if (isSyncing()) {
        setSaveStatus("saved");
        return;
      }

      const realNoteId =
        activeNote._id && !activeNote._id.startsWith("temp_")
          ? activeNote._id
          : null;

      const payload = {
        noteId:  realNoteId,
        title:   activeNote.title,
        content: activeNote.content,
        images:  activeNote.images || [],
        labels:  (activeNote.labels || []).map((l) => l._id || l),
        userId:  profile.id,
        color:   activeNote.color || null,
      };

      // ── OFFLINE ───────────────────────────────────────────────────────────────
      if (!isOnline()) {
        const tempId = upsertQueue(payload, offlineTempIdRef.current);
        offlineTempIdRef.current = tempId;
        setSaveStatus("saved");

        if (!activeNote._id) {
          // New note: show optimistically
          const tempNote = {
            ...payload,
            _id: `temp_${tempId}`,
            isPinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setActiveNote((prev) => ({ ...prev, _id: tempNote._id }));
          setNotes((prev) => [tempNote, ...prev]);
        } else {
          setNotes((prev) =>
            prev.map((n) =>
              n._id === activeNote._id
                ? { ...n, title: payload.title, content: payload.content, updatedAt: new Date().toISOString() }
                : n
            )
          );
        }
        return;
      }

      // ── ONLINE — but this note is still pending in the offline queue ──────────
      // useOfflineSync will take care of it when the "online" event fires.
      if (offlineTempIdRef.current && isInQueue(offlineTempIdRef.current)) {
        setSaveStatus("saved");
        return;
      }

      // ── ONLINE — normal save ──────────────────────────────────────────────────
      offlineTempIdRef.current = null;

      try {
        const res = await fetch("/api/notes/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          if (!realNoteId && data.note?._id) {
            setActiveNote((prev) => ({ ...prev, _id: data.note._id }));
          }
          setSaveStatus("saved");
          await fetchNotes();
        } else {
          setSaveStatus("idle");
        }
      } catch {
        // Network dropped mid-request — queue it
        const tempId = upsertQueue(payload, offlineTempIdRef.current);
        offlineTempIdRef.current = tempId;
        setSaveStatus("saved");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeNote, fetchNotes, setNotes]);

  // Reset tempId tracking when user switches to a different note.
  // IMPORTANT: Do NOT reset when _id is set to a "temp_" value — that means
  // we just assigned it ourselves (offline optimistic update), NOT a note switch.
  // Clearing the ref in that case causes autosave to enqueue the same note twice → duplicate.
  useEffect(() => {
    if (activeNote?._id?.startsWith("temp_")) return;
    offlineTempIdRef.current = null;
  }, [activeNote?._id]);

  const actions = useNotesActions(profile, setProfile, activeNote, setActiveNote, setSaveStatus, fetchNotes);

  const filteredNotes = debouncedSearch.trim()
    ? notes.filter((n) => {
        const q = debouncedSearch.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      })
    : notes;

  return {
    notes, labels, activeLabel, setActiveLabel,
    searchTerm, setSearchTerm, debouncedSearch,
    activeNote, setActiveNote,
    profile, saveStatus, setSaveStatus, setProfile,
    fetchNotes, fetchLabels,
    filteredNotes,
    ...actions,
  };
}