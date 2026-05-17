import { useState, useEffect, useCallback } from "react";
import "../assets/HomeStyle.css";

import { useNotesLogic } from "../hooks/useNotesLogic";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import NoteCard from "../components/NoteCard";
import EditorModal from "../components/EditorModal";
import LabelManagerModal from "../components/LabelManagerModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import NotePasswordModal from "../components/Notepasswordmodal";
import UserPreferencesModal, { loadPrefs, applyPrefs } from "../components/UserPreferencesModal";
import SecuritySettingsModal from "../components/SecuritySettingsModal";
import ShareModal from "../components/ShareModal";

const getToken = () => localStorage.getItem("token") || "";

function HomePage() {
  const [viewMode, setViewMode]           = useState("grid");
  const [darkMode, setDarkMode]           = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showLabelPicker, setShowLabelPicker]   = useState(false);
  const [passwordModal, setPasswordModal]       = useState(null);
  const [showPreferences, setShowPreferences]   = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [shareModal, setShareModal]             = useState(null); // note object | null
  const [sharedNotes, setSharedNotes]           = useState([]);
  const [sidebarOpen, setSidebarOpen]           = useState(false);

  useEffect(() => { applyPrefs(loadPrefs()); }, []);

  const {
    labels, activeLabel, setActiveLabel,
    searchTerm, setSearchTerm, debouncedSearch,
    activeNote, setActiveNote,
    profile, saveStatus, setSaveStatus, setProfile,
    uploading, uploadingAvatar,
    fetchNotes, fetchLabels,
    handleDelete, handleImageUpload, handleRemoveImage,
    handleTogglePin, handleAvatarChange, handleLogout, handleToggleLabelOnNote,
    filteredNotes,
  } = useNotesLogic();

  // ── Fetch notes shared WITH me ──
  const fetchSharedNotes = useCallback(async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/notes/shared?userId=${profile.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setSharedNotes(data.notes);
    } catch { /* ignore */ }
  }, [profile]);

  useEffect(() => { fetchSharedNotes(); }, [fetchSharedNotes]);

  const handleSecuritySettings = () => setShowSecurityModal(true);

  const pinnedNotes   = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const pageTitle     = activeLabel ? `Label: ${activeLabel.name}` : "My Notes";

  const closeEditor = () => {
    // If editing a shared note, refresh both lists
    if (activeNote?._isShared) fetchSharedNotes();
    setActiveNote(null);
    setShowLabelPicker(false);
  };

  // Render a NoteCard with all shared handlers
  const renderCard = (note, isShared = false) => (
    <NoteCard
      key={note._id}
      note={note}
      searchTerm={debouncedSearch}
      onEdit={() => {
        setSaveStatus("idle");
        // Mark _isShared so closeEditor knows to refresh the shared list
        setActiveNote({ ...note, _isShared: isShared });
      }}
      onDelete={isShared ? () => {} : () => setDeleteConfirm(note._id)}
      onTogglePin={isShared ? () => {} : e => handleTogglePin(e, note._id)}
      onPasswordAction={(mode, noteId, cb) => setPasswordModal({ mode, noteId, onUnlocked: cb })}
      onShare={isShared ? null : (n) => setShareModal(n)}
      isShared={isShared}
      sharedPermission={isShared ? note.permission : null}
    />
  );

  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>
      <Navbar
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        darkMode={darkMode} setDarkMode={setDarkMode}
        viewMode={viewMode} setViewMode={setViewMode}
        profile={profile} uploadingAvatar={uploadingAvatar}
        handleAvatarChange={handleAvatarChange} handleLogout={handleLogout}
        onOpenPreferences={() => setShowPreferences(true)}
        handleSecuritySettings={handleSecuritySettings}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
      />

      <div className="page-layout">
        <Sidebar
          labels={labels}
          activeLabel={activeLabel}
          setActiveLabel={setActiveLabel}
          setShowLabelManager={setShowLabelManager}
          handleSecuritySettings={handleSecuritySettings}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="main">
          {/* ── MY NOTES header ── */}
          <div className="main-header">
            <div>
              <div className="main-title">{pageTitle}</div>
              <div className="main-count">
                {debouncedSearch
                  ? `${filteredNotes.length} results for "${debouncedSearch}"`
                  : `${filteredNotes.length} notes`}
              </div>
            </div>
            <button
              className="add-btn"
              onClick={() => {
                setSaveStatus("idle");
                setActiveNote({ title: "", content: "", images: [], labels: [], color: loadPrefs().noteColor });
              }}
            >
              <i className="bi bi-plus-lg" /> New Note
            </button>
          </div>

          {debouncedSearch && filteredNotes.length === 0 && (
            <div className="search-empty">
              <i className="bi bi-search" />
              <p>No notes found for <strong>"{debouncedSearch}"</strong></p>
            </div>
          )}

          {/* Pinned notes */}
          {pinnedNotes.length > 0 && (
            <div className="notes-section">
              <div className="section-label">
                <i className="bi bi-pin-angle-fill" /> Pinned{" "}
                <span className="section-count">{pinnedNotes.length}</span>
              </div>
              <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
                {pinnedNotes.map(n => renderCard(n))}
              </div>
            </div>
          )}

          {/* Unpinned notes */}
          {unpinnedNotes.length > 0 && (
            <div className="notes-section">
              {pinnedNotes.length > 0 && (
                <div className="section-label">
                  <i className="bi bi-journal-text" /> Others{" "}
                  <span className="section-count">{unpinnedNotes.length}</span>
                </div>
              )}
              <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
                {unpinnedNotes.map(n => renderCard(n))}
              </div>
            </div>
          )}

          {/* ── SHARED WITH ME section ── */}
          {sharedNotes.length > 0 && (
            <div className="notes-section">
              <div className="section-label section-label--shared">
                <i className="bi bi-people-fill" /> Shared with me{" "}
                <span className="section-count">{sharedNotes.length}</span>
              </div>
              <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
                {sharedNotes.map(note => {
                  const myEntry = note.sharedWith?.find(s => s.userId === profile?.id || s.userId?._id === profile?.id);
                  const perm = myEntry?.permission || "view";
                  return renderCard({ ...note, permission: perm }, true);
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODALS ── */}
      {activeNote && (
        <EditorModal
          activeNote={activeNote} setActiveNote={setActiveNote}
          saveStatus={saveStatus} uploading={uploading} labels={labels}
          showLabelPicker={showLabelPicker} setShowLabelPicker={setShowLabelPicker}
          onClose={closeEditor} onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage} onToggleLabelOnNote={handleToggleLabelOnNote}
          readOnly={activeNote._isShared && activeNote.permission === "view"}
          profile={profile}
        />
      )}
      {showLabelManager && (
        <LabelManagerModal
          labels={labels} userId={profile?.id}
          onClose={() => setShowLabelManager(false)}
          onChanged={() => { fetchLabels(); fetchNotes(); }}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => { handleDelete(deleteConfirm); setDeleteConfirm(null); }}
        />
      )}
      {passwordModal && (
        <NotePasswordModal
          mode={passwordModal.mode} noteId={passwordModal.noteId}
          onClose={() => setPasswordModal(null)}
          onSuccess={() => {
            setPasswordModal(null);
            if (passwordModal.mode === "unlock") passwordModal.onUnlocked?.();
            else fetchNotes();
          }}
        />
      )}
      {showPreferences && (
        <UserPreferencesModal onClose={() => setShowPreferences(false)} />
      )}
      {showSecurityModal && (
        <SecuritySettingsModal
          onClose={() => setShowSecurityModal(false)}
          darkMode={darkMode}
          profile={profile}
          onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
        />
      )}
      {shareModal && (
        <ShareModal
          note={shareModal}
          profile={profile}
          onClose={() => setShareModal(null)}
          onChanged={() => { fetchNotes(); fetchSharedNotes(); }}
        />
      )}
    </div>
  );
}

export default HomePage;