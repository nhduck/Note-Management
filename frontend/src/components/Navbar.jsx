import { useState } from "react";

function Navbar({
  searchTerm, setSearchTerm,
  darkMode, setDarkMode,
  viewMode, setViewMode,
  profile, uploadingAvatar,
  handleAvatarChange, handleLogout,
  onOpenPreferences,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-logo"><i className="bi bi-journal-bookmark-fill" /> NoteSpace</div>

      <div className="search-wrap">
        <i className="bi bi-search" />
        <input
          className="search-input"
          type="text"
          placeholder="Tìm kiếm ghi chú..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="search-clear-btn" onClick={() => setSearchTerm("")} title="Xoá">
            <i className="bi bi-x-circle-fill" />
          </button>
        )}
      </div>

      <div className="nav-right">
        <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Đổi giao diện">
          <i className={`bi ${darkMode ? "bi-sun-fill" : "bi-moon-stars-fill"}`} />
        </button>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")} title="Lưới">
            <i className="bi bi-grid" />
          </button>
          <button className={`view-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")} title="Danh sách">
            <i className="bi bi-list-ul" />
          </button>
        </div>

        <div className="profile-container">
          <div className="avatar-btn" onClick={() => setShowProfileMenu(p => !p)}>
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" />
              : profile?.username?.charAt(0).toUpperCase() || "U"}
          </div>

          {showProfileMenu && (
            <>
              <div className="profile-overlay" onClick={() => setShowProfileMenu(false)} />
              <div className={`profile-popup ${darkMode ? "profile-popup--dark" : ""}`}>
                <div className="profile-popup-name">{profile?.username || "Người dùng"}</div>

                <label className="profile-popup-item">
                  {uploadingAvatar
                    ? <><i className="bi bi-arrow-repeat spin" /> Đang tải...</>
                    : <><i className="bi bi-camera-fill profile-icon-purple" /> Đổi ảnh đại diện</>}
                  <input type="file" accept="image/*" hidden onChange={handleAvatarChange} disabled={uploadingAvatar} />
                </label>

                <button className="profile-popup-item" onClick={() => { setShowProfileMenu(false); onOpenPreferences(); }}>
                  <i className="bi bi-sliders profile-icon-purple" /> Tùy chọn hiển thị
                </button>

                <button className="profile-popup-item profile-popup-item--danger" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right" /> Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;