import { useState } from "react";
import "../assets/LabelManagerStyle.css";

// Helper functions to get JWT token and construct standard authorization headers
const getToken = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

function LabelManagerModal({ labels, userId, onClose, onChanged }) {
  // Component states for managing local list, fields, errors, and conditional UI states
  const [localLabels, setLocalLabels]   = useState(labels);
  const [newName, setNewName]           = useState("");
  const [editingId, setEditingId]       = useState(null);
  const [editName, setEditName]         = useState("");
  const [error, setError]               = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Core Handler: Create/Add a new label via POST request
  const handleAdd = async () => {
    setError("");
    if (!newName.trim()) return setError("Label name cannot be empty");
    try {
      const res  = await fetch("/api/labels", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ userId, name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to create label");
      
      // Update local state, keep the list sorted alphabetically, and clear input
      setLocalLabels(prev => [...prev, data.label].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      onChanged(); // Notify parent component of data changes
    } catch { setError("Connection error"); }
  };

  // Switch UI mode to "Editing" for a specific label item
  const startEdit = (lbl) => { setEditingId(lbl._id); setEditName(lbl.name); setError(""); };

  // Core Handler: Update/Rename an existing label via PUT request
  const handleSaveEdit = async (id) => {
    setError("");
    if (!editName.trim()) return setError("Label name cannot be empty");
    try {
      const res  = await fetch(`/api/labels/${id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ name: editName.trim(), userId }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to rename label");
      
      // Update the edited label in state and re-sort alphabetically
      setLocalLabels(prev =>
        prev.map(l => l._id === id ? data.label : l).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      onChanged();
    } catch { setError("Connection error"); }
  };

  // Core Handler: Delete a label from database via DELETE request
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/labels/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return setError("Failed to delete label");
      
      // Remove deleted item from local view state and close confirmation popup
      setLocalLabels(prev => prev.filter(l => l._id !== id));
      setDeleteTarget(null);
      onChanged();
    } catch { setError("Connection error"); }
  };

  return (
    // Backdrop modal overlay: clicks outside the modal will trigger close
    <div className="modal-overlay" onClick={onClose}>
      <div className="label-manager-modal" onClick={e => e.stopPropagation()}>
        
        {/* MODAL HEADER: Title and close action trigger */}
        <div className="lm-header">
          <div className="lm-title-wrap">
            <div className="editor-icon-wrap"><i className="bi bi-tags-fill" /></div>
            <span className="lm-title">Manage Labels</span>
          </div>
          <button className="editor-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {/* INPUT ROW: Create new labels quickly (supports Enter key) */}
        <div className="lm-add-row">
          <input className="lm-input" placeholder="New label name..."
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <button className="lm-add-btn" onClick={handleAdd}><i className="bi bi-plus-lg" /> Add</button>
        </div>

        {/* ERROR FEEDBACK: Alerts user of validation or backend request failures */}
        {error && <p className="lm-error"><i className="bi bi-exclamation-circle" /> {error}</p>}

        {/* LABELS LIST: Iterates over user's existing labels */}
        <div className="lm-list">
          {localLabels.length === 0 && <p className="lm-empty">No labels yet. Add your first label!</p>}
          {localLabels.map(lbl => (
            <div key={lbl._id} className="lm-item">
              
              {/* CONDITIONAL SUB-VIEW: Inline Edit Mode vs Standard Display Mode */}
              {editingId === lbl._id ? (
                <div className="lm-edit-row">
                  <input className="lm-input lm-input--inline" value={editName} autoFocus
                    onChange={e => { setEditName(e.target.value); setError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(lbl._id); if (e.key === "Escape") setEditingId(null); }} />
                  <button className="lm-save-btn"   onClick={() => handleSaveEdit(lbl._id)} title="Save"><i className="bi bi-check-lg" /></button>
                  <button className="lm-cancel-btn" onClick={() => setEditingId(null)}       title="Cancel"><i className="bi bi-x-lg" /></button>
                </div>
              ) : (
                <>
                  <span className="lm-label-name"><i className="bi bi-tag-fill lm-tag-icon" /> {lbl.name}</span>
                  <div className="lm-item-actions">
                    <button className="lm-edit-btn"   onClick={() => startEdit(lbl)}      title="Rename"><i className="bi bi-pencil" /></button>
                    <button className="lm-delete-btn" onClick={() => setDeleteTarget(lbl)} title="Delete"><i className="bi bi-trash3" /></button>
                  </div>
                </>
              )}
              
            </div>
          ))}
        </div>

        {/* NESTED CONFIRMATION MODAL: Safety check wrapper before permanent deletion */}
        {deleteTarget && (
          <div className="lm-confirm-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="lm-confirm-box" onClick={e => e.stopPropagation()}>
              <i className="bi bi-exclamation-triangle-fill lm-confirm-icon" />
              <p>Delete label <strong>"{deleteTarget.name}"</strong>?</p>
              <p className="lm-confirm-note">Notes attached to this label will not be deleted.</p>
              <div className="lm-confirm-actions">
                <button className="delete-cancel-btn"  onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="delete-confirm-btn" onClick={() => handleDelete(deleteTarget._id)}>
                  <i className="bi bi-trash3" /> Delete label
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