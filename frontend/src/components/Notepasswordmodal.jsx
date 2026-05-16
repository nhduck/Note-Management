import { useState } from "react";
import "../assets/NotePasswordStyle.css";

// Helper functions to retrieve token and set headers for authenticated API updates
const getToken    = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/* ═══════════════════════════════════════════════════════
   MODE OVERVIEW:
     "enable"  – Note has no password → turn it on (input twice)
     "disable" – Note is protected    → turn it off (input current password)
     "change"  – Update password      → (input current → input new password twice)
     "unlock"  – Open note to view/edit/delete (input password)
═══════════════════════════════════════════════════════ */
function NotePasswordModal({ mode, noteId, onClose, onSuccess }) {
  // Local input field and operational control states
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  // States to toggle password visibility (masked text vs plain text)
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearError = () => setError("");

  // Main Form Submitter: Validates constraints and patches data to the server
  const handleSubmit = async () => {
    setError("");

    // ── Input Field Validations by Workflow Mode ────────────────────────
    if (mode === "enable") {
      if (!newPw)       return setError("Please enter a password.");
      if (newPw.length < 6)    return setError("Password must be at least 6 characters long.");
      if (newPw !== confirmPw) return setError("Passwords do not match.");
    }
    if (mode === "disable") {
      if (!currentPw) return setError("Please enter your current password to confirm.");
    }
    if (mode === "change") {
      if (!currentPw)          return setError("Please enter your current password.");
      if (!newPw)              return setError("Please enter a new password.");
      if (newPw.length < 6)     return setError("New password must be at least 6 characters long.");
      if (newPw !== confirmPw)  return setError("Passwords do not match.");
      if (currentPw === newPw)  return setError("New password must be different from current password.");
    }
    if (mode === "unlock") {
      if (!currentPw) return setError("Please enter the password to unlock.");
    }

    // ── Construct Request Payload Structure ────────────────────────────────────
    const payload = { action: mode };
    if (mode === "enable")  payload.password = newPw;
    if (mode === "disable") payload.currentPassword = currentPw;
    if (mode === "change")  { payload.currentPassword = currentPw; payload.newPassword = newPw; }
    if (mode === "unlock")  payload.password = currentPw;

    // ── Trigger API Dispatch Pipeline ──────────────────────────────────────────
    setLoading(true);
    try {
      const res  = await fetch(`/api/notes/${noteId}/password`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Action failed. Please try again.");
      onSuccess(data); // Notify parent component of successful change
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic UI Theme Configurations mapping localized labels based on current operation mode
  const cfg = {
    enable:  { icon: "bi-lock-fill",        cls: "npm-icon--purple", title: "Enable Password Protection", btnLabel: "Protect Note",   btnCls: "npm-btn--primary" },
    disable: { icon: "bi-unlock-fill",      cls: "npm-icon--danger",  title: "Disable Password Protection", btnLabel: "Remove Protection",   btnCls: "npm-btn--danger"  },
    change:  { icon: "bi-key-fill",         cls: "npm-icon--purple", title: "Change Note Password", btnLabel: "Save Password", btnCls: "npm-btn--primary" },
    unlock:  { icon: "bi-shield-lock-fill", cls: "npm-icon--purple", title: "Enter Password",         btnLabel: "Unlock Note",      btnCls: "npm-btn--primary" },
  }[mode];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="npm-modal" onClick={e => e.stopPropagation()}>

        {/* ── HEADER SECTION ── */}
        <div className="npm-header">
          <div className="npm-header-left">
            <div className={`npm-icon-wrap ${cfg.cls}`}>
              <i className={`bi ${cfg.icon}`} />
            </div>
            <span className="npm-title">{cfg.title}</span>
          </div>
          <button className="npm-close-btn" onClick={onClose} disabled={loading}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* ── BODY FORM SECTION ── */}
        <div className="npm-body">

          {/* Conditional Guidance Descriptions */}
          {mode === "enable" && (
            <p className="npm-desc">
              <i className="bi bi-info-circle" /> This note will require a password before it can be viewed, edited, or deleted.
            </p>
          )}
          {mode === "disable" && (
            <p className="npm-desc npm-desc--warning">
              <i className="bi bi-exclamation-triangle" /> Enter your current password to confirm removing security protection.
            </p>
          )}
          {mode === "unlock" && (
            <p className="npm-desc">
              <i className="bi bi-lock" /> This note is protected. Enter the password to continue.
            </p>
          )}

          {/* Current Password Field: Rendered during disable, change, or unlock tasks */}
          {(mode === "disable" || mode === "change" || mode === "unlock") && (
            <PasswordField
              label={mode === "unlock" ? "Password" : "Current Password"}
              placeholder={mode === "unlock" ? "Enter password..." : "Enter current password..."}
              icon="bi-lock"
              value={currentPw}
              show={showCurrent}
              onToggleShow={() => setShowCurrent(p => !p)}
              onChange={v => { setCurrentPw(v); clearError(); }}
              onEnter={handleSubmit}
              autoFocus
            />
          )}

          {/* New Password Field: Rendered during entry creation or adjustment workflows */}
          {(mode === "enable" || mode === "change") && (
            <>
              <PasswordField
                label={mode === "change" ? "New Password" : "Password"}
                placeholder="Enter password (min 6 characters)..."
                icon="bi-key"
                value={newPw}
                show={showNew}
                onToggleShow={() => setShowNew(p => !p)}
                onChange={v => { setNewPw(v); clearError(); }}
                autoFocus={mode === "enable"}
              />
              {newPw && <PasswordStrength password={newPw} />}
            </>
          )}

          {/* Password Confirmation Field: Checks entry parity */}
          {(mode === "enable" || mode === "change") && (
            <PasswordField
              label="Confirm Password"
              placeholder="Re-enter password..."
              icon="bi-lock-fill"
              value={confirmPw}
              show={showConfirm}
              onToggleShow={() => setShowConfirm(p => !p)}
              onChange={v => { setConfirmPw(v); clearError(); }}
              onEnter={handleSubmit}
              matchValue={newPw}
              showMatchIcon
            />
          )}

          {/* Action Validation Error Display */}
          {error && (
            <div className="npm-error">
              <i className="bi bi-exclamation-circle-fill" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="npm-footer">
          <button className="npm-btn npm-btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`npm-btn ${cfg.btnCls} ${loading ? "npm-btn--loading" : ""}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <><i className="bi bi-arrow-repeat npm-spin" /> Processing...</>
              : <><i className={`bi ${cfg.icon}`} /> {cfg.btnLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable password input field component ────────────────────── */
function PasswordField({ label, placeholder, icon, value, show, onToggleShow, onChange, onEnter, autoFocus, matchValue, showMatchIcon }) {
  const hasMatch = showMatchIcon && value.length > 0;
  const isMatch  = value === matchValue;

  return (
    <div className="npm-field">
      <label className="npm-label">{label}</label>
      <div className="npm-input-wrap">
        <i className={`bi ${icon} npm-input-icon`} />
        <input
          className={`npm-input ${hasMatch && !isMatch ? "npm-input--error" : hasMatch && isMatch ? "npm-input--ok" : ""}`}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onEnter?.()}
          autoFocus={autoFocus}
        />
        <button className="npm-eye-btn" type="button" onClick={onToggleShow} tabIndex={-1}>
          <i className={`bi ${show ? "bi-eye-slash" : "bi-eye"}`} />
        </button>
        {/* Verification Checkmark or Cross Indicator Overlay */}
        {hasMatch && (
          <i className={`npm-match-icon bi ${isMatch ? "bi-check-circle-fill npm-match-icon--ok" : "bi-x-circle-fill npm-match-icon--err"}`} />
        )}
      </div>
    </div>
  );
}

/* ── Password complexity strength indicator ──────────────────────── */
function PasswordStrength({ password }) {
  // Generates safety weight points checking length and regex validation requirements
  const score = [
    password.length >= 6,
    password.length >= 10,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const levels = ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"];
  const clsMap = ["strength--1", "strength--2", "strength--3", "strength--4", "strength--5"];
  const idx    = Math.min(score, 4);

  return (
    <div className="npm-strength">
      {/* Structural visual bars reflecting current safety metric array mapping */}
      <div className="npm-strength-bars">
        {clsMap.map((cls, i) => (
          <div key={i} className={`npm-strength-bar ${i < score ? clsMap[idx] : ""}`} />
        ))}
      </div>
      <span className={`npm-strength-label ${clsMap[idx]}`}>{levels[idx]}</span>
    </div>
  );
}

export default NotePasswordModal;