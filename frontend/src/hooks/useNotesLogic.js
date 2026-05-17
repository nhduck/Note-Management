import { useState, useEffect, useCallback } from "react";
import { addToQueue, isOnline } from "../utils/offlineQueue";
import { useOfflineSync } from "./useOfflineSync";
import { getSocket, joinUserRoom } from "./useSocket";
import { useNotesAPI } from "./useNotesAPI";
import { useNotesActions } from "./useNotesActions";

export function useNotesLogic() {
  const [notes, setNotes]               = useState([]);
  const [labels, setLabels]             = useState([]);
  const [activeLabel, setActiveLabel]   = useState(null);
  const [searchTerm, setSearchTerm]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeNote, setActiveNote]     = useState(null);
  const [profile, setProfile]           = useState(null);
  const [saveStatus, setSaveStatus]     = useState("idle");

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

  useOfflineSync(fetchNotes);

  useEffect(() => { fetchNotes();  }, [fetchNotes]);
  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  useEffect(() => {
    if (!profile) return;
    const socket = getSocket();
    const refresh = () => fetchNotes();
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
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!activeNote || (!activeNote.title && !activeNote.content)) return;
    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      const payload = {
        noteId:  activeNote._id,
        title:   activeNote.title,
        content: activeNote.content,
        images:  activeNote.images  || [],
        labels:  (activeNote.labels || []).map((l) => l._id || l),
        userId:  profile.id,
        color:   activeNote.color   || null,
      };
      if (!isOnline()) {
        addToQueue({ payload });
        setSaveStatus("saved");
        return;
      }
      try {
        const res = await fetch("/api/notes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          if (!activeNote._id && data.note?._id) {
            setActiveNote((prev) => ({ ...prev, _id: data.note._id }));
          }
          setSaveStatus("saved");
          fetchNotes();
        } else {
          setSaveStatus("idle");
        }
      } catch {
        addToQueue({ payload });
        setSaveStatus("saved");
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeNote, fetchNotes]);

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
