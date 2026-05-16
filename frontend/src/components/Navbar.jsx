import { useState } from "react";
// Import component ProfileMenu bạn vừa tạo
import ProfileMenu from "./ProfileMenu";

function Navbar({
  searchTerm, setSearchTerm,
  darkMode, setDarkMode,
  viewMode, setViewMode,
  profile, uploadingAvatar,
  handleAvatarChange, handleLogout,
  onOpenPreferences,
  handleSecuritySettings,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const onSecurityClick = () => {
    setShowProfileMenu(false);
    handleSecuritySettings();
  };

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
            <ProfileMenu
              profile={profile}
              darkMode={darkMode}
              uploadingAvatar={uploadingAvatar}
              onClose={() => setShowProfileMenu(false)}
              onAvatarChange={handleAvatarChange}
              onOpenPreferences={() => { setShowProfileMenu(false); onOpenPreferences(); }}
              onSecuritySettings={onSecurityClick}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;