import { useState } from "react";
import "../assets/LabelManagerStyle.css";

const getToken = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

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

export default LabelManagerModal;
