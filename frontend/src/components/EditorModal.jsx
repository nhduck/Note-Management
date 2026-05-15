import { useState } from "react";
import LabelPickerDropdown from "./LabelPickerDropdown" 
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
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="editor-modal" onClick={e => e.stopPropagation()}>
        <div className="editor-header">
          <div className="editor-header-left">
            <div className="editor-icon-wrap"><i className="bi bi-pencil-square" /></div>
            <span className="editor-header-label">{activeNote._id ? "Chỉnh sửa ghi chú" : "Ghi chú mới"}</span>
          </div>
          <button className="editor-close-btn" onClick={onClose}>
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
                  <button className="chip-remove-btn" onClick={() => onToggleLabelOnNote(lbl)} title="Gỡ nhãn">×</button>
                </span>
              ))}
            </div>
          )}

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
                  onToggle={onToggleLabelOnNote}
                  onClose={() => setShowLabelPicker(false)}
                  noteId={activeNote._id}
                />
              )}
            </div>
            <label className={`upload-btn ${uploading ? "upload-btn--loading" : ""}`} title="Thêm ảnh">
              {uploading ? <><i className="bi bi-arrow-repeat spin" /> Đang tải...</> : <><i className="bi bi-image" /> Thêm ảnh</>}
              <input type="file" accept="image/*" multiple hidden onChange={onImageUpload} disabled={uploading} />
            </label>
            <button className="editor-done-btn" onClick={onClose}>Xong</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorModal;
