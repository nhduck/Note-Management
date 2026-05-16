import React from "react";

const ProfileMenu = ({
  profile,
  darkMode,
  uploadingAvatar,
  onClose,
  onAvatarChange,
  onOpenPreferences,
  onSecuritySettings,
  onLogout
}) => {
  return (
    <>
      {/* BACKGROUND OVERLAY: Clicking anywhere outside the menu triggers onClose to close it */}
      <div className="profile-overlay" onClick={onClose} />
      
      {/* POPUP CONTAINER: Conditionally appends a dark mode modifier class */}
      <div className={`profile-popup ${darkMode ? "profile-popup--dark" : ""}`}>
        
        {/* HEADER BLOCK: Displays the avatar image/initial and the profile username */}
        <div className="profile-popup-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid var(--border-color, #eee)', marginBottom: '8px' }}>
          {/* Large Avatar Wrapper: Renders fallback character if avatarUrl is missing */}
          <div className="profile-popup-avatar-large" style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--primary-color, #6f42c1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
            {profile?.avatarUrl 
              ? <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
              : profile?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          {/* Account Username Display */}
          <div className="profile-popup-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="profile-popup-name" style={{ fontWeight: 'bold', fontSize: '1rem', padding: '0' }}>
              {profile?.username || "User"}
            </span>
          </div>
        </div>

        {/* OPTION 1: Change Avatar (Styled label wrapping a hidden file input stream) */}
        <label className="profile-popup-item">
          {uploadingAvatar
            ? <><i className="bi bi-arrow-repeat spin" /> Uploading...</>
            : <><i className="bi bi-camera-fill profile-icon-purple" /> Change Avatar</>}
          <input type="file" accept="image/*" hidden onChange={onAvatarChange} disabled={uploadingAvatar} />
        </label>

        {/* OPTION 2: Display Preferences Settings Trigger */}
        <button className="profile-popup-item" onClick={onOpenPreferences}>
          <i className="bi bi-sliders profile-icon-purple" /> Display Preferences
        </button>

        {/* OPTION 3: Security Settings Trigger */}
        <button className="profile-popup-item" onClick={onSecuritySettings}>
          <i className="bi bi-shield-lock-fill profile-icon-purple" /> Security Settings
        </button>

        {/* OPTION 4: Sign Out / Logout Trigger (Styled with danger theme aesthetics) */}
        <button className="profile-popup-item profile-popup-item--danger" onClick={onLogout}>
          <i className="bi bi-box-arrow-right" /> Log Out
        </button>
      </div>
    </>
  );
};

export default ProfileMenu;