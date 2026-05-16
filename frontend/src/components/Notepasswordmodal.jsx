import { useState } from "react";
import "../assets/NotePasswordStyle.css";

const getToken    = () => localStorage.getItem("token") || "";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/* ═══════════════════════════════════════════════════════
   MODE:
     "enable"  – note chưa có password → bật (nhập 2 lần)
     "disable" – note đang có password → tắt (nhập password hiện tại)
     "change"  – đổi password (nhập cũ → nhập mới 2 lần)
     "unlock"  – mở khoá để xem/sửa/xoá note (nhập password)
═══════════════════════════════════════════════════════ */
function NotePasswordModal({ mode, noteId, onClose, onSuccess }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearError = () => setError("");

  const handleSubmit = async () => {
    setError("");

    // ── Validation theo từng mode ────────────────────────
    if (mode === "enable") {
      if (!newPw)               return setError("Vui lòng nhập mật khẩu.");
      if (newPw.length < 6)    return setError("Mật khẩu phải có ít nhất 6 ký tự.");
      if (newPw !== confirmPw) return setError("Mật khẩu xác nhận không khớp.");
    }
    if (mode === "disable") {
      if (!currentPw) return setError("Vui lòng nhập mật khẩu hiện tại để xác nhận.");
    }
    if (mode === "change") {
      if (!currentPw)            return setError("Vui lòng nhập mật khẩu hiện tại.");
      if (!newPw)                return setError("Vui lòng nhập mật khẩu mới.");
      if (newPw.length < 6)     return setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      if (newPw !== confirmPw)  return setError("Mật khẩu xác nhận không khớp.");
      if (currentPw === newPw)  return setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }
    if (mode === "unlock") {
      if (!currentPw) return setError("Vui lòng nhập mật khẩu để mở khoá.");
    }

    // ── Build payload ────────────────────────────────────
    const payload = { action: mode };
    if (mode === "enable")  payload.password = newPw;
    if (mode === "disable") payload.currentPassword = currentPw;
    if (mode === "change")  { payload.currentPassword = currentPw; payload.newPassword = newPw; }
    if (mode === "unlock")  payload.password = currentPw;

    // ── Gọi API ──────────────────────────────────────────
    setLoading(true);
    try {
      const res  = await fetch(`/api/notes/${noteId}/password`, {
        method:  "PATCH",
        headers: authHeaders(),
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Thao tác thất bại. Vui lòng thử lại.");
      onSuccess(data);
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const cfg = {
    enable:  { icon: "bi-lock-fill",        cls: "npm-icon--purple", title: "Bật bảo vệ mật khẩu", btnLabel: "Bật bảo vệ",   btnCls: "npm-btn--primary" },
    disable: { icon: "bi-unlock-fill",      cls: "npm-icon--danger",  title: "Tắt bảo vệ mật khẩu", btnLabel: "Tắt bảo vệ",   btnCls: "npm-btn--danger"  },
    change:  { icon: "bi-key-fill",         cls: "npm-icon--purple", title: "Đổi mật khẩu ghi chú", btnLabel: "Lưu mật khẩu", btnCls: "npm-btn--primary" },
    unlock:  { icon: "bi-shield-lock-fill", cls: "npm-icon--purple", title: "Nhập mật khẩu",         btnLabel: "Mở khoá",      btnCls: "npm-btn--primary" },
  }[mode];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="npm-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
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

        {/* ── Body ── */}
        <div className="npm-body">

          {/* Mô tả */}
          {mode === "enable" && (
            <p className="npm-desc">
              <i className="bi bi-info-circle" /> Ghi chú sẽ yêu cầu mật khẩu trước khi xem, sửa hoặc xoá.
            </p>
          )}
          {mode === "disable" && (
            <p className="npm-desc npm-desc--warning">
              <i className="bi bi-exclamation-triangle" /> Nhập mật khẩu hiện tại để xác nhận tắt bảo vệ.
            </p>
          )}
          {mode === "unlock" && (
            <p className="npm-desc">
              <i className="bi bi-lock" /> Ghi chú này được bảo vệ. Nhập mật khẩu để tiếp tục.
            </p>
          )}

          {/* Current password — disable / change / unlock */}
          {(mode === "disable" || mode === "change" || mode === "unlock") && (
            <PasswordField
              label={mode === "unlock" ? "Mật khẩu" : "Mật khẩu hiện tại"}
              placeholder={mode === "unlock" ? "Nhập mật khẩu..." : "Nhập mật khẩu hiện tại..."}
              icon="bi-lock"
              value={currentPw}
              show={showCurrent}
              onToggleShow={() => setShowCurrent(p => !p)}
              onChange={v => { setCurrentPw(v); clearError(); }}
              onEnter={handleSubmit}
              autoFocus
            />
          )}

          {/* New password — enable / change */}
          {(mode === "enable" || mode === "change") && (
            <>
              <PasswordField
                label={mode === "change" ? "Mật khẩu mới" : "Mật khẩu"}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)..."
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

          {/* Confirm password — enable / change */}
          {(mode === "enable" || mode === "change") && (
            <PasswordField
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu..."
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

          {/* Error */}
          {error && (
            <div className="npm-error">
              <i className="bi bi-exclamation-circle-fill" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="npm-footer">
          <button className="npm-btn npm-btn--cancel" onClick={onClose} disabled={loading}>
            Huỷ bỏ
          </button>
          <button
            className={`npm-btn ${cfg.btnCls} ${loading ? "npm-btn--loading" : ""}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <><i className="bi bi-arrow-repeat npm-spin" /> Đang xử lý...</>
              : <><i className={`bi ${cfg.icon}`} /> {cfg.btnLabel}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable password input field ────────────────────── */
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
        {hasMatch && (
          <i className={`npm-match-icon bi ${isMatch ? "bi-check-circle-fill npm-match-icon--ok" : "bi-x-circle-fill npm-match-icon--err"}`} />
        )}
      </div>
    </div>
  );
}

/* ── Password strength indicator ──────────────────────── */
function PasswordStrength({ password }) {
  const score = [
    password.length >= 6,
    password.length >= 10,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const levels = ["Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"];
  const clsMap = ["strength--1", "strength--2", "strength--3", "strength--4", "strength--5"];
  const idx    = Math.min(score, 4);

  return (
    <div className="npm-strength">
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