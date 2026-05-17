import { useState, useEffect, useCallback } from "react";
import { addToQueue, isOnline } from "../utils/offlineQueue";
import { useOfflineSync } from "./useOfflineSync";


// Helper functions to retrieve token and set headers for authenticated API configurations
const getToken = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export function useNotesLogic() {
  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [activeLabel, setActiveLabel] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeNote, setActiveNote] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ── Authentication Check ──
  // Reads client identity profiles from storage on initialization; redirects on absence
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setProfile(JSON.parse(savedUser));
    else window.location.href = "/";
  }, []);

  // ── Remote Data Synchronization ──
  const fetchNotes = useCallback(async () => {
    if (!profile) return;
    try {
      const url = activeLabel
        ? `/api/notes?userId=${profile.id}&labelId=${activeLabel._id}`
        : `/api/notes?userId=${profile.id}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setNotes(data.notes);
    } catch (err) { console.error("Error fetching notes:", err); }
  }, [profile, activeLabel]);

  useOfflineSync(fetchNotes);

  const fetchLabels = useCallback(async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/labels?userId=${profile.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setLabels(data.labels);
    } catch (err) { console.error("Error fetching labels:", err); }
  }, [profile]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  // ── Search Input Debouncing ──
  // Regulates expensive execution sequences by introducing a 300ms execution buffer delay
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // ── Automated Note Auto-save ──
  useEffect(() => {
<<<<<<< Updated upstream
  if (!activeNote || (!activeNote.title && !activeNote.content)) return;
  setSaveStatus("saving");

  const t = setTimeout(async () => {
    const payload = {
      noteId: activeNote._id,
      title: activeNote.title,
      content: activeNote.content,
      userId: profile.id,
    };

    // Offline -> save to queue, skip fetch
    if (!isOnline()) {
      addToQueue({ payload });
      setSaveStatus("saved");
      return;
    }

    // Online -> send to server as normal
    try {
      const res = await fetch("/api/notes/save", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSaveStatus("saved");
      fetchNotes();
    } catch {
      // Fetch failed -> also save to queue
      addToQueue({ payload });
      setSaveStatus("saved");
    }
  }, 1000);

  return () => clearTimeout(t);
}, [activeNote, fetchNotes]);
=======
    if (!activeNote || (!activeNote.title && !activeNote.content)) return;
    setSaveStatus("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/notes/save", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            noteId: activeNote._id,
            title: activeNote.title,
            content: activeNote.content,
            images: activeNote.images || [],
            labels: (activeNote.labels || []).map(l => l._id || l),
            userId: profile.id,
            color: activeNote.color || null,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (!activeNote._id) {
            setActiveNote(prev => ({ ...prev, _id: data.note._id }));
          }
          setSaveStatus("saved");
          fetchNotes();
        } else {
          setSaveStatus("idle");
        }
      } catch { setSaveStatus("idle"); }
    }, 1000);
    return () => clearTimeout(t);
  }, [activeNote, fetchNotes]);
>>>>>>> Stashed changes

  // ── Event Handlers ──
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) fetchNotes();
    } catch { alert("Deletion failed!"); }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("images", f));
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setActiveNote(prev => ({ ...prev, images: [...(prev.images || []), ...data.urls] }));
        setSaveStatus("saving");
      } else {
        alert("Image upload failed.");
      }
    } catch (err) { alert("Network connection error while uploading images."); } 
    finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (idx) => {
    setActiveNote(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
    setSaveStatus("saving");
  };

  const handleTogglePin = async (e, noteId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notes/${noteId}/pin`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) await fetchNotes();
    } catch (err) { console.error("Error toggling pin status:", err); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("images", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.urls.length > 0) {
        const avatarUrl = data.urls[0];
        await fetch(`/api/users/${profile.id}/avatar`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ avatarUrl }),
        });
        const updatedProfile = { ...profile, avatarUrl };
        setProfile(updatedProfile);
        localStorage.setItem("user", JSON.stringify(updatedProfile));
      }
    } catch (err) { alert("Error updating avatar image."); } 
    finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* ignore */ }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleToggleLabelOnNote = async (label) => {
    if (!activeNote?._id) return;
    const currentIds = (activeNote.labels || []).map(l => l._id || l);
    const action = currentIds.includes(label._id) ? "detach" : "attach";
    try {
      const res = await fetch(`/api/notes/${activeNote._id}/labels`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ labelId: label._id, action }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveNote(prev => ({ ...prev, labels: data.labels }));
        fetchNotes();
      }
    } catch (err) { console.error("Error toggling note label assignment:", err); }
  };

  // ── Reactive Memory Filter Stream ──
  // Checks criteria to return subset elements filtered dynamically via query tags
  const filteredNotes = debouncedSearch.trim()
    ? notes.filter(n => {
        const q = debouncedSearch.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      })
    : notes;

  return {
    notes, labels, activeLabel, setActiveLabel,
    searchTerm, setSearchTerm, debouncedSearch,
    activeNote, setActiveNote,
    profile, saveStatus, setSaveStatus, setProfile,
    uploading, uploadingAvatar,
    fetchNotes, fetchLabels,
    handleDelete, handleImageUpload, handleRemoveImage,
    handleTogglePin, handleAvatarChange, handleLogout, handleToggleLabelOnNote,
    filteredNotes
  };
}