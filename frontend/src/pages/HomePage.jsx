import { useState, useEffect, useCallback, useRef } from "react";
import "../assets/HomeStyle.css";

/* ═══════════════════════════════════════════════════════
   HELPER: lấy token từ localStorage
═══════════════════════════════════════════════════════ */
const getToken = () => localStorage.getItem("token") || "";
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

  // ── Debounce search 300ms theo đề ────────────────────
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
        // Lưu vào DB
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

  // ── Gắn / gỡ nhãn cho note đang mở ──────────────────
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

  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="nav-logo"><i className="bi bi-journal-bookmark-fill" /> NoteSpace</div>

        {/* Search — live 300ms theo đề */}
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
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ══ MODAL: EDITOR ══ */}
      {activeNote && (
        <div className="modal-overlay" onClick={() => { setActiveNote(null); setShowLabelPicker(false); }}>
          <div className="editor-modal" onClick={e => e.stopPropagation()}>
            <div className="editor-header">
              <div className="editor-header-left">
                <div className="editor-icon-wrap"><i className="bi bi-pencil-square" /></div>
                <span className="editor-header-label">{activeNote._id ? "Chỉnh sửa ghi chú" : "Ghi chú mới"}</span>
              </div>
              <button className="editor-close-btn" onClick={() => { setActiveNote(null); setShowLabelPicker(false); }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="editor-body">
              <div className="editor-field">
                <label className="editor-label">Tiêu đề</label>
                <input className="editor-title" placeholder="Nhập tiêu đề..."
                  value={activeNote.title}
                  onChange={e => setActiveNote({ ...activeNote, title: e.target.value })} />
              </div>
              <div className="editor-field editor-field--grow">
                <label className="editor-label">Nội dung</label>
                <textarea className="editor-content" placeholder="Bắt đầu nhập nội dung..."
                  value={activeNote.content}
                  onChange={e => setActiveNote({ ...activeNote, content: e.target.value })} />
              </div>

              {(activeNote.labels || []).length > 0 && (
                <div className="editor-labels-row">
                  {activeNote.labels.map(lbl => (
                    <span key={lbl._id || lbl} className="editor-label-chip">
                      <i className="bi bi-tag-fill" /> {lbl.name || lbl}
                      <button className="chip-remove-btn" onClick={() => handleToggleLabelOnNote(lbl)} title="Gỡ nhãn">×</button>
                    </span>
                  ))}
                </div>
              )}

              {(activeNote.images || []).length > 0 && (
                <div className="editor-images">
                  {activeNote.images.map((imgSrc, idx) => (
                    <div key={idx} className="image-preview-wrapper">
                      <img src={imgSrc} alt="attachment" className="image-preview" />
                      <button className="remove-img-btn" onClick={() => handleRemoveImage(idx)}>
                        <i className="bi bi-x" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="editor-footer">
              <div className="editor-status">
                {saveStatus === "saving" && <><span className="status-dot status-dot--saving" /><span>Đang lưu...</span></>}
                {saveStatus === "saved"  && <><i className="bi bi-cloud-check-fill status-icon--saved" /><span>Đã tự động lưu</span></>}
                {saveStatus === "idle"   && <><i className="bi bi-cloud status-icon--idle" /><span>Chưa có thay đổi</span></>}
              </div>
              <div className="editor-actions">
                <div className="label-picker-wrap">
                  <button className="footer-icon-btn" onClick={() => setShowLabelPicker(p => !p)} title="Gắn nhãn">
                    <i className="bi bi-tag" />
                  </button>
                  {showLabelPicker && (
                    <LabelPickerDropdown
                      labels={labels}
                      activeNoteLabels={activeNote.labels || []}
                      onToggle={handleToggleLabelOnNote}
                      onClose={() => setShowLabelPicker(false)}
                      noteId={activeNote._id}
                    />
                  )}
                </div>
                <label className={`upload-btn ${uploading ? "upload-btn--loading" : ""}`} title="Thêm ảnh">
                  {uploading ? <><i className="bi bi-arrow-repeat spin" /> Đang tải...</> : <><i className="bi bi-image" /> Thêm ảnh</>}
                  <input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} disabled={uploading} />
                </label>
                <button className="editor-done-btn" onClick={() => { setActiveNote(null); setShowLabelPicker(false); }}>Xong</button>
              </div>
            </div>
          </div>
        </div>
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
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon"><i className="bi bi-trash3-fill" /></div>
            <h3 className="delete-modal-title">Xóa ghi chú?</h3>
            <p className="delete-modal-desc">Hành động này không thể hoàn tác. Ghi chú sẽ bị xóa vĩnh viễn.</p>
            <div className="delete-modal-actions">
              <button className="delete-cancel-btn" onClick={() => setDeleteConfirm(null)}>Hủy bỏ</button>
              <button className="delete-confirm-btn" onClick={() => handleDelete(deleteConfirm)}>
                <i className="bi bi-trash3" /> Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LABEL PICKER DROPDOWN
═══════════════════════════════════════════════════════ */
function LabelPickerDropdown({ labels, activeNoteLabels, onToggle, onClose, noteId }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const attachedIds = activeNoteLabels.map(l => l._id || l);
  return (
    <div className="label-picker-dropdown" ref={ref}>
      <div className="label-picker-header">Gắn nhãn</div>
      {labels.length === 0 && <p className="label-picker-empty">Chưa có nhãn nào. Hãy tạo nhãn trước.</p>}
      {!noteId && labels.length > 0 && <p className="label-picker-empty">Lưu ghi chú trước để gắn nhãn.</p>}
      {noteId && labels.map(lbl => {
        const attached = attachedIds.includes(lbl._id);
        return (
          <button key={lbl._id} className={`label-picker-item ${attached ? "label-picker-item--checked" : ""}`}
            onClick={() => onToggle(lbl)}>
            <i className={`bi ${attached ? "bi-check-square-fill" : "bi-square"}`} />
            <span>{lbl.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LABEL MANAGER MODAL
═══════════════════════════════════════════════════════ */
function LabelManagerModal({ labels, userId, onClose, onChanged }) {
  const [localLabels, setLocalLabels]   = useState(labels);
  const [newName, setNewName]           = useState("");
  const [editingId, setEditingId]       = useState(null);
  const [editName, setEditName]         = useState("");
  const [error, setError]               = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleAdd = async () => {
    setError("");
    if (!newName.trim()) return setError("Tên nhãn không được rỗng");
    try {
      const res  = await fetch("/api/labels", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ userId, name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Lỗi khi tạo nhãn");
      setLocalLabels(prev => [...prev, data.label].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      onChanged();
    } catch { setError("Lỗi kết nối"); }
  };

  const startEdit = (lbl) => { setEditingId(lbl._id); setEditName(lbl.name); setError(""); };

  const handleSaveEdit = async (id) => {
    setError("");
    if (!editName.trim()) return setError("Tên nhãn không được rỗng");
    try {
      const res  = await fetch(`/api/labels/${id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ name: editName.trim(), userId }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Lỗi khi đổi tên");
      setLocalLabels(prev =>
        prev.map(l => l._id === id ? data.label : l).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      onChanged();
    } catch { setError("Lỗi kết nối"); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/labels/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return setError("Lỗi khi xóa nhãn");
      setLocalLabels(prev => prev.filter(l => l._id !== id));
      setDeleteTarget(null);
      onChanged();
    } catch { setError("Lỗi kết nối"); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="label-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="lm-header">
          <div className="lm-title-wrap">
            <div className="editor-icon-wrap"><i className="bi bi-tags-fill" /></div>
            <span className="lm-title">Quản lý nhãn</span>
          </div>
          <button className="editor-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className="lm-add-row">
          <input className="lm-input" placeholder="Tên nhãn mới..."
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <button className="lm-add-btn" onClick={handleAdd}><i className="bi bi-plus-lg" /> Thêm</button>
        </div>

        {error && <p className="lm-error"><i className="bi bi-exclamation-circle" /> {error}</p>}

        <div className="lm-list">
          {localLabels.length === 0 && <p className="lm-empty">Chưa có nhãn nào. Hãy thêm nhãn đầu tiên!</p>}
          {localLabels.map(lbl => (
            <div key={lbl._id} className="lm-item">
              {editingId === lbl._id ? (
                <div className="lm-edit-row">
                  <input className="lm-input lm-input--inline" value={editName} autoFocus
                    onChange={e => { setEditName(e.target.value); setError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(lbl._id); if (e.key === "Escape") setEditingId(null); }} />
                  <button className="lm-save-btn"   onClick={() => handleSaveEdit(lbl._id)} title="Lưu"><i className="bi bi-check-lg" /></button>
                  <button className="lm-cancel-btn" onClick={() => setEditingId(null)}       title="Hủy"><i className="bi bi-x-lg" /></button>
                </div>
              ) : (
                <>
                  <span className="lm-label-name"><i className="bi bi-tag-fill lm-tag-icon" /> {lbl.name}</span>
                  <div className="lm-item-actions">
                    <button className="lm-edit-btn"   onClick={() => startEdit(lbl)}       title="Đổi tên"><i className="bi bi-pencil" /></button>
                    <button className="lm-delete-btn" onClick={() => setDeleteTarget(lbl)} title="Xóa"><i className="bi bi-trash3" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {deleteTarget && (
          <div className="lm-confirm-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="lm-confirm-box" onClick={e => e.stopPropagation()}>
              <i className="bi bi-exclamation-triangle-fill lm-confirm-icon" />
              <p>Xóa nhãn <strong>"{deleteTarget.name}"</strong>?</p>
              <p className="lm-confirm-note">Các ghi chú gắn nhãn này sẽ không bị xóa.</p>
              <div className="lm-confirm-actions">
                <button className="delete-cancel-btn"  onClick={() => setDeleteTarget(null)}>Hủy</button>
                <button className="delete-confirm-btn" onClick={() => handleDelete(deleteTarget._id)}>
                  <i className="bi bi-trash3" /> Xóa nhãn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NOTE CARD
═══════════════════════════════════════════════════════ */
function HighlightText({ text, searchTerm }) {
  if (!searchTerm || !text) return <span>{text}</span>;
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts   = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase()
          ? <mark key={i} className="search-highlight">{part}</mark>
          : part
      )}
    </span>
  );
}

function NoteCard({ note, onEdit, onDelete, onTogglePin, searchTerm }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`note-card ${note.isPinned ? "note-card--pinned" : ""}`}
      onClick={onEdit}
      style={{ "--note-color": note.color || "#5147d4" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="note-header-icons">
        <button
          className={`pin-btn ${note.isPinned ? "pin-btn--active" : ""} ${hovered || note.isPinned ? "pin-btn--visible" : ""}`}
          onClick={onTogglePin} title={note.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
        >
          <i className={`bi ${note.isPinned ? "bi-pin-angle-fill" : "bi-pin-angle"}`} />
        </button>
        {note.password              && <i className="bi bi-lock-fill note-badge-icon"   title="Có mật khẩu" />}
        {note.sharedWith?.length > 0 && <i className="bi bi-people-fill note-badge-icon" title="Đã chia sẻ" />}
      </div>

      {note.images?.length > 0 && (
        <div className="note-thumbnail-container">
          <img src={note.images[0]} alt="thumb" className="note-thumbnail" />
          {note.images.length > 1 && <span className="more-images-badge">+{note.images.length - 1}</span>}
        </div>
      )}

      <div className="note-title">
        <HighlightText text={note.title || "Không có tiêu đề"} searchTerm={searchTerm} />
      </div>
      <div className="note-preview">
        <HighlightText text={note.content} searchTerm={searchTerm} />
      </div>

      {note.labels?.length > 0 && (
        <div className="note-labels-row">
          {note.labels.map(lbl => (
            <span key={lbl._id} className="note-label-chip">
              <i className="bi bi-tag-fill" /> {lbl.name}
            </span>
          ))}
        </div>
      )}

      <div className="note-footer">
        <span className="note-date">{new Date(note.updatedAt).toLocaleDateString("vi-VN")}</span>
        <button
          className={`delete-icon-btn ${hovered ? "delete-icon-btn--visible" : ""}`}
          onClick={e => { e.stopPropagation(); onDelete(); }} title="Xóa ghi chú"
        >
          <i className="bi bi-trash3-fill" />
        </button>
      </div>
    </div>
  );
}

export default HomePage;