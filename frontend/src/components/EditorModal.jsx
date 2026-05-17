import { useState, useEffect, useRef } from "react";
import LabelPickerDropdown from "./LabelPickerDropdown";
import { useSocket, emitTyping } from "../hooks/useSocket";
import "../assets/EditorModalStyle.css";

function EditorModal({
  activeNote,
  setActiveNote,
  saveStatus,
  uploading,
  labels,
  showLabelPicker,
  setShowLabelPicker,
  onClose,
  onImageUpload,
  onRemoveImage,
  onToggleLabelOnNote,
  readOnly = false,
  profile,
}) {
  // Username of the remote user whose update was last received
  const [remoteUser, setRemoteUser]   = useState(null);
  const remoteTimerRef                = useRef(null);

  // Username of whoever is currently typing (clears after 2s of silence)
  const [typingUser, setTypingUser]   = useState(null);
  const typingTimerRef                = useRef(null);

  // Called when the server broadcasts a save from another user
  const handleRemoteUpdate = (data) => {
    // Ignore our own saves that bounce back through the room
    if (data.updatedBy === profile?.id) return;

    // Apply the incoming changes to the local note state
    setActiveNote((prev) => ({
      ...prev,
      title:   data.title,
      content: data.content,
      images:  data.images,
      labels:  data.labels,
      color:   data.color,
    }));

    // Show the "updated by someone" banner for 3 seconds
    setRemoteUser(data.updatedBy);
    clearTimeout(remoteTimerRef.current);
    remoteTimerRef.current = setTimeout(() => setRemoteUser(null), 3000);
  };

  // Called when the server broadcasts a typing event from another user
  const handleRemoteTyping = (data) => {
    // Ignore events that originated from the current user
    if (data.userId === profile?.id) return;

    setTypingUser(data.username || "Someone");

    // Auto-clear after 2s — if the user keeps typing, the timer resets each time
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTypingUser(null), 2000);
  };

  // Connect to the note room (only when the note has a saved _id)
  useSocket(
    activeNote._id || null,
    handleRemoteUpdate,
    handleRemoteTyping,
    profile
  );

  // Clear timers on unmount to avoid state updates on unmounted component
  useEffect(() => {
    return () => {
      clearTimeout(remoteTimerRef.current);
      clearTimeout(typingTimerRef.current);
    };
  }, []);

  // When the local user types, broadcast a typing event to the room
  const handleContentChange = (e) => {
    if (readOnly) return;
    setActiveNote({ ...activeNote, content: e.target.value });

    // Only emit if the note is already saved (has an _id)
    if (activeNote._id) {
      emitTyping(activeNote._id, profile?.id, profile?.username);
    }
  };

  const handleTitleChange = (e) => {
    if (readOnly) return;
    setActiveNote({ ...activeNote, title: e.target.value });

    if (activeNote._id) {
      emitTyping(activeNote._id, profile?.id, profile?.username);
    }
  };

  return (
    // Backdrop — clicking outside the modal closes it
    <div className="modal-overlay" onClick={onClose}>

      {/* Stop propagation so clicks inside the modal do not close it */}
      <div className="editor-modal" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="editor-header">
          <div className="editor-header-left">
            <div className="editor-icon-wrap">
              <i className="bi bi-pencil-square" />
            </div>
            <span className="editor-header-label">
              {activeNote._id ? "Edit Note" : "New Note"}
            </span>
          </div>

          {/* Real-time badge: shown while another user's update is fresh */}
          {remoteUser && (
            <span className="editor-realtime-badge">
              <span className="realtime-dot" />
              Being edited by someone else
            </span>
          )}

          <button className="editor-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* BODY */}
        <div className="editor-body">

          {/* View-only notice for shared users without edit permission */}
          {readOnly && (
            <div
              style={{
                background: "var(--primary-ring)",
                color: "var(--accent)",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              You have view-only access to this note
            </div>
          )}

          {/* Banner shown when note content was just updated by a remote user */}
          {remoteUser && !readOnly && (
            <div className="editor-realtime-banner">
              Content was just updated in real time
            </div>
          )}

          <div className="editor-field">
            <label className="editor-label">Title</label>
            <input
              className="editor-title"
              placeholder="Enter title..."
              value={activeNote.title}
              onChange={handleTitleChange}
              readOnly={readOnly}
              style={readOnly ? { opacity: 0.7, cursor: "default" } : {}}
            />
          </div>

          <div className="editor-field editor-field--grow">
            <label className="editor-label">Content</label>
            <textarea
              className="editor-content"
              placeholder="Start typing your note..."
              value={activeNote.content}
              onChange={handleContentChange}
              readOnly={readOnly}
              style={readOnly ? { opacity: 0.7, cursor: "default" } : {}}
            />
          </div>

          {/* Typing indicator — appears when a remote user is actively typing */}
          {typingUser && (
            <div className="editor-typing-indicator">
              <span className="typing-dots" />
              {typingUser} is typing...
            </div>
          )}

          {/* Attached labels */}
          {(activeNote.labels || []).length > 0 && (
            <div className="editor-labels-row">
              {activeNote.labels.map((lbl) => (
                <span key={lbl._id || lbl} className="editor-label-chip">
                  <i className="bi bi-tag-fill" /> {lbl.name || lbl}
                  {!readOnly && (
                    <button
                      className="chip-remove-btn"
                      onClick={() => onToggleLabelOnNote(lbl)}
                      title="Remove label"
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Attached images */}
          {(activeNote.images || []).length > 0 && (
            <div className="editor-images">
              {activeNote.images.map((imgSrc, idx) => (
                <div key={idx} className="image-preview-wrapper">
                  <img src={imgSrc} alt="attachment" className="image-preview" />
                  <button className="remove-img-btn" onClick={() => onRemoveImage(idx)}>
                    <i className="bi bi-x" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="editor-footer">
          <div className="editor-status">
            {saveStatus === "saving" && (
              <><span className="status-dot status-dot--saving" /><span>Saving...</span></>
            )}
            {saveStatus === "saved" && (
              <><i className="bi bi-cloud-check-fill status-icon--saved" /><span>Auto-saved</span></>
            )}
            {saveStatus === "idle" && (
              <><i className="bi bi-cloud status-icon--idle" /><span>No changes</span></>
            )}
          </div>

          <div className="editor-actions">
            {!readOnly && (
              <>
                <div className="label-picker-wrap">
                  <button
                    className="footer-icon-btn"
                    onClick={() => setShowLabelPicker((p) => !p)}
                    title="Add label"
                  >
                    <i className="bi bi-tag" />
                  </button>
                  {showLabelPicker && (
                    <LabelPickerDropdown
                      labels={labels}
                      activeNoteLabels={activeNote.labels || []}
                      onToggle={onToggleLabelOnNote}
                      onClose={() => setShowLabelPicker(false)}
                      noteId={activeNote._id}
                    />
                  )}
                </div>

                <label
                  className={`upload-btn ${uploading ? "upload-btn--loading" : ""}`}
                  title="Add image"
                >
                  {uploading ? (
                    <><i className="bi bi-arrow-repeat spin" /> Uploading...</>
                  ) : (
                    <><i className="bi bi-image" /> Add image</>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={onImageUpload}
                    disabled={uploading}
                  />
                </label>
              </>
            )}

            <button className="editor-done-btn" onClick={onClose}>
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default EditorModal;