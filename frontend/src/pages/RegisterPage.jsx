import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../assets/RegisterStyle.css";

// Validate registration form inputs
const validate = ({ username, email, password, confirmPassword }) => {
  const errors = {};
  if (!username) errors.username = "Please enter a username.";
  else if (username.length < 3) errors.username = "Username must be at least 3 characters long.";

  if (!email) errors.email = "Please enter your email address.";
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Invalid email address format.";

  if (!password) errors.password = "Please enter a password.";
  else if (password.length < 6) errors.password = "Password must be at least 6 characters long.";

  if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
  else if (password !== confirmPassword) errors.confirmPassword = "Confirmation password does not match.";

  return errors;
};

const RegisterPage = () => {
  const [form, setForm]             = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors]         = useState({});
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("Account created successfully! Redirecting...");
        // Redirect to OTP validation screen after a 2-second delay
        setTimeout(() => {
          navigate("/verify-otp", { state: { email: form.email, type: "register" } });
        }, 2000);
      } else {
        setErrors({ email: data.message || "Registration failed." });
      }
    } catch (err) {
      setErrors({ email: "Server error. Please try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-side">
      <main className="register-card">
        <h1 className="card-title">Create Account 🚀</h1>
        <p className="card-subtitle mb-4 text-muted">Fill in your details below to get started.</p>

        {successMsg && (
          <p className="success-msg">
            <i className="bi bi-check-circle"></i> {successMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Username Input Field */}
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="username">Username</label>
            <div className="input-wrap">
              <i className="bi bi-person i-icon" aria-hidden="true"></i>
              <input
                id="username" name="username" type="text"
                placeholder="username"
                className={`form-input${errors.username ? " err" : ""}`}
                value={form.username}
                onChange={handleChange}
              />
            </div>
            {errors.username && (
              <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.username}</p>
            )}
          </div>

          {/* Email Input Field */}
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-wrap">
              <i className="bi bi-envelope i-icon" aria-hidden="true"></i>
              <input
                id="email" name="email" type="email"
                placeholder="name@example.com"
                className={`form-input${errors.email ? " err" : ""}`}
                value={form.email}
                onChange={handleChange}
              />
            </div>
            {errors.email && (
              <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.email}</p>
            )}
          </div>

          {/* Password Input Field */}
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrap">
              <i className="bi bi-lock i-icon" aria-hidden="true"></i>
              <input
                id="password" name="password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                className={`form-input${errors.password ? " err" : ""}`}
                value={form.password}
                onChange={handleChange}
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                <i className={`bi bi-eye${showPass ? "-slash" : ""}`} aria-hidden="true"></i>
              </button>
            </div>
            {errors.password && (
              <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.password}</p>
            )}
          </div>

          {/* Confirm Password Input Field */}
          <div className="form-group mb-4">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrap">
              <i className="bi bi-lock-fill i-icon" aria-hidden="true"></i>
              <input
                id="confirmPassword" name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                className={`form-input${errors.confirmPassword ? " err" : ""}`}
                value={form.confirmPassword}
                onChange={handleChange}
              />
              <button type="button" className="pass-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                <i className={`bi bi-eye${showConfirm ? "-slash" : ""}`} aria-hidden="true"></i>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading
              ? <><span className="spinner"></span>Creating account...</>
              : <>Create Account <i className="bi bi-arrow-right-short"></i></>}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="small text-muted">
            Already have an account?{" "}
            <Link to="/" className="text-decoration-none fw-bold">Log In</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;