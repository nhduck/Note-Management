import "../assets/NoteCardStyle.css"

/* ── Highlight search text component ── */
function HighlightText({ text, searchTerm }) {
  // If there's no active search term or text body, render the plain text as is
  if (!searchTerm || !text) return <span>{text}</span>;
  
  // Escape special regex characters to prevent pattern crashes
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
  // Split text by matching segments dynamically using case-insensitive flag
  const parts   = text.split(new RegExp(`(${escaped})`, "gi"));
  
  return (
    <span>
      {parts.map((part, i) =>
        // If the part matches search term, wrap it in a <mark> element for styling
        part.toLowerCase() === searchTerm.toLowerCase()
          ? <mark key={i} className="search-highlight">{part}</mark>
          : part
      )}
    </span>
  );
}

function NoteCard({ note, onEdit, onDelete, onTogglePin, searchTerm, onPasswordAction, onShare, isShared, sharedPermission }) {

  // Intercept card click: Request password unlock first if the note is password protected
  const handleEditClick = () => {
    if (note.password) {
      // Trigger unlock action modal and pass the intended edit callback execution sequence
      onPasswordAction("unlock", note._id, () => {
        onEdit();
      });
    } else {
      onEdit(); // Open immediately if no password restriction exists
    }
  };

  // Intercept delete icon click: Requires permission authorization verification
  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevents click event bubbling up to the card element layout container
    if (note.password) {
      // Must unlock successfully before executing permanent delete callback logic
      onPasswordAction("unlock", note._id, () => {
        onDelete();
      });
    } else {
      onDelete(); // Delete standard notes directly
    }
  };

  return (
    <div
      className={`note-card ${note.isPinned ? "note-card--pinned" : ""}`}
      onClick={handleEditClick}
      style={{ "--note-color": note.color || "var(--accent)" }}
    >
      {/* SHARED BADGE: Show when this note is shared with me */}
      {isShared && (
        <div className="note-shared-badge">
          <i className={`bi ${sharedPermission === "edit" ? "bi-pencil-fill" : "bi-eye-fill"}`} />
          {sharedPermission === "edit" ? "Edit" : "View only"}
        </div>
      )}

      {/* CARD TOP BADGES & ACTIONS */}
      <div className="note-header-icons">
        <button
          className={`pin-btn ${note.isPinned ? "pin-btn--active" : ""}`}
          onClick={onTogglePin} title={note.isPinned ? "Unpin" : "Pin to top"}
        >
          <i className={`bi ${note.isPinned ? "bi-pin-angle-fill" : "bi-pin-angle"}`} />
        </button>
        {note.password               && <i className="bi bi-lock-fill note-badge-icon"   title="Password protected" />}
        {note.sharedWith?.length > 0 && <i className="bi bi-people-fill note-badge-icon" title="Shared" />}
      </div>

      {/* MEDIA CONTAINER: Renders the first attached image thumbnail preview */}
      {note.images?.length > 0 && (
        <div className="note-thumbnail-container">
          <img src={note.images[0]} alt="thumb" className="note-thumbnail" />
          {note.images.length > 1 && <span className="more-images-badge">+{note.images.length - 1}</span>}
        </div>
      )}

      {/* TITLE CONTAINER */}
      <div className="note-title">
        <HighlightText text={note.title || "Untitled"} searchTerm={searchTerm} />
      </div>

      {/* CONTENT PREVIEW: Hides actual body text if password protection is enabled */}
      <div className="note-preview">
        {note.password ? (
          <span style={{ color: "#8c8c8c", fontStyle: "italic", fontSize: "0.9rem" }}>
            🔒 Note content encrypted for security
          </span>
        ) : (
          <HighlightText text={note.content} searchTerm={searchTerm} />
        )}
      </div>

      {/* LABELS ROW CONTAINER */}
      {note.labels?.length > 0 && (
        <div className="note-labels-row">
          {note.labels.map(lbl => (
            <span key={lbl._id} className="note-label-chip">
              <i className="bi bi-tag-fill" /> {lbl.name}
            </span>
          ))}
        </div>
      )}

      {/* CARD FOOTER: Formatted update timestamp and action utility panel */}
      <div className="note-footer">
        {/* Render formatted US layout local date configuration pattern */}
        <span className="note-date">{new Date(note.updatedAt).toLocaleDateString("en-US")}</span>
        
        <div className="note-footer-actions" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          
          {/* PASSWORD & SHARE ACTIONS: Only for note owner */}
          {!isShared && (<>
          {/* PASSWORD WORKFLOW ACTIONS */}
          {!note.password ? (
            <button
              className="delete-icon-btn"
              onClick={e => { e.stopPropagation(); onPasswordAction("enable", note._id); }}
              title="Set security password"
            >
              <i className="bi bi-shield-lock" />
            </button>
          ) : (
            <>
              <button
                className="delete-icon-btn"
                onClick={e => { e.stopPropagation(); onPasswordAction("change", note._id); }}
                title="Change security password"
              >
                <i className="bi bi-key" />
              </button>
              <button
                className="delete-icon-btn"
                onClick={e => { e.stopPropagation(); onPasswordAction("disable", note._id); }}
                title="Remove security password"
              >
                <i className="bi bi-unlock" />
              </button>
            </>
          )}

          {/* SHARE ACTION */}
          <button
            className="delete-icon-btn delete-icon-btn--share"
            onClick={e => { e.stopPropagation(); onShare(note); }}
            title={note.sharedWith?.length > 0 ? `Sharing with (${note.sharedWith.length})` : "Share note"}
          >
            <i className={`bi ${note.sharedWith?.length > 0 ? "bi-people-fill" : "bi-share"}`} />
          </button>

          {/* DANGER ACTION */}
          <button
            className="delete-icon-btn delete-icon-btn--danger"
            onClick={handleDeleteClick}
            title="Delete note"
          >
            <i className="bi bi-trash3-fill" />
          </button>
          </>)}
        </div>
      </div>
    </div>
  );
}

export default NoteCard;