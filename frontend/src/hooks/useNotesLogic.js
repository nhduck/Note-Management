import { useState, useEffect, useCallback } from "react";
import { addToQueue, isOnline } from "../utils/offlineQueue";
import { useOfflineSync } from "./useOfflineSync";
import { getSocket, joinUserRoom } from "./useSocket";

// Read the JWT token stored on login
const getToken = () => localStorage.getItem("token") || "";

// Standard headers for authenticated JSON requests
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export function useNotesLogic() {
  const [notes, setNotes]               = useState([]);
  const [labels, setLabels]             = useState([]);
  const [activeLabel, setActiveLabel]   = useState(null);
  const [searchTerm, setSearchTerm]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeNote, setActiveNote]     = useState(null);
  const [profile, setProfile]           = useState(null);
  const [saveStatus, setSaveStatus]     = useState("idle"); // "idle" | "saving" | "saved"
  const [uploading, setUploading]       = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load user profile from localStorage on mount; redirect to login if missing
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setProfile(JSON.parse(savedUser));
    else window.location.href = "/";
  }, []);

  // Join the personal user room so this socket receives note-updated events
  // even when the editor is not open (e.g. viewing the home page note list).
  useEffect(() => {
    if (!profile) return;
    joinUserRoom(profile.id);
  }, [profile]);

  // Fetch the note list from the server
  const fetchNotes = useCallback(async () => {
    if (!profile) return;
    try {
      const url = activeLabel
        ? `/api/notes?userId=${profile.id}&labelId=${activeLabel._id}`
        : `/api/notes?userId=${profile.id}`;
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setNotes(data.notes);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  }, [profile, activeLabel]);

  useOfflineSync(fetchNotes);

  // Fetch label list
  const fetchLabels = useCallback(async () => {
    if (!profile) return;
    try {
      const res  = await fetch(`/api/labels?userId=${profile.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setLabels(data.labels);
    } catch (err) {
      console.error("Error fetching labels:", err);
    }
  }, [profile]);

  useEffect(() => { fetchNotes();  }, [fetchNotes]);
  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  // Refresh the note list whenever another user saves a shared note.
  // This keeps NoteCard previews on the home screen up to date in real time.
  useEffect(() => {
    if (!profile) return;

    const socket = getSocket();

    const handleNoteUpdated = () => {
      fetchNotes();
    };

    socket.on("note-updated", handleNoteUpdated);
    return () => socket.off("note-updated", handleNoteUpdated);
  }, [profile, fetchNotes]);

  // Debounce the search input by 300 ms to avoid filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-save the active note 1 second after the user stops typing
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

      // When offline, queue the save and mark it as done locally
      if (!isOnline()) {
        addToQueue({ payload });
        setSaveStatus("saved");
        return;
      }

      try {
        const res  = await fetch("/api/notes/save", {
          method:  "POST",
          headers: authHeaders(),
          body:    JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          // Assign the server-generated _id to a newly created note
          if (!activeNote._id && data.note?._id) {
            setActiveNote((prev) => ({ ...prev, _id: data.note._id }));
          }
          setSaveStatus("saved");
          fetchNotes();
        } else {
          setSaveStatus("idle");
        }
      } catch {
        // Network failure — queue the save for when connectivity returns
        addToQueue({ payload });
        setSaveStatus("saved");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeNote, fetchNotes]);

  // Delete a note by ID and refresh the list
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) fetchNotes();
    } catch {
      alert("Deletion failed!");
    }
  };

  // Upload one or more images and attach their URLs to the active note
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      const res  = await fetch("/api/upload", {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    formData,
      });
      const data = await res.json();
      if (data.success) {
        setActiveNote((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...data.urls],
        }));
        setSaveStatus("saving");
      } else {
        alert("Image upload failed.");
      }
    } catch {
      alert("Network error while uploading images.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Remove an image at the given index from the active note
  const handleRemoveImage = (idx) => {
    setActiveNote((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
    setSaveStatus("saving");
  };

  // Toggle the pinned state of a note
  const handleTogglePin = async (e, noteId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notes/${noteId}/pin`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) await fetchNotes();
    } catch (err) {
      console.error("Error toggling pin status:", err);
    }
  };

  // Upload a new avatar image and update the user profile
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("images", file);
      const uploadRes  = await fetch("/api/upload", {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    formData,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.success && uploadData.urls.length > 0) {
        const avatarUrl = uploadData.urls[0];
        await fetch(`/api/users/${profile.id}/avatar`, {
          method:  "PATCH",
          headers: authHeaders(),
          body:    JSON.stringify({ avatarUrl }),
        });
        const updatedProfile = { ...profile, avatarUrl };
        setProfile(updatedProfile);
        localStorage.setItem("user", JSON.stringify(updatedProfile));
      }
    } catch {
      alert("Error updating avatar.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  // Log out the current user and redirect to the login page
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* ignore network errors on logout */ }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // Attach or detach a label from the active note
  const handleToggleLabelOnNote = async (label) => {
    if (!activeNote?._id) return;
    const currentIds = (activeNote.labels || []).map((l) => l._id || l);
    const action     = currentIds.includes(label._id) ? "detach" : "attach";
    try {
      const res  = await fetch(`/api/notes/${activeNote._id}/labels`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify({ labelId: label._id, action }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveNote((prev) => ({ ...prev, labels: data.labels }));
        fetchNotes();
      }
    } catch (err) {
      console.error("Error toggling note label:", err);
    }
  };

  // Filter notes client-side based on the debounced search term
  const filteredNotes = debouncedSearch.trim()
    ? notes.filter((n) => {
        const q = debouncedSearch.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
        );
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
    filteredNotes,
  };
}