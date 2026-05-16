import { useState } from "react";
import ProfileMenu from "./ProfileMenu";

function Navbar({
  searchTerm, setSearchTerm,
  darkMode, setDarkMode,
  viewMode, setViewMode,
  profile, uploadingAvatar,
  handleAvatarChange, handleLogout,
  onOpenPreferences,
  handleSecuritySettings,
  // Props to control the sidebar toggle on mobile devices
  sidebarOpen, setSidebarOpen,
}) {
  // Local state to track whether the user profile dropdown menu is open
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Helper function to close the profile menu before opening security settings modal
  const onSecurityClick = () => {
    setShowProfileMenu(false);
    handleSecuritySettings();
  };

  return (
    <nav className="navbar">
      
      {/* MOBILE HAMBURGER BUTTON: Visible on mobile screens to toggle the sidebar view */}
      <button
        className="hamburger-btn icon-btn"
        onClick={() => setSidebarOpen(o => !o)}
        title="Labels Menu"
        aria-label="Toggle menu"
      >
        {/* Swaps icon dynamically between a list (hamburger) and an 'X' close icon */}
        <i className={`bi ${sidebarOpen ? "bi-x-lg" : "bi-list"}`} />
      </button>

      {/* BRANDING LOGO SECTION */}
      <div className="nav-logo">
        <i className="bi bi-journal-bookmark-fill" /> NoteSpace
      </div>

      {/* SEARCH BAR CONTAINER */}
      <div className="search-wrap">
        <i className="bi bi-search" />
        <input
          className="search-input"
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {/* Inline Clear Button: Only shows up when there is active text in the search bar */}
        {searchTerm && (
          <button className="search-clear-btn" onClick={() => setSearchTerm("")} title="Clear">
            <i className="bi bi-x-circle-fill" />
          </button>
        )}
      </div>

      {/* RIGHT CONTROLS: Dark mode toggle, View layout toggle, and Profile dropdown */}
      <div className="nav-right">
        
        {/* Theme Toggle Button (Swaps between Sun and Moon icons) */}
        <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle theme">
          <i className={`bi ${darkMode ? "bi-sun-fill" : "bi-moon-stars-fill"}`} />
        </button>

        {/* Layout Toggle: Grid View vs List View options */}
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <i className="bi bi-grid" />
          </button>
          <button
            className={`view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <i className="bi bi-list-ul" />
          </button>
        </div>

        {/* USER PROFILE & DROPDOWN MENU */}
        <div className="profile-container">
          {/* Avatar Button: Displays uploaded image or falling back to user's first initial */}
          <div className="avatar-btn" onClick={() => setShowProfileMenu(p => !p)}>
            {profile?.avatarUrl
              ? <img src={profile.avatarUrl} alt="avatar" />
              : profile?.username?.charAt(0).toUpperCase() || "U"}
          </div>

          {/* Conditional Profile Sub-Menu: Passes handlers and automatically hides menu when inner links are clicked */}
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