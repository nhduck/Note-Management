import { useRef, useEffect } from "react";
import "../assets/LabelPickerStyle.css";

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

export default LabelPickerDropdown;
