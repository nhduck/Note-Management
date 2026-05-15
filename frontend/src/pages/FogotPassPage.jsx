import { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/ForgotPassStyle.css";

const validate = ({ email }) => {
  const errors = {};
  if (!email) errors.email = "Please enter your email.";
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Invalid email address.";
  return errors;
};

const ForgotPassPage = () => {
  const [form, setForm] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="form-side">
      <main className="forgot-card">
        {!submitted ? (
          <>
            <div className="icon-wrap">
              <i className="bi bi-shield-lock"></i>
            </div>
            <h1 className="card-title">Forgot Password?</h1>
            <p className="card-subtitle text-muted">
              No worries! Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div className="input-wrap">
                  <i className="bi bi-envelope i-icon" aria-hidden="true"></i>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    className={`form-input${errors.email ? " err" : ""}`}
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email && (
                  <p className="err-msg">
                    <i className="bi bi-exclamation-circle"></i> {errors.email}
                  </p>
                )}
              </div>

              <button type="submit" className="btn-submit">
                Send Reset Link <i className="bi bi-send"></i>
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className="back-link">
                <i className="bi bi-arrow-left"></i> Back to Login
              </Link>
            </div>
          </>
        ) : (
          <div className="success-state">
            <div className="success-icon-wrap">
              <i className="bi bi-envelope-check"></i>
            </div>
            <h1 className="card-title">Check your inbox</h1>
            <p className="card-subtitle text-muted">
              We've sent a password reset link to <span className="email-highlight">{form.email}</span>. Please check your inbox.
            </p>
            <p className="resend-text text-muted">
              Didn't receive it?{" "}
              <button
                className="resend-btn"
                onClick={() => setSubmitted(false)}
              >
                Resend email
              </button>
            </p>
            <div className="mt-3 text-center">
              <Link to="/login" className="back-link">
                <i className="bi bi-arrow-left"></i> Back to Login
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ForgotPassPage;