import { useState, useEffect } from "react";
import "../assets/HomeStyle.css";

// Hooks & Components
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

function HomePage() {
  const [viewMode, setViewMode] = useState("grid");
  const [darkMode, setDarkMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [passwordModal, setPasswordModal] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Áp dụng prefs đã lưu khi app khởi động
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
    filteredNotes
  } = useNotesLogic();

  const handleSecuritySettings = () => {
    setShowSecurityModal(true);
  };

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const pageTitle = activeLabel ? `Nhãn: ${activeLabel.name}` : "Ghi chú của tôi";

  const closeEditor = () => { setActiveNote(null); setShowLabelPicker(false); };

  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>
      {/* ── NAVBAR ── */}
      <Navbar
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        darkMode={darkMode} setDarkMode={setDarkMode}
        viewMode={viewMode} setViewMode={setViewMode}
        profile={profile} uploadingAvatar={uploadingAvatar}
        handleAvatarChange={handleAvatarChange} handleLogout={handleLogout}
        onOpenPreferences={() => setShowPreferences(true)}
        handleSecuritySettings={handleSecuritySettings}
      />

      <div className="page-layout">
        {/* ── SIDEBAR ── */}
        <Sidebar
          labels={labels}
          activeLabel={activeLabel}
          setActiveLabel={setActiveLabel}
          setShowLabelManager={setShowLabelManager}
          handleSecuritySettings={handleSecuritySettings}
        />

        {/* ── MAIN CONTENT ── */}
        <main className="main">
          <div className="main-header">
            <div>
              <div className="main-title">{pageTitle}</div>
              <div className="main-count">
                {debouncedSearch
                  ? `${filteredNotes.length} kết quả cho "${debouncedSearch}"`
                  : `${filteredNotes.length} ghi chú`}
              </div>
            </div>
            <button className="add-btn" onClick={() => { setSaveStatus("idle"); setActiveNote({ title: "", content: "", images: [], labels: [], color: loadPrefs().noteColor }); }}>
              <i className="bi bi-plus-lg" /> Mới
            </button>
          </div>

          {debouncedSearch && filteredNotes.length === 0 && (
            <div className="search-empty">
              <i className="bi bi-search" />
              <p>Không tìm thấy ghi chú nào cho <strong>"{debouncedSearch}"</strong></p>
            </div>
          )}

          {pinnedNotes.length > 0 && (
            <div className="notes-section">
              <div className="section-label"><i className="bi bi-pin-angle-fill" /> Đã ghim <span className="section-count">{pinnedNotes.length}</span></div>
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

          {unpinnedNotes.length > 0 && (
            <div className="notes-section">
              {pinnedNotes.length > 0 && <div className="section-label"><i className="bi bi-journal-text" /> Khác <span className="section-count">{unpinnedNotes.length}</span></div>}
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

      {/* ── MODALS ── */}
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
        <LabelManagerModal labels={labels} userId={profile?.id} onClose={() => setShowLabelManager(false)} onChanged={() => { fetchLabels(); fetchNotes(); }} />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal onCancel={() => setDeleteConfirm(null)} onConfirm={() => { handleDelete(deleteConfirm); setDeleteConfirm(null); }} />
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