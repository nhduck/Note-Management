import React, { useState } from "react";
import "../assets/SecuritySettingsModalStyle.css";

const SecuritySettingsModal = ({ onClose, darkMode, profile }) => {
  const [activeTab, setActiveTab] = useState("personal");

  // --- STATE QUẢN LÝ INPUTS ---
  const [username, setUsername] = useState(profile?.username || "");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [confirmText, setConfirmText] = useState("");

  // --- STATE QUẢN LÝ THÔNG BÁO ---
  const [message, setMessage] = useState({ type: "", text: "" });

  // Hàm helper hiển thị thông báo tạm thời
  const showAlert = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  // Lấy token
  const getToken = () => localStorage.getItem("token");

  // =========================================================================
  // 1. XỬ LÝ CẬP NHẬT THÔNG TIN CÁ NHÂN
  // =========================================================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) return showAlert("error", "Tên hiển thị không được để trống.");

    try {
      const response = await fetch("/api/me/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Có lỗi xảy ra.");

      showAlert("success", "Cập nhật tên hiển thị thành công!");
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  // =========================================================================
  // 2. XỬ LÝ ĐỔI MẬT KHẨU
  // =========================================================================
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return showAlert("error", "Vui lòng nhập đầy đủ các trường mật khẩu.");
    }
    if (newPassword.length < 6) {
      return showAlert("error", "Mật khẩu mới phải có ít nhất 6 ký tự.");
    }
    if (newPassword !== confirmPassword) {
      return showAlert("error", "Xác nhận mật khẩu mới không trùng khớp.");
    }

    try {
      const response = await fetch("/api/me/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Có lỗi xảy ra.");

      showAlert("success", "Đổi mật khẩu thành công!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" }); // Reset form
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  // =========================================================================
  // 3. XỬ LÝ XÓA TÀI KHOẢN
  // =========================================================================
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (confirmText !== "XACNHAN") {
      return showAlert("error", "Vui lòng nhập chính xác chữ XACNHAN để tiếp tục.");
    }

    if (!window.confirm("Hành động này không thể hoàn tác! Bạn có thực sự muốn xóa tài khoản?")) {
      return;
    }

    try {
      const response = await fetch("/api/me/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ confirmText }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Có lỗi xảy ra.");

      alert("Tài khoản của bạn đã được xóa vĩnh viễn.");
      localStorage.removeItem("token");
      window.location.href = "/login"; 
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  return (
    <div className="security-modal-overlay" onClick={onClose}>
      <div 
        className={`security-modal-content ${darkMode ? "security-modal-content--dark" : ""}`} 
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Nút X để đóng modal */}
        <button className="security-modal-close" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>

        <div className="security-modal-layout">
          {/* CỘT TRÁI: MENU */}
          <div className="security-modal-sidebar">
            <h3 className="security-modal-title">Cài đặt</h3>
            <ul className="security-tabs">
              <li 
                className={activeTab === "personal" ? "active" : ""} 
                onClick={() => setActiveTab("personal")}
              >
                <i className="bi bi-person"></i> Thông tin cá nhân
              </li>
              <li 
                className={activeTab === "password" ? "active" : ""} 
                onClick={() => setActiveTab("password")}
              >
                <i className="bi bi-key"></i> Đổi mật khẩu
              </li>
              <li 
                className={`tab-danger ${activeTab === "delete" ? "active" : ""}`} 
                onClick={() => setActiveTab("delete")}
              >
                <i className="bi bi-trash"></i> Xóa tài khoản
              </li>
            </ul>
          </div>

          {/* CỘT PHẢI: NỘI DUNG TƯƠNG ỨNG */}
          <div className="security-modal-body">
            
            {/* THÔNG BÁO CHUNG CHO MODAL */}
            {message.text && (
              <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}>
                {message.text}
              </div>
            )}

            {/* 1. THÔNG TIN CÁ NHÂN */}
            {activeTab === "personal" && (
              <form className="tab-pane" onSubmit={handleUpdateProfile}>
                <h4>Thông tin cá nhân</h4>
                <p className="text-muted">Quản lý thông tin hồ sơ cơ bản của bạn.</p>
                <div className="form-group">
                  <label>Tên hiển thị</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-group mt-3">
                  <label>Email</label>
                  <input type="email" className="form-control" defaultValue={profile?.email || ""} disabled />
                  <small className="text-muted">Email không thể thay đổi.</small>
                </div>
                <button type="submit" className="btn-save mt-4">
                  Lưu thay đổi
                </button>
              </form>
            )}

            {/* 2. ĐỔI MẬT KHẨU */}
            {activeTab === "password" && (
              <form className="tab-pane" onSubmit={handleChangePassword}>
                <h4>Đổi mật khẩu</h4>
                <p className="text-muted">Bảo vệ tài khoản bằng một mật khẩu mạnh.</p>
                <div className="form-group">
                  <label>Mật khẩu hiện tại</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Nhập mật khẩu cũ..." 
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                </div>
                <div className="form-group mt-3">
                  <label>Mật khẩu mới</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Mật khẩu mới..." 
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                </div>
                <div className="form-group mt-3">
                  <label>Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="Nhập lại mật khẩu mới..." 
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-save mt-4">
                  Cập nhật mật khẩu
                </button>
              </form>
            )}

            {/* 3. XÓA TÀI KHOẢN */}
            {activeTab === "delete" && (
              <form className="tab-pane" onSubmit={handleDeleteAccount}>
                <h4 className="text-danger">Xóa tài khoản</h4>
                <div className="alert-danger mt-3">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <strong> Cảnh báo:</strong> Việc xóa tài khoản là vĩnh viễn và không thể khôi phục. Tất cả ghi chú và dữ liệu của bạn sẽ bị mất hoàn toàn.
                </div>
                <div className="form-group mt-4">
                  <label>Nhập chữ <strong>XACNHAN</strong> để tiếp tục:</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="XACNHAN" 
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-delete-account mt-4">
                  Xóa vĩnh viễn tài khoản
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsModal;