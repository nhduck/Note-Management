import { useState } from "react";
import "../assets/LoginStyle.css";

/* ── Bootstrap Icons Components ────────────────────────── */
const IconMail = () => <i className="bi bi-envelope i-icon" aria-hidden="true"></i>;
const IconLock = () => <i className="bi bi-lock i-icon" aria-hidden="true"></i>;
const IconEye = ({ open }) => <i className={`bi bi-eye${open ? "-slash" : ""}`} aria-hidden="true"></i>;

const validate = ({ email, password }) => {
  const e = {};
  if (!email) e.email = "Please enter your email.";
  else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Invalid email address.";
  if (!password) e.password = "Please enter your password.";
  else if (password.length < 6) e.password = "Password must be at least 6 characters.";
  return e;
};

const LoginPage = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

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
    $.ajax({
      url: "/api/login",
      method: "POST",
      data: form,
      success: (res) => {
        alert("Login thành công!");
      },
      error: (err) => {
        setErrors({ email: "Sai thông tin đăng nhập" });
      },
      complete: () => setLoading(false)
    });
  };

  return (
    <div className="login-page">
      <div className="container-fluid login-root">
        <div className="row g-0" style={{ minHeight: "100vh" }}>
          <div className="col-12">
            <div className="form-side">
              <main className="login-card">
                <h1 className="card-title">Welcome Back 👋</h1>
                <p className="card-subtitle mb-4 text-muted">Please enter your details to sign in.</p>

                <form onSubmit={handleSubmit} noValidate>
                  {/* Email */}
                  <div className="form-group mb-3">
                    <label className="form-label" htmlFor="email">Email Address</label>
                    <div className="input-wrap">
                      <IconMail />
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
                    {errors.email && <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div className="form-group mb-4">
                    <label className="form-label" htmlFor="password">Password</label>
                    <div className="input-wrap">
                      <IconLock />
                      <input
                        id="password"
                        name="password"
                        type={showPass ? "text" : "password"}
                        placeholder="••••••••"
                        className={`form-input${errors.password ? " err" : ""}`}
                        value={form.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        className="pass-toggle"
                        onClick={() => setShowPass(!showPass)}
                      >
                        <IconEye open={showPass} />
                      </button>
                    </div>
                    {errors.password && <p className="err-msg"><i className="bi bi-exclamation-circle"></i> {errors.password}</p>}
                  </div>

                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? (
                      <><span className="spinner"></span>Logging in...</>
                    ) : (
                      <>Login <i className="bi bi-arrow-right-short"></i></>
                    )}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <p className="small text-muted">
                    Don't have an account? <a href="#register" className="text-decoration-none fw-bold">Sign up for free</a>
                  </p>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;