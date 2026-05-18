import { useState, useEffect } from "react";
import "../assets/ShareModalStyle.css";

const getToken = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

function ShareModal({ note, profile, onClose, onChanged }) {
  const [email, setEmail]           = useState("");
  const [permission, setPermission] = useState("view");
  const [sharedWith, setSharedWith] = useState(note.sharedWith || []);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  // Sync sharedWith if note prop changes
  useEffect(() => { setSharedWith(note.sharedWith || []); }, [note]);

  const handleShare = async () => {
    setError(""); setSuccess("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return setError("Please enter a recipient email.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return setError("Invalid email address.");

    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${note._id}/share`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ email: trimmed, permission, requesterId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to share.");
      setSharedWith(data.sharedWith);
      setEmail("");
      setSuccess("Shared successfully!");
      onChanged?.();
      setTimeout(() => setSuccess(""), 2500);
    } catch {
      setError("Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePermission = async (targetUserId, newPermission) => {
    setError("");
    try {
      const res = await fetch(`/api/notes/${note._id}/share/permission`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ targetUserId, permission: newPermission, requesterId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to update permission.");
      setSharedWith(data.sharedWith);
      onChanged?.();
    } catch {
      setError("Connection error.");
    }
  };

  const handleRevoke = async (targetUserId) => {
    setError("");
    try {
      const res = await fetch(`/api/notes/${note._id}/share/${targetUserId}`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ requesterId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to revoke.");
      setSharedWith(data.sharedWith);
      onChanged?.();
    } catch {
      setError("Connection error.");
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm("Revoke access for everyone?")) return;
    setError("");
    try {
      const res = await fetch(`/api/notes/${note._id}/share`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ requesterId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed to revoke.");
      setSharedWith([]);
      onChanged?.();
    } catch {
      setError("Connection error.");
    }
  };

  return (
    <div className="share-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="share-modal">
        {/* Header */}
        <div className="share-header">
          <div className="share-header-left">
            <div className="share-header-icon"><i className="bi bi-share-fill" /></div>
            <div>
              <div className="share-title">Share Note</div>
              <div className="share-subtitle">
                {note.title?.trim() || "Untitled"}
              </div>
            </div>
          </div>
          <button className="share-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Add recipient */}
        <div className="share-add-section">
          <div className="share-add-label">Add recipient</div>
          <div className="share-input-row">
            <div className="share-input-wrap">
              <i className="bi bi-envelope share-input-icon" />
              <input
                className="share-email-input"
                type="email"
                placeholder="Enter registered email..."
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleShare()}
              />
            </div>
            <select
              className="share-perm-select"
              value={permission}
              onChange={e => setPermission(e.target.value)}
            >
              <option value="view">View only</option>
              <option value="edit">Edit</option>
            </select>
            <button className="share-add-btn" onClick={handleShare} disabled={loading}>
              {loading ? <i className="bi bi-arrow-repeat spin" /> : <><i className="bi bi-person-plus-fill" /> Add</>}
            </button>
          </div>
          {error   && <div className="share-msg share-msg--error"><i className="bi bi-exclamation-circle" /> {error}</div>}
          {success && <div className="share-msg share-msg--success"><i className="bi bi-check-circle" /> {success}</div>}
        </div>

        {/* Current shares */}
        <div className="share-list-section">
          <div className="share-list-header">
            <span className="share-add-label">
              Sharing with {sharedWith.length > 0 ? `(${sharedWith.length} ${sharedWith.length === 1 ? 'person' : 'people'})` : ""}
            </span>
            {sharedWith.length > 1 && (
              <button className="share-revoke-all-btn" onClick={handleRevokeAll}>
                <i className="bi bi-shield-x" /> Revoke all
              </button>
            )}
          </div>

          {sharedWith.length === 0 ? (
            <div className="share-empty">
              <i className="bi bi-people" />
              <span>Not shared with anyone</span>
            </div>
          ) : (
            <div className="share-list">
              {sharedWith.map(entry => (
                <div className="share-entry" key={entry.userId}>
                  <div className="share-entry-avatar">
                    {entry.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="share-entry-info">
                    <div className="share-entry-email">{entry.email}</div>
                    <div className="share-entry-date">
                      Shared on {new Date(entry.sharedAt).toLocaleDateString("en-US")}
                    </div>
                  </div>
                  <select
                    className="share-perm-select share-perm-select--sm"
                    value={entry.permission}
                    onChange={e => handleChangePermission(entry.userId, e.target.value)}
                  >
                    <option value="view">View only</option>
                    <option value="edit">Edit</option>
                  </select>
                  <button
                    className="share-revoke-btn"
                    onClick={() => handleRevoke(entry.userId)}
                    title="Revoke access"
                  >
                    <i className="bi bi-person-dash-fill" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="share-footer">
          <div className="share-footer-note">
            <i className="bi bi-info-circle" />
            Recipients must have a NoteSpace account to access shared notes.
          </div>
          <button className="share-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;