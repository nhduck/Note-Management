import { useState, useEffect, useCallback } from "react";
import "../assets/HomeStyle.css";
import NoteCard           from "../components/NoteCard";
import EditorModal        from "../components/EditorModal";
import LabelManagerModal  from "../components/LabelManagerModal";
import DeleteConfirmModal from "../components/DeleteConfirmModal";
import NotePasswordModal  from "../components/Notepasswordmodal";

/* ═══════════════════════════════════════════════════════
   HELPER
═══════════════════════════════════════════════════════ */
const getToken    = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/* ═══════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════ */
function HomePage() {
  const [notes, setNotes]                       = useState([]);
  const [labels, setLabels]                     = useState([]);
  const [activeLabel, setActiveLabel]           = useState(null);
  const [viewMode, setViewMode]                 = useState("grid");
  const [searchTerm, setSearchTerm]             = useState("");
  const [debouncedSearch, setDebouncedSearch]   = useState("");
  const [activeNote, setActiveNote]             = useState(null);
  const [darkMode, setDarkMode]                 = useState(false);
  const [profile, setProfile]                   = useState(null);
  const [saveStatus, setSaveStatus]             = useState("idle");
  const [deleteConfirm, setDeleteConfirm]       = useState(null);
  const [uploading, setUploading]               = useState(false);
  const [uploadingAvatar, setUploadingAvatar]   = useState(false);
  const [showProfileMenu, setShowProfileMenu]   = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showLabelPicker, setShowLabelPicker]   = useState(false);
  const [passwordModal, setPasswordModal]       = useState(null);
  // ── Auth ──────────────────────────────────────────────
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setProfile(JSON.parse(savedUser));
    else window.location.href = "/";
  }, []);

  // ── Fetch notes ───────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!profile) return;
    try {
      const url = activeLabel
        ? `/api/notes?userId=${profile.id}&labelId=${activeLabel._id}`
        : `/api/notes?userId=${profile.id}`;
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setNotes(data.notes);
    } catch (err) { console.error(err); }
  }, [profile, activeLabel]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // ── Fetch labels ──────────────────────────────────────
  const fetchLabels = useCallback(async () => {
    if (!profile) return;
    try {
      const res  = await fetch(`/api/labels?userId=${profile.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setLabels(data.labels);
    } catch (err) { console.error(err); }
  }, [profile]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  // ── Debounce search 300ms ─────────────────────────────
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // ── Auto-save ─────────────────────────────────────────
  useEffect(() => {
    if (!activeNote || (!activeNote.title && !activeNote.content)) return;
    setSaveStatus("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/notes/save", {
          method:  "POST",
          headers: authHeaders(),
          body:    JSON.stringify({
            noteId:  activeNote._id,
            title:   activeNote.title,
            content: activeNote.content,
            images:  activeNote.images  || [],
            labels:  (activeNote.labels || []).map(l => l._id || l),
            userId:  profile.id,
          }),
        });
        const data = await res.json();
        if (data.success && !activeNote._id)
          setActiveNote(prev => ({ ...prev, _id: data.note._id }));
        setSaveStatus("saved");
        fetchNotes();
      } catch { setSaveStatus("idle"); }
    }, 1000);
    return () => clearTimeout(t);
  }, [activeNote, fetchNotes]);

  // ── Delete note ───────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { fetchNotes(); setDeleteConfirm(null); }
    } catch { alert("Xóa thất bại!"); }
  };

  // ── Upload ảnh ────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("images", f));
      const res  = await fetch("/api/upload", {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    formData,
      });
      const data = await res.json();
      if (data.success) {
        setActiveNote(prev => ({ ...prev, images: [...(prev.images || []), ...data.urls] }));
        setSaveStatus("saving");
      } else {
        alert("Upload ảnh thất bại, vui lòng thử lại.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi upload ảnh.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (idx) => {
    setActiveNote(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
    setSaveStatus("saving");
  };

  // ── Ghim / bỏ ghim ───────────────────────────────────
  const handleTogglePin = async (e, noteId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notes/${noteId}/pin`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) await fetchNotes();
    } catch (err) { console.error("Lỗi ghim ghi chú:", err); }
  };

  // ── Avatar ────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("images", file);
      const res  = await fetch("/api/upload", {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    formData,
      });
      const data = await res.json();
      if (data.success && data.urls.length > 0) {
        const avatarUrl = data.urls[0];
        await fetch(`/api/users/${profile.id}/avatar`, {
          method:  "PATCH",
          headers: authHeaders(),
          body:    JSON.stringify({ avatarUrl }),
        });
        const updatedProfile = { ...profile, avatarUrl };
        setProfile(updatedProfile);
        localStorage.setItem("user", JSON.stringify(updatedProfile));
      } else {
        alert("Tải ảnh thất bại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật ảnh đại diện.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  // ── Đăng xuất ─────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch { /* ignore */ }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // ── Gắn / gỡ nhãn ────────────────────────────────────
  const handleToggleLabelOnNote = async (label) => {
    if (!activeNote?._id) return;
    const currentIds = (activeNote.labels || []).map(l => l._id || l);
    const isAttached = currentIds.includes(label._id);
    const action     = isAttached ? "detach" : "attach";
    try {
      const res  = await fetch(`/api/notes/${activeNote._id}/labels`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify({ labelId: label._id, action }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveNote(prev => ({ ...prev, labels: data.labels }));
        fetchNotes();
      }
    } catch (err) { console.error(err); }
  };

  // ── Lọc theo search ──────────────────────────────────
  const filteredNotes = debouncedSearch.trim()
    ? notes.filter(n => {
        const q = debouncedSearch.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      })
    : notes;

  const pinnedNotes   = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const pageTitle     = activeLabel ? `Nhãn: ${activeLabel.name}` : "Ghi chú của tôi";

  const closeEditor = () => { setActiveNote(null); setShowLabelPicker(false); };

  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="nav-logo"><i className="bi bi-journal-bookmark-fill" /> NoteSpace</div>

        <div className="search-wrap">
          <i className="bi bi-search" />
          <input
            className="search-input"
            type="text"
            placeholder="Tìm kiếm ghi chú..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={() => setSearchTerm("")} title="Xoá">
              <i className="bi bi-x-circle-fill" />
            </button>
          )}
        </div>

        <div className="nav-right">
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Đổi giao diện">
            <i className={`bi ${darkMode ? "bi-sun-fill" : "bi-moon-stars-fill"}`} />
          </button>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")} title="Lưới">
              <i className="bi bi-grid" />
            </button>
            <button className={`view-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")} title="Danh sách">
              <i className="bi bi-list-ul" />
            </button>
          </div>

          {/* Avatar + profile menu */}
          <div className="profile-container">
            <div className="avatar-btn" onClick={() => setShowProfileMenu(p => !p)}>
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="avatar" />
                : profile?.username?.charAt(0).toUpperCase() || "U"}
            </div>

            {showProfileMenu && (
              <>
                <div className="profile-overlay" onClick={() => setShowProfileMenu(false)} />
                <div className={`profile-popup ${darkMode ? "profile-popup--dark" : ""}`}>
                  <div className="profile-popup-name">{profile?.username || "Người dùng"}</div>

                  <label className="profile-popup-item">
                    {uploadingAvatar
                      ? <><i className="bi bi-arrow-repeat spin" /> Đang tải...</>
                      : <><i className="bi bi-camera-fill profile-icon-purple" /> Đổi ảnh đại diện</>}
                    <input type="file" accept="image/*" hidden onChange={handleAvatarChange} disabled={uploadingAvatar} />
                  </label>

                  <button className="profile-popup-item profile-popup-item--danger" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right" /> Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── LAYOUT ── */}
      <div className="page-layout">

        {/* ── SIDEBAR NHÃN ── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Nhãn</span>
            <button className="sidebar-manage-btn" onClick={() => setShowLabelManager(true)} title="Quản lý nhãn">
              <i className="bi bi-pencil-square" />
            </button>
          </div>

          <button
            className={`sidebar-label-item ${!activeLabel ? "sidebar-label-item--active" : ""}`}
            onClick={() => setActiveLabel(null)}
          >
            <i className="bi bi-journals" /><span>Tất cả ghi chú</span>
          </button>

          {labels.map(lbl => (
            <button
              key={lbl._id}
              className={`sidebar-label-item ${activeLabel?._id === lbl._id ? "sidebar-label-item--active" : ""}`}
              onClick={() => setActiveLabel(lbl)}
            >
              <i className="bi bi-tag-fill" /><span>{lbl.name}</span>
            </button>
          ))}

          {labels.length === 0 && (
            <p className="sidebar-empty">Chưa có nhãn nào.<br />Nhấn ✏️ để thêm.</p>
          )}
        </aside>

        {/* ── MAIN ── */}
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
            <button className="add-btn"
              onClick={() => { setSaveStatus("idle"); setActiveNote({ title: "", content: "", images: [], labels: [] }); }}>
              <i className="bi bi-plus-lg" /> Mới
            </button>
          </div>

          {debouncedSearch && filteredNotes.length === 0 && (
            <div className="search-empty">
              <i className="bi bi-search" />
              <p>Không tìm thấy ghi chú nào cho <strong>"{debouncedSearch}"</strong></p>
              <span>Thử tìm kiếm với từ khóa khác</span>
            </div>
          )}

          {pinnedNotes.length > 0 && (
            <div className="notes-section">
              <div className="section-label">
                <i className="bi bi-pin-angle-fill" /> Đã ghim
                <span className="section-count">{pinnedNotes.length}</span>
              </div>
              <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
                {pinnedNotes.map(note => (
                <NoteCard key={note._id} note={note} searchTerm={debouncedSearch}
                  onEdit={() => { setSaveStatus("idle"); setActiveNote(note); }}
                  onDelete={() => setDeleteConfirm(note._id)}
                  onTogglePin={e => handleTogglePin(e, note._id)}
                  onPasswordAction={(mode, noteId, cb) => setPasswordModal({ mode, noteId, onUnlocked: cb })}  // ← thêm dòng này
                />
                ))}
              </div>
            </div>
          )}

          {unpinnedNotes.length > 0 && (
            <div className="notes-section">
              {pinnedNotes.length > 0 && (
                <div className="section-label">
                  <i className="bi bi-journal-text" /> Khác
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

      {/* ══ MODAL: EDITOR ══ */}
      {activeNote && (
        <EditorModal
          activeNote={activeNote}
          setActiveNote={setActiveNote}
          saveStatus={saveStatus}
          uploading={uploading}
          labels={labels}
          showLabelPicker={showLabelPicker}
          setShowLabelPicker={setShowLabelPicker}
          onClose={closeEditor}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onToggleLabelOnNote={handleToggleLabelOnNote}
        />
      )}

      {/* ══ MODAL: QUẢN LÝ NHÃN ══ */}
      {showLabelManager && (
        <LabelManagerModal
          labels={labels}
          userId={profile?.id}
          onClose={() => setShowLabelManager(false)}
          onChanged={() => { fetchLabels(); fetchNotes(); }}
        />
      )}

      {/* ══ MODAL: XÁC NHẬN XÓA ══ */}
      {deleteConfirm && (
        <DeleteConfirmModal
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
        />
      )}
      {/* ══ MODAL: MẬT KHẨU GHI CHÚ ══ */}
      {passwordModal && (
        <NotePasswordModal
          mode={passwordModal.mode}
          noteId={passwordModal.noteId}
          onClose={() => setPasswordModal(null)}
          onSuccess={(data) => {
            setPasswordModal(null);
            if (passwordModal.mode === "unlock") {
              // Thực hiện hành động tiếp theo sau khi nhập đúng mật khẩu
              passwordModal.onUnlocked?.();
            } else {
              // Nếu là bật/tắt/đổi mật khẩu thành công thì render lại danh sách
              fetchNotes();
            }
          }}
        />
      )}
    </div>
  );
}

export default HomePage;
