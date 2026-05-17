import React, { useState } from "react";
import "../assets/SecuritySettingsModalStyle.css";

const SecuritySettingsModal = ({ onClose, darkMode, profile, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState("personal");

  // Independent form input states
  const [username, setUsername] = useState(profile?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const token = localStorage.getItem("token");

  // 1. HANDLER: UPDATE PERSONAL PROFILE INFORMATION
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) return alert("Display name cannot be empty.");

    try {
      const response = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const updatedProfile = { ...profile, username: data.user.username, email: data.user.email ?? profile?.email };
      localStorage.setItem("user", JSON.stringify(updatedProfile));
      onProfileUpdate?.(updatedProfile);
      alert("Profile updated successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  // 2. HANDLER: CHANGE USER PASSWORD
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return alert("Please fill in all fields.");
    if (newPassword.length < 6) return alert("Password must be at least 6 characters long.");
    if (newPassword !== confirmPassword) return alert("New passwords do not match.");

    try {
      const response = await fetch("/api/me/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      alert("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. HANDLER: PERMANENT ACCOUNT DELETION
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (confirmText !== "CONFIRM") return alert("Please type the exact phrase CONFIRM.");
    if (!window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) return;

    try {
      const response = await fetch("/api/me/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      alert("Your account has been deleted.");
      localStorage.removeItem("token");
      window.location.href = "/login";
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="security-modal-overlay" onClick={onClose}>
      <div className={`security-modal-content ${darkMode ? "security-modal-content--dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Close Anchor */}
        <button className="security-modal-close" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        <div className="security-modal-layout">
          {/* LEFT COLUMN: NAVIGATION SIDEBAR TABS */}
          <div className="security-modal-sidebar">
            <h3 className="security-modal-title">Settings</h3>
            <ul className="security-tabs">
              <li className={activeTab === "personal" ? "active" : ""} onClick={() => setActiveTab("personal")}>
                <i className="bi bi-person"></i> Personal Info
              </li>
              <li className={activeTab === "password" ? "active" : ""} onClick={() => setActiveTab("password")}>
                <i className="bi bi-key"></i> Change Password
              </li>
              <li className={`tab-danger ${activeTab === "delete" ? "active" : ""}`} onClick={() => setActiveTab("delete")}>
                <i className="bi bi-trash"></i> Delete Account
              </li>
            </ul>
          </div>

          {/* RIGHT COLUMN: CORRESPONDING FORM PANEL VIEWS */}
          <div className="security-modal-body">

            {/* TAB PANEL 1: PERSONAL INFORMATION */}
            {activeTab === "personal" && (
              <form className="tab-pane" onSubmit={handleUpdateProfile}>
                <h4>Personal Information</h4>
                <div className="form-group">
                  <label>Display Name</label>
                  <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="form-group mt-3">
                  <label>Email Address</label>
                  <input type="email" className="form-control" defaultValue={profile?.email || ""} disabled />
                </div>
                <button type="submit" className="btn-save mt-4">Save Changes</button>
              </form>
            )}

            {/* TAB PANEL 2: PASSWORD CHANGE MANAGEMENT */}
            {activeTab === "password" && (
              <form className="tab-pane" onSubmit={handleChangePassword}>
                <h4>Change Password</h4>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" className="form-control" placeholder="Enter current password..." value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="form-group mt-3">
                  <label>New Password</label>
                  <input type="password" className="form-control" placeholder="Enter new password..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group mt-3">
                  <label>Confirm New Password</label>
                  <input type="password" className="form-control" placeholder="Re-enter new password..." value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn-save mt-4">Update Password</button>
              </form>
            )}

            {/* TAB PANEL 3: DANGER ACCOUNT REMOVAL */}
            {activeTab === "delete" && (
              <form className="tab-pane" onSubmit={handleDeleteAccount}>
                <h4 className="text-danger">Delete Account</h4>
                <div className="alert-danger mt-3">
                  <strong>Warning:</strong> Account deletion is permanent and cannot be recovered under any circumstances.
                </div>
                <div className="form-group mt-4">
                  <label>Type <strong>CONFIRM</strong> to proceed:</label>
                  <input type="text" className="form-control" placeholder="CONFIRM" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                </div>
                <button type="submit" className="btn-delete-account mt-4">Permanently Delete Account</button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsModal;