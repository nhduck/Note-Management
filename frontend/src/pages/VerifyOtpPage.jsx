import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "../assets/LoginStyle.css";
import "../assets/VerifyOtpStyle.css";

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

const VerifyOtpPage = () => {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Email và type được truyền qua router state
  // type: "register" (xác thực tài khoản) | "reset" (quên mật khẩu)
  const email = location.state?.email || "your email";
  const type = location.state?.type || "register";

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const focusNext = (index) => {
    if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const focusPrev = (index) => {
    if (index > 0) inputsRef.current[index - 1]?.focus();
  };

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    setError("");
    if (val) focusNext(index);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const next = [...otp];
        next[index] = "";
        setOtp(next);
      } else {
        focusPrev(index);
      }
    } else if (e.key === "ArrowLeft") {
      focusPrev(index);
    } else if (e.key === "ArrowRight") {
      focusNext(index);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    try {
      const res = await fetch("api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, type }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        if (type === "reset") {
          // Chuyển sang trang đặt lại mật khẩu, truyền kèm email và otp để xác thực lại
          setTimeout(() => navigate("/reset-password", { state: { email, otp: code } }), 1200);
        } else {
          // Đăng ký xong -> về trang login
          setTimeout(() => navigate("/login"), 1200);
        }
      } else {
        setError(data.message || "Invalid or expired code. Please try again.");
        setOtp(Array(OTP_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
      }
    } catch {
      setError("Cannot connect to server.");
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      // reset dùng lại endpoint forgot-password để tạo OTP mới
      // register dùng endpoint resend-otp
      const url = type === "reset" ? "api/forgot-password" : "api/resend-otp";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setCountdown(RESEND_COUNTDOWN);
        setOtp(Array(OTP_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setResending(false);
    }
  };

  const filled = otp.filter(Boolean).length;
  const progress = (filled / OTP_LENGTH) * 100;

  return (
    <div className="form-side">
      <main className="login-card otp-card">
        {/* Icon */}
        <div className="otp-icon-wrap">
          <div className={`otp-icon-ring ${success ? "otp-icon-ring--success" : ""}`}>
            <i className={`bi ${success ? "bi-check-lg" : "bi-shield-lock"} otp-icon`} aria-hidden="true"></i>
          </div>
        </div>

        <h1 className="card-title text-center">Verify Your Email</h1>
        <p className="card-subtitle text-center text-muted" style={{ marginBottom: "8px" }}>
          We've sent a 6-digit code to
        </p>
        <p className="otp-email-badge">{email}</p>

        {/* Progress bar */}
        <div className="otp-progress-track">
          <div className="otp-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* OTP Inputs */}
          <div className="otp-inputs">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className={`otp-input${error ? " err" : ""}${digit ? " otp-input--filled" : ""}${success ? " otp-input--success" : ""}`}
                autoFocus={i === 0}
                autoComplete="one-time-code"
                aria-label={`Digit ${i + 1}`}
                disabled={success}
              />
            ))}
          </div>

          {error && (
            <p className="err-msg text-center" style={{ marginBottom: "12px" }}>
              <i className="bi bi-exclamation-circle"></i> {error}
            </p>
          )}

          {success && (
            <p className="otp-success-msg">
              <i className="bi bi-check-circle-fill"></i> Verified! Redirecting…
            </p>
          )}

          <button
            type="submit"
            className="btn-submit"
            disabled={success}
            style={{ marginTop: "4px", padding: "11px" }}
          >
            Verify Code <i className="bi bi-arrow-right-short"></i>
          </button>
        </form>

        {/* Resend */}
        <div className="otp-resend-row">
          <span className="small text-muted">Didn't receive the code?</span>
          {countdown > 0 ? (
            <span className="otp-countdown">
              Resend in <strong>{countdown}s</strong>
            </span>
          ) : (
            <button
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? "Sending…" : "Resend Code"}
            </button>
          )}
        </div>

        <div className="mt-3 text-center">
          <Link to="/login" className="text-decoration-none small" style={{ color: "var(--text-muted)" }}>
            <i className="bi bi-arrow-left"></i> Back to Login
          </Link>
        </div>
      </main>
    </div>
  );
};

export default VerifyOtpPage;