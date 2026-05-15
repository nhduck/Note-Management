import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../assets/LoginStyle.css";

const validate = ({ email, password }) => {
  const errors = {};
  if (!email) errors.email = "Please enter your email.";
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Invalid email address.";
  if (!password) errors.password = "Please enter your password.";
  else if (password.length < 6) errors.password = "Password must be at least 6 characters.";
  return errors;
};

const LoginPage = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();

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
      url: "api/login", 
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(form),
      success: (res) => {
        if (res.token) {
          localStorage.setItem("token", res.token);
        }

        if (res.user) {
          localStorage.setItem("user", JSON.stringify(res.user));
        }

        navigate("/home");
      },
      error: (err) => {
        const message = err.responseJSON?.message || "Login failed. Please try again.";
        setErrors({ password: message });
      }
    });
  };

  return (
    <div className="form-side">
      <main className="login-card">
        <h1 className="card-title">Welcome Back 👋</h1>
        <p className="card-subtitle mb-4 text-muted">Please enter your details to sign in.</p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group mb-3">
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

          {/* Password */}
          <div className="form-group mb-3">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrap">
              <i className="bi bi-lock i-icon" aria-hidden="true"></i>
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
                <i className={`bi bi-eye${showPass ? "-slash" : ""}`} aria-hidden="true"></i>
              </button>
            </div>
            {errors.password && (
              <p className="err-msg">
                <i className="bi bi-exclamation-circle"></i> {errors.password}
              </p>
            )}
            <div className="text-end small">
              <Link to="/FogotPassPage" className="text-decoration-none">Forgot Password</Link>
            </div>
          </div>

          <button type="submit" className="btn-submit">
            Login <i className="bi bi-arrow-right-short"></i>
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="small text-muted">
            Don't have an account?{" "}
            <Link to="/register" className="text-decoration-none fw-bold">Sign up for free</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;