import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/ForgotPassStyle.css";

const validate = (form, step) => {
  const errors = {};
  if (step === 1) {
    if (!form.email) errors.email = "Please enter your email.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = "Invalid email address.";
  } else if (step === 2) {
    if (!form.otp) errors.otp = "Please enter the reset code.";
    else if (form.otp.length < 6) errors.otp = "Code must be at least 6 characters.";

    if (!form.newPassword) errors.newPassword = "Please enter a new password.";
    else if (form.newPassword.length < 6) errors.newPassword = "Password must be at least 6 characters.";

    if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (form.newPassword !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
};

const ForgotPassPage = () => {
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  
  // step 1: Nhập email | step 2: Nhập OTP & Đổi mật khẩu | step 3: Thành công
  const [step, setStep] = useState(1); 
  
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  
  // Ẩn/hiện mật khẩu
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    if (apiError) setApiError("");
  };

  // --- XỬ LÝ BƯỚC 1: GỬI EMAIL LẤY MÃ ---
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    const errs = validate(form, 1);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(2); // Chuyển sang bước nhập mã
      } else {
        setApiError(data.message || "Email is not registered.");
      }
    } catch (error) {
      setApiError("Server error. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- XỬ LÝ BƯỚC 2: XÁC THỰC MÃ & ĐỔI MẬT KHẨU ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const errs = validate(form, 2);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          otp: form.otp,
          newPassword: form.newPassword
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(3); // Chuyển sang bước thành công
        setTimeout(() => navigate("/login"), 3000); // Tự động về trang login sau 3s
      } else {
        setApiError(data.message || "Invalid code or reset failed.");
      }
    } catch (error) {
      setApiError("Server error. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-side">
      <main className="forgot-card">
        
        {/* --- BƯỚC 1: NHẬP EMAIL --- */}
        {step === 1 && (
          <>
            <div className="icon-wrap">
              <i className="bi bi-shield-lock"></i>
            </div>
            <h1 className="card-title">Forgot Password?</h1>
            <p className="card-subtitle text-muted">
              No worries! Enter your email and we'll send you a reset code.
            </p>

            <form onSubmit={handleRequestOTP} noValidate>
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div className="input-wrap">
                  <i className="bi bi-envelope i-icon" aria-hidden="true"></i>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    className={`form-input ${(errors.email || apiError) ? " err" : ""}`}
                    value={form.email}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.email}</p>}
                {apiError && !errors.email && <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {apiError}</p>}
              </div>

              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? "Sending..." : (
                  <>Send Reset Code <i className="bi bi-send"></i></>
                )}
              </button>
            </form>
          </>
        )}

        {/* --- BƯỚC 2: NHẬP MÃ OTP VÀ MẬT KHẨU MỚI --- */}
        {step === 2 && (
          <>
            <div className="icon-wrap">
              <i className="bi bi-key"></i>
            </div>
            <h1 className="card-title">Reset Password</h1>
            <p className="card-subtitle text-muted">
              Code sent to <strong>{form.email}</strong>. Please enter it below.
            </p>

            <form onSubmit={handleResetPassword} noValidate>
              {/* Code OTP */}
              <div className="form-group mb-3">
                <label className="form-label" htmlFor="otp">Reset Code (OTP)</label>
                <div className="input-wrap">
                  <i className="bi bi-123 i-icon" aria-hidden="true"></i>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    className={`form-input ${(errors.otp || apiError) ? " err" : ""}`}
                    value={form.otp}
                    onChange={handleChange}
                    disabled={isLoading}
                    maxLength="6"
                  />
                </div>
                {errors.otp && <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.otp}</p>}
              </div>

              {/* New Password */}
              <div className="form-group mb-3">
                <label className="form-label" htmlFor="newPassword">New Password</label>
                <div className="input-wrap">
                  <i className="bi bi-lock i-icon" aria-hidden="true"></i>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    className={`form-input ${errors.newPassword ? " err" : ""}`}
                    value={form.newPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    <i className={`bi bi-eye${showPass ? "-slash" : ""}`} aria-hidden="true"></i>
                  </button>
                </div>
                {errors.newPassword && <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.newPassword}</p>}
              </div>

              {/* Confirm Password */}
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrap">
                  <i className="bi bi-lock-fill i-icon" aria-hidden="true"></i>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    className={`form-input ${errors.confirmPassword ? " err" : ""}`}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                    <i className={`bi bi-eye${showConfirm ? "-slash" : ""}`} aria-hidden="true"></i>
                  </button>
                </div>
                {errors.confirmPassword && <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.confirmPassword}</p>}
                {apiError && !errors.otp && !errors.newPassword && !errors.confirmPassword && (
                  <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {apiError}</p>
                )}
              </div>

              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? "Resetting..." : (
                  <>Update Password <i className="bi bi-check2-circle"></i></>
                )}
              </button>
            </form>
          </>
        )}

        {/* --- BƯỚC 3: THÀNH CÔNG --- */}
        {step === 3 && (
          <div className="success-state">
            <div className="success-icon-wrap" style={{ color: "#28a745" }}>
              <i className="bi bi-check-circle-fill" style={{ fontSize: "3rem" }}></i>
            </div>
            <h1 className="card-title mt-3">Password Reset!</h1>
            <p className="card-subtitle text-muted">
              Your password has been successfully updated.
            </p>
            <p className="text-muted small">Redirecting to login...</p>
            <div className="mt-4 text-center">
              <Link to="/login" className="btn-submit text-decoration-none" style={{ display: 'inline-block' }}>
                Go to Login Now
              </Link>
            </div>
          </div>
        )}

        {/* Nút quay lại login hiển thị ở bước 1 và 2 */}
        {step !== 3 && (
          <div className="mt-4 text-center">
            <Link to="/login" className="back-link">
              <i className="bi bi-arrow-left"></i> Back to Login
            </Link>
          </div>
        )}

      </main>
    </div>
  );
};

export default ForgotPassPage;