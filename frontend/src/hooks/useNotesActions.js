import { useState } from "react";
import { isOnline } from "../utils/offlineQueue";

const getToken = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export function useNotesActions(profile, setProfile, activeNote, setActiveNote, setSaveStatus, fetchNotes) {
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) fetchNotes();
    } catch {
      alert("Deletion failed!");
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setActiveNote((prev) => ({ ...prev, images: [...(prev.images || []), ...data.urls] }));
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

  const handleRemoveImage = (idx) => {
    setActiveNote((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
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
    } catch (err) {
      console.error("Error toggling pin status:", err);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("images", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success && uploadData.urls.length > 0) {
        const avatarUrl = uploadData.urls[0];
        await fetch(`/api/users/${profile.id}/avatar`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ avatarUrl }),
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

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {}
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleToggleLabelOnNote = async (label) => {
    if (!activeNote?._id) return;
    const currentIds = (activeNote.labels || []).map((l) => l._id || l);
    const action = currentIds.includes(label._id) ? "detach" : "attach";
    try {
      const res = await fetch(`/api/notes/${activeNote._id}/labels`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ labelId: label._id, action }),
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

  return {
    uploading, uploadingAvatar,
    handleDelete, handleImageUpload, handleRemoveImage,
    handleTogglePin, handleAvatarChange, handleLogout, handleToggleLabelOnNote,
  };
}