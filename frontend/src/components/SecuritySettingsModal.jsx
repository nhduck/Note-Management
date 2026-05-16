import React, { useState } from "react";
import "../assets/SecuritySettingsModalStyle.css";

const SecuritySettingsModal = ({ onClose, darkMode, profile, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState("personal");

  // Các State nhập liệu độc lập
  const [username, setUsername] = useState(profile?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const token = localStorage.getItem("token");

  // 1. XỬ LÝ CẬP NHẬT THÔNG TIN CÁ NHÂN
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) return alert("Tên hiển thị không được để trống.");

    try {
      const response = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      const updatedProfile = { ...profile, username: data.user.username };
      localStorage.setItem("user", JSON.stringify(updatedProfile));
      onProfileUpdate?.(updatedProfile);
      alert("Cập nhật thành công!");
    } catch (err) {
      alert(err.message);
    }
  };

  // 2. XỬ LÝ ĐỔI MẬT KHẨU
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return alert("Vui lòng nhập đủ thông tin.");
    if (newPassword.length < 6) return alert("Mật khẩu phải từ 6 ký tự.");
    if (newPassword !== confirmPassword) return alert("Mật khẩu mới không trùng khớp.");

    try {
      const response = await fetch("/api/me/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      alert("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. XỬ LÝ XÓA TÀI KHOẢN
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (confirmText !== "XACNHAN") return alert("Vui lòng nhập đúng chữ XACNHAN.");
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản?")) return;

    try {
      const response = await fetch("/api/me/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      alert("Tài khoản của bạn đã được xóa.");
      localStorage.removeItem("token");
      window.location.href = "/login";
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="security-modal-overlay" onClick={onClose}>
      <div className={`security-modal-content ${darkMode ? "security-modal-content--dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Nút X đóng modal */}
        <button className="security-modal-close" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        <div className="security-modal-layout">
          {/* CỘT TRÁI: MENU TABS */}
          <div className="security-modal-sidebar">
            <h3 className="security-modal-title">Cài đặt</h3>
            <ul className="security-tabs">
              <li className={activeTab === "personal" ? "active" : ""} onClick={() => setActiveTab("personal")}>
                <i className="bi bi-person"></i> Thông tin cá nhân
              </li>
              <li className={activeTab === "password" ? "active" : ""} onClick={() => setActiveTab("password")}>
                <i className="bi bi-key"></i> Đổi mật khẩu
              </li>
              <li className={`tab-danger ${activeTab === "delete" ? "active" : ""}`} onClick={() => setActiveTab("delete")}>
                <i className="bi bi-trash"></i> Xóa tài khoản
              </li>
            </ul>
          </div>

          {/* CỘT PHẢI: NỘI DUNG TƯƠNG ỨNG */}
          <div className="security-modal-body">

            {/* TAB 1: THÔNG TIN CÁ NHÂN */}
            {activeTab === "personal" && (
              <form className="tab-pane" onSubmit={handleUpdateProfile}>
                <h4>Thông tin cá nhân</h4>
                <div className="form-group">
                  <label>Tên hiển thị</label>
                  <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="form-group mt-3">
                  <label>Email</label>
                  <input type="email" className="form-control" defaultValue={profile?.email || ""} disabled />
                </div>
                <button type="submit" className="btn-save mt-4">Lưu thay đổi</button>
              </form>
            )}

            {/* TAB 2: ĐỔI MẬT KHẨU */}
            {activeTab === "password" && (
              <form className="tab-pane" onSubmit={handleChangePassword}>
                <h4>Đổi mật khẩu</h4>
                <div className="form-group">
                  <label>Mật khẩu hiện tại</label>
                  <input type="password" className="form-control" placeholder="Nhập mật khẩu cũ..." value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="form-group mt-3">
                  <label>Mật khẩu mới</label>
                  <input type="password" className="form-control" placeholder="Mật khẩu mới..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group mt-3">
                  <label>Xác nhận mật khẩu mới</label>
                  <input type="password" className="form-control" placeholder="Nhập lại mật khẩu mới..." value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn-save mt-4">Cập nhật mật khẩu</button>
              </form>
            )}

            {/* TAB 3: XÓA TÀI KHOẢN */}
            {activeTab === "delete" && (
              <form className="tab-pane" onSubmit={handleDeleteAccount}>
                <h4 className="text-danger">Xóa tài khoản</h4>
                <div className="alert-danger mt-3">
                  <strong>Cảnh báo:</strong> Việc xóa tài khoản là vĩnh viễn và không thể khôi phục.
                </div>
                <div className="form-group mt-4">
                  <label>Nhập chữ <strong>XACNHAN</strong> để tiếp tục:</label>
                  <input type="text" className="form-control" placeholder="XACNHAN" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                </div>
                <button type="submit" className="btn-delete-account mt-4">Xóa vĩnh viễn tài khoản</button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsModal;