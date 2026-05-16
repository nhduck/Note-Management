import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/ForgotPassStyle.css";

// Step-by-step validator logic
const validate = (form, step) => {
  const errors = {};
  if (step === 1) {
    if (!form.email) errors.email = "Please enter your email address.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = "Invalid email address format.";
  } else if (step === 2) {
    if (!form.otp) errors.otp = "Please enter the verification code.";
    else if (form.otp.length < 6) errors.otp = "The verification code must be exactly 6 characters.";

    if (!form.newPassword) errors.newPassword = "Please enter your new password.";
    else if (form.newPassword.length < 6) errors.newPassword = "Password must be at least 6 characters long.";

    if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (form.newPassword !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
};

const ForgotPassPage = () => {
  const [form, setForm]   = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});

  // step 1: Request Email | step 2: Enter OTP & Reset Password | step 3: Success Screen
  const [step, setStep]         = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError]   = useState("");

  // Input password visibility toggles
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    if (apiError) setApiError("");
  };

  // STEP 1: Transmit recovery request payload to acquire secure OTP tokens
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    const errs = validate(form, 1);
    if (Object.keys(errs).length) { setErrors(errs); return; }

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
        setStep(2); // Advance timeline view down to validation panel
      } else {
        setApiError(data.message || "This email is not registered in our records.");
      }
    } catch {
      setApiError("Server error. Please verify your network connection status.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Authenticate verification tokens and overwrite password credentials
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const errs = validate(form, 2);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    setApiError("");

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: form.otp, newPassword: form.newPassword }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(3); // Route screen into positive terminal feedback states
        setTimeout(() => navigate("/login"), 3000); // Automate bounce redirect to login after 3s delay
      } else {
        setApiError(data.message || "Invalid code or password reset action failed.");
      }
    } catch {
      setApiError("Server error. Please verify your network connection status.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-side">
      <main className="forgot-card">

        {/* VIEW SEGMENT 1: INPUT EMAIL ADDRESS */}
        {step === 1 && (
          <>
            <div className="icon-wrap"><i className="bi bi-shield-lock"></i></div>
            <h1 className="card-title">Forgot Password?</h1>
            <p className="card-subtitle text-muted">
              Don't worry! Enter your email address and we will send you a verification code to reset it.
            </p>

            <form onSubmit={handleRequestOTP} noValidate>
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div className="input-wrap">
                  <i className="bi bi-envelope i-icon" aria-hidden="true"></i>
                  <input
                    id="email" name="email" type="email"
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
                {isLoading ? "Sending..." : <><>Send Reset Code </><i className="bi bi-send"></i></>}
              </button>
            </form>
          </>
        )}

        {/* VIEW SEGMENT 2: INPUT VALIDATION CODE & SECURE CREDS */}
        {step === 2 && (
          <>
            <div className="icon-wrap"><i className="bi bi-key"></i></div>
            <h1 className="card-title">Reset Password</h1>
            <p className="card-subtitle text-muted">
              A security code has been transmitted to <strong>{form.email}</strong>. Please enter it below.
            </p>

            <form onSubmit={handleResetPassword} noValidate>
              {/* OTP Input block */}
              <div className="form-group mb-3">
                <label className="form-label" htmlFor="otp">Verification Code (OTP)</label>
                <div className="input-wrap">
                  <i className="bi bi-123 i-icon" aria-hidden="true"></i>
                  <input
                    id="otp" name="otp" type="text"
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

              {/* New Password Input block */}
              <div className="form-group mb-3">
                <label className="form-label" htmlFor="newPassword">New Password</label>
                <div className="input-wrap">
                  <i className="bi bi-lock i-icon" aria-hidden="true"></i>
                  <input
                    id="newPassword" name="newPassword"
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

              {/* Confirm Password Input block */}
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
                <div className="input-wrap">
                  <i className="bi bi-lock-fill i-icon" aria-hidden="true"></i>
                  <input
                    id="confirmPassword" name="confirmPassword"
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
                {isLoading ? "Updating..." : <><>Update Password </><i className="bi bi-check2-circle"></i></>}
              </button>
            </form>
          </>
        )}

        {/* VIEW SEGMENT 3: POSITIVE SUCCESS STATE PANEL */}
        {step === 3 && (
          <div className="success-state">
            <div className="success-icon-wrap" style={{ color: "#28a745" }}>
              <i className="bi bi-check-circle-fill" style={{ fontSize: "3rem" }}></i>
            </div>
            <h1 className="card-title mt-3">Reset Successful!</h1>
            <p className="card-subtitle text-muted">Your account password security credentials have been updated successfully.</p>
            <p className="text-muted small">Redirecting you to the login page...</p>
            <div className="mt-4 text-center">
              <Link to="/login" className="btn-submit text-decoration-none" style={{ display: "inline-block" }}>
                Go to Login Now
              </Link>
            </div>
          </div>
        )}

        {/* Back navigation anchor button layout logic */}
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