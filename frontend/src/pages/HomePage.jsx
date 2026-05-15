import { useState, useEffect, useCallback } from "react";
import "../assets/HomeStyle.css";

function HomePage() {
  const [notes, setNotes] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeNote, setActiveNote] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setProfile(JSON.parse(savedUser));
    else window.location.href = "/";
  }, []);

  const fetchNotes = useCallback(async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/notes?userId=${profile.id}`);
      const data = await res.json();
      if (res.ok) setNotes(data.notes);
    } catch (err) { console.error(err); }
  }, [profile]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // Auto-save: kích hoạt khi activeNote thay đổi
  useEffect(() => {
    if (!activeNote || (!activeNote.title && !activeNote.content)) return;
    setSaveStatus("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/notes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId: activeNote._id,
            title: activeNote.title,
            content: activeNote.content,
            images: activeNote.images || [],
            userId: profile.id,
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

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (res.ok) { fetchNotes(); setDeleteConfirm(null); }
    } catch { alert("Xóa thất bại!"); }
  };

  // Upload ảnh lên Cloudinary qua API backend → nhận URL
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append("images", f));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setActiveNote(prev => ({
          ...prev,
          images: [...(prev.images || []), ...data.urls],
        }));
        setSaveStatus("saving");
      } else {
        alert("Upload ảnh thất bại, vui lòng thử lại.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi upload ảnh.");
    } finally {
      setUploading(false);
      // Reset input để có thể chọn lại cùng file
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setActiveNote(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== indexToRemove),
    }));
    setSaveStatus("saving");
  };

  const handleTogglePin = async (e, noteId) => {
    e.stopPropagation();
    await fetch(`/api/notes/${noteId}/pin`, { method: "PATCH" });
    fetchNotes();
  };

  const filteredNotes = notes.filter(n => {
    const q = debouncedSearch.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  return (
    <div className={`app-wrapper ${darkMode ? "dark" : ""}`}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo"><i className="bi bi-journal-bookmark-fill" /> NoteSpace</div>
        <div className="search-wrap">
          <i className="bi bi-search" />
          <input className="search-input" type="text" placeholder="Tìm kiếm ghi chú..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="nav-right">
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)}>
            <i className={`bi ${darkMode ? "bi-sun-fill" : "bi-moon-stars-fill"}`} />
          </button>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>
              <i className="bi bi-grid" />
            </button>
            <button className={`view-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
              <i className="bi bi-list-ul" />
            </button>
          </div>
          <div className="avatar-btn">
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" />
              : profile?.username?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="main">
        <div className="main-header">
          <div>
            <div className="main-title">Ghi chú của tôi</div>
            <div className="main-count">{filteredNotes.length} ghi chú</div>
          </div>
          <button className="add-btn" onClick={() => { setSaveStatus("idle"); setActiveNote({ title: "", content: "", images: [] }); }}>
            <i className="bi bi-plus-lg" /> Mới
          </button>
        </div>

        <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
          {filteredNotes.map(note => (
            <NoteCard key={note._id} note={note}
              onEdit={() => { setSaveStatus("idle"); setActiveNote(note); }}
              onDelete={() => setDeleteConfirm(note._id)}
              onTogglePin={(e) => handleTogglePin(e, note._id)} />
          ))}
        </div>
      </main>

      {/* Editor Modal */}
      {activeNote && (
        <div className="modal-overlay" onClick={() => setActiveNote(null)}>
          <div className="editor-modal" onClick={e => e.stopPropagation()}>
            <div className="editor-header">
              <div className="editor-header-left">
                <div className="editor-icon-wrap"><i className="bi bi-pencil-square" /></div>
                <span className="editor-header-label">
                  {activeNote._id ? "Chỉnh sửa ghi chú" : "Ghi chú mới"}
                </span>
              </div>
              <button className="editor-close-btn" onClick={() => setActiveNote(null)} title="Đóng">
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

              {/* Hiển thị ảnh đã đính kèm */}
              {activeNote.images && activeNote.images.length > 0 && (
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

              <label className={`upload-btn ${uploading ? "upload-btn--loading" : ""}`}>
                {uploading
                  ? <><i className="bi bi-arrow-repeat spin" /> Đang tải...</>
                  : <><i className="bi bi-image" /> Thêm ảnh</>}
                <input type="file" accept="image/*" multiple hidden
                  onChange={handleImageUpload} disabled={uploading} />
              </label>

              <button className="editor-done-btn" onClick={() => setActiveNote(null)}>Xong</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
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

function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="note-card" onClick={onEdit} style={{ "--note-color": note.color || "#5147d4" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      <div className="note-header-icons">
        <button
          className={`pin-btn ${note.isPinned ? "pin-btn--active" : ""} ${hovered || note.isPinned ? "pin-btn--visible" : ""}`}
          onClick={onTogglePin} title={note.isPinned ? "Bỏ ghim" : "Ghim ghi chú"}>
          <i className={`bi ${note.isPinned ? "bi-pin-angle-fill" : "bi-pin-angle"}`} />
        </button>
        {note.password && <i className="bi bi-lock-fill note-badge-icon" title="Có mật khẩu" />}
        {note.sharedWith?.length > 0 && <i className="bi bi-people-fill note-badge-icon" title="Đã chia sẻ" />}
      </div>

      {note.images && note.images.length > 0 && (
        <div className="note-thumbnail-container">
          <img src={note.images[0]} alt="thumb" className="note-thumbnail" />
          {note.images.length > 1 && (
            <span className="more-images-badge">+{note.images.length - 1}</span>
          )}
        </div>
      )}

      <div className="note-title">{note.title || "Không có tiêu đề"}</div>
      <div className="note-preview">{note.content}</div>

      <div className="note-footer">
        <span className="note-date">{new Date(note.updatedAt).toLocaleDateString("vi-VN")}</span>
        <button className={`delete-icon-btn ${hovered ? "delete-icon-btn--visible" : ""}`}
          onClick={e => { e.stopPropagation(); onDelete(); }} title="Xóa ghi chú">
          <i className="bi bi-trash3-fill" />
        </button>
      </div>
    </div>
  );
}

export default HomePage;
