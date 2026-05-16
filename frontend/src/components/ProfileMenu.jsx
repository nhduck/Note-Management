import React from "react";

const ProfileMenu = ({
  profile,
  darkMode,
  uploadingAvatar,
  onClose,
  onAvatarChange,
  onSecuritySettings,
  onLogout
}) => {
  return (
    <>
      {/* Lớp phủ để khi click ra ngoài sẽ đóng menu */}
      <div className="profile-overlay" onClick={onClose} />
      
      {/* Khung Popup */}
      <div className={`profile-popup ${darkMode ? "profile-popup--dark" : ""}`}>
        
        {/* Header: Ảnh và Tên */}
        <div className="profile-popup-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid var(--border-color, #eee)', marginBottom: '8px' }}>
          <div className="profile-popup-avatar-large" style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--primary-color, #6f42c1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {profile?.avatarUrl 
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
              : profile?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="profile-popup-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="profile-popup-name" style={{ fontWeight: 'bold', fontSize: '1rem', padding: '0' }}>
              {profile?.username || "Người dùng"}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6c757d)' }}>Thành viên</span>
          </div>
        </div>

        {/* Các tuỳ chọn */}
        <label className="profile-popup-item">
          {uploadingAvatar
            ? <><i className="bi bi-arrow-repeat spin" /> Đang tải...</>
            : <><i className="bi bi-camera-fill profile-icon-purple" /> Đổi ảnh đại diện</>}
          <input type="file" accept="image/*" hidden onChange={onAvatarChange} disabled={uploadingAvatar} />
        </label>

        <button className="profile-popup-item" onClick={onSecuritySettings}>
          <i className="bi bi-shield-lock-fill profile-icon-purple" /> Cài đặt bảo mật
        </button>

        <button className="profile-popup-item profile-popup-item--danger" onClick={onLogout}>
          <i className="bi bi-box-arrow-right" /> Đăng xuất
        </button>
      </div>
    </>
  );
};

export default ProfileMenu;