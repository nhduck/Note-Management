import { useState } from "react";
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

export default NoteCard;
