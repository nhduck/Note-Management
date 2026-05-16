import "../assets/NoteCardStyle.css"

/* ── Highlight search text ── */
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

function NoteCard({ note, onEdit, onDelete, onTogglePin, searchTerm, onPasswordAction }) {

  const handleEditClick = () => {
    if (note.password) {
      // Nếu có mật khẩu -> Yêu cầu mở khóa trước, truyền callback hành động kế tiếp vào
      onPasswordAction("unlock", note._id, () => {
        onEdit();
      });
    } else {
      onEdit(); // Không có mật khẩu thì mở trực tiếp
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Chặn lan truyền sự kiện click ra thẻ cha
    if (note.password) {
      // Nếu có mật khẩu -> Phải nhập đúng mật khẩu mới cho quyền thực thi lệnh xóa
      onPasswordAction("unlock", note._id, () => {
        onDelete();
      });
    } else {
      onDelete(); // Ghi chú thường thì xóa luôn
    }
  };

  return (
    <div
      className={`note-card ${note.isPinned ? "note-card--pinned" : ""}`}
      onClick={handleEditClick}
      style={{ "--note-color": note.color || "var(--accent)" }}
    >
      <div className="note-header-icons">
        <button
          className={`pin-btn ${note.isPinned ? "pin-btn--active" : ""}`}
          onClick={onTogglePin} title={note.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
        >
          <i className={`bi ${note.isPinned ? "bi-pin-angle-fill" : "bi-pin-angle"}`} />
        </button>
        {note.password               && <i className="bi bi-lock-fill note-badge-icon"   title="Có mật khẩu" />}
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

      {/* 4. BẢO MẬT: NẾU CÓ MẬT KHẨU THÌ ẨN NỘI DUNG XEM TRƯỚC */}
      <div className="note-preview">
        {note.password ? (
          <span style={{ color: "#8c8c8c", fontStyle: "italic", fontSize: "0.9rem" }}>
            🔒 Nội dung ghi chú đã được mã hóa bảo mật
          </span>
        ) : (
          <HighlightText text={note.content} searchTerm={searchTerm} />
        )}
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
        
        <div className="note-footer-actions" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          
          {/* 5. THÊM CÁC NÚT ĐIỀU KHIỂN MẬT KHẨU PHÙ HỢP VỚI TRẠNG THÁI GHI CHÚ */}
          {!note.password ? (
            <button
              className="delete-icon-btn"
              onClick={e => { e.stopPropagation(); onPasswordAction("enable", note._id); }}
              title="Đặt mật khẩu bảo mật"
            >
              <i className="bi bi-shield-lock" />
            </button>
          ) : (
            <>
              <button
                className="delete-icon-btn"
                onClick={e => { e.stopPropagation(); onPasswordAction("change", note._id); }}
                title="Thay đổi mật khẩu cũ"
              >
                <i className="bi bi-key" />
              </button>
              <button
                className="delete-icon-btn"
                onClick={e => { e.stopPropagation(); onPasswordAction("disable", note._id); }}
                title="Tắt bỏ bảo mật mật khẩu"
              >
                <i className="bi bi-unlock" />
              </button>
            </>
          )}

          <button
            className="delete-icon-btn delete-icon-btn--danger"
            onClick={handleDeleteClick}
            title="Xóa ghi chú"
          >
            <i className="bi bi-trash3-fill" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoteCard;