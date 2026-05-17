import { useState, useEffect } from "react";
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
import OfflineBanner from "../components/OfflineBanner";

function HomePage() {
  const [viewMode, setViewMode]         = useState("grid"); // "grid" | "list"
  const [darkMode, setDarkMode]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showLabelPicker, setShowLabelPicker]   = useState(false);
  const [passwordModal, setPasswordModal]       = useState(null);
  const [showPreferences, setShowPreferences]   = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Mobile drawer sidebar responsive layout state flags
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize application viewport styling context with stored local values on mount
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

  const handleSecuritySettings = () => setShowSecurityModal(true);

  const pinnedNotes   = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const pageTitle     = activeLabel ? `Label: ${activeLabel.name}` : "My Notes";

  const closeEditor = () => { setActiveNote(null); setShowLabelPicker(false); };

  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>
      <OfflineBanner />
      {/* ── NAVBAR NAVIGATION HEADER ── */}
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
        {/* ── SIDEBAR DRAWER PANEL ── */}
        <Sidebar
          labels={labels}
          activeLabel={activeLabel}
          setActiveLabel={setActiveLabel}
          setShowLabelManager={setShowLabelManager}
          handleSecuritySettings={handleSecuritySettings}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* ── MAIN CONTENT VIEWER AREA ── */}
        <main className="main">
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

          {/* FALLBACK STATUS VIEW: Empty search query result feedback overlay */}
          {debouncedSearch && filteredNotes.length === 0 && (
            <div className="search-empty">
              <i className="bi bi-search" />
              <p>No notes found for <strong>"{debouncedSearch}"</strong></p>
            </div>
          )}

          {/* DOCUMENT SECTION 1: PINNED NOTES GRID/LIST COMPOSITION */}
          {pinnedNotes.length > 0 && (
            <div className="notes-section">
              <div className="section-label">
                <i className="bi bi-pin-angle-fill" /> Pinned{" "}
                <span className="section-count">{pinnedNotes.length}</span>
              </div>
              <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
                {pinnedNotes.map(note => (
                  <NoteCard key={note._id} note={note} searchTerm={debouncedSearch}
                    onEdit={() => { setSaveStatus("idle"); setActiveNote(note); }}
                    onDelete={() => setDeleteConfirm(note._id)}
                    onTogglePin={e => handleTogglePin(e, note._id)}
                    onPasswordAction={(mode, noteId, cb) => setPasswordModal({ mode, noteId, onUnlocked: cb })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENT SECTION 2: UNPINNED REMAINING NOTES COMPOSITION */}
          {unpinnedNotes.length > 0 && (
            <div className="notes-section">
              {pinnedNotes.length > 0 && (
                <div className="section-label">
                  <i className="bi bi-journal-text" /> Others{" "}
                  <span className="section-count">{unpinnedNotes.length}</span>
                </div>
              )}
              <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
                {unpinnedNotes.map(note => (
                  <NoteCard key={note._id} note={note} searchTerm={debouncedSearch}
                    onEdit={() => { setSaveStatus("idle"); setActiveNote(note); }}
                    onDelete={() => setDeleteConfirm(note._id)}
                    onTogglePin={e => handleTogglePin(e, note._id)}
                    onPasswordAction={(mode, noteId, cb) => setPasswordModal({ mode, noteId, onUnlocked: cb })}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── CONDITIONAL MODAL OVERLAYS LIFECYCLE CONTROLS ── */}
      {activeNote && (
        <EditorModal
          activeNote={activeNote} setActiveNote={setActiveNote}
          saveStatus={saveStatus} uploading={uploading} labels={labels}
          showLabelPicker={showLabelPicker} setShowLabelPicker={setShowLabelPicker}
          onClose={closeEditor} onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage} onToggleLabelOnNote={handleToggleLabelOnNote}
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
    </div>
  );
}

export default HomePage;