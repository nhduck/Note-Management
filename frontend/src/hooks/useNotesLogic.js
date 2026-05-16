import { useState, useEffect, useCallback } from "react";

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
  const [saveStatus, setSaveStatus] = useState("idle");
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ── Auth ──
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setProfile(JSON.parse(savedUser));
    else window.location.href = "/";
  }, []);

  // ── Fetch data ──
  const fetchNotes = useCallback(async () => {
    if (!profile) return;
    try {
      const url = activeLabel
        ? `/api/notes?userId=${profile.id}&labelId=${activeLabel._id}`
        : `/api/notes?userId=${profile.id}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setNotes(data.notes);
    } catch (err) { console.error(err); }
  }, [profile, activeLabel]);

  const fetchLabels = useCallback(async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/labels?userId=${profile.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setLabels(data.labels);
    } catch (err) { console.error(err); }
  }, [profile]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  // ── Search Debounce ──
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // ── Auto-save ──
  useEffect(() => {
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
        if (data.success && !activeNote._id) {
          setActiveNote(prev => ({ ...prev, _id: data.note._id }));
        }
        setSaveStatus("saved");
        fetchNotes();
      } catch { setSaveStatus("idle"); }
    }, 1000);
    return () => clearTimeout(t);
  }, [activeNote, fetchNotes]);

  // ── Xử lý Hành động (Handlers) ──
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) fetchNotes();
    } catch { alert("Xóa thất bại!"); }
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
        alert("Upload ảnh thất bại.");
      }
    } catch (err) { alert("Lỗi kết nối khi upload ảnh."); } 
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
    } catch (err) { console.error(err); }
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
    } catch (err) { alert("Lỗi khi cập nhật ảnh đại diện."); } 
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
    } catch (err) { console.error(err); }
  };

  // ── Lọc danh sách ghi chú ──
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