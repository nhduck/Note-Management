import { useState } from "react";
import LabelPickerDropdown from "./LabelPickerDropdown";
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
}) {
  return (
    // Backdrop overlay: clicks here close the modal via onClose
    <div className="modal-overlay" onClick={onClose}>
      
      {/* Main modal container: prevents propagation to avoid accidental closing */}
      <div className="editor-modal" onClick={e => e.stopPropagation()}>
        
        {/* HEADER SECTION: Displays icon, dynamic title (Edit/New), and close button */}
        <div className="editor-header">
          <div className="editor-header-left">
            <div className="editor-icon-wrap"><i className="bi bi-pencil-square" /></div>
            {/* Dynamic header text based on whether the note already has an ID */}
            <span className="editor-header-label">
              {activeNote._id ? "Edit Note" : "New Note"}
            </span>
          </div>
          <button className="editor-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* BODY SECTION: Contains inputs for Title, Content, active Labels, and Image previews */}
        <div className="editor-body">
          {readOnly && (
            <div style={{ background: "var(--primary-ring)", color: "var(--accent)", borderRadius: "8px", padding: "7px 12px", fontSize: "12px", fontWeight: 600, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="bi bi-eye-fill" /> You have view-only access to this note
            </div>
          )}
          {/* Title Input field */}
          <div className="editor-field">
            <label className="editor-label">Title</label>
            <input 
              className="editor-title" 
              placeholder="Enter title..."
              value={activeNote.title}
              onChange={e => !readOnly && setActiveNote({ ...activeNote, title: e.target.value })}
              readOnly={readOnly}
              style={readOnly ? { opacity: 0.7, cursor: "default" } : {}}
            />
          </div>
          
          {/* Content Textarea field (grows vertically) */}
          <div className="editor-field editor-field--grow">
            <label className="editor-label">Content</label>
            <textarea 
              className="editor-content" 
              placeholder="Start typing your note..."
              value={activeNote.content}
              onChange={e => !readOnly && setActiveNote({ ...activeNote, content: e.target.value })}
              readOnly={readOnly}
              style={readOnly ? { opacity: 0.7, cursor: "default" } : {}}
            />
          </div>

          {/* Active Labels Row: renders attached labels as chips with a remove button */}
          {(activeNote.labels || []).length > 0 && (
            <div className="editor-labels-row">
              {activeNote.labels.map(lbl => (
                <span key={lbl._id || lbl} className="editor-label-chip">
                  <i className="bi bi-tag-fill" /> {lbl.name || lbl}
                  {!readOnly && <button className="chip-remove-btn" onClick={() => onToggleLabelOnNote(lbl)} title="Remove label">×</button>}
                </span>
              ))}
            </div>
          )}

          {/* Image Previews Grid: displays uploaded images with a remove button overlay */}
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

        {/* FOOTER SECTION: Displays real-time auto-save status and action buttons */}
        <div className="editor-footer">
          {/* Auto-save status feedback indicators */}
          <div className="editor-status">
            {saveStatus === "saving" && <><span className="status-dot status-dot--saving" /><span>Saving...</span></>}
            {saveStatus === "saved"  && <><i className="bi bi-cloud-check-fill status-icon--saved" /><span>Auto-saved</span></>}
            {saveStatus === "idle"   && <><i className="bi bi-cloud status-icon--idle" /><span>No changes</span></>}
          </div>
          
          {/* Action trigger controls: Label picker dropdown, Image upload input, and Done button */}
          <div className="editor-actions">
            {/* Label picker and image upload: hidden in readOnly mode */}
            {!readOnly && (
              <>
                <div className="label-picker-wrap">
                  <button className="footer-icon-btn" onClick={() => setShowLabelPicker(p => !p)} title="Add label">
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
                <label className={`upload-btn ${uploading ? "upload-btn--loading" : ""}`} title="Add image">
                  {uploading ? <><i className="bi bi-arrow-repeat spin" /> Uploading...</> : <><i className="bi bi-image" /> Add image</>}
                  <input type="file" accept="image/*" multiple hidden onChange={onImageUpload} disabled={uploading} />
                </label>
              </>
            )}
            <button className="editor-done-btn" onClick={onClose}>Done</button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default EditorModal;