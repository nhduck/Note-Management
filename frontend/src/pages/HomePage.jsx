import { useState } from "react";
import "../assets/HomeStyle.css";

const NOTES = [
  { id: 1, title: "Meeting Notes", content: "Discussed Q3 goals and roadmap. Need to follow up with design team about the new feature spec.", tag: "Work", icon: "💼", color: "#5147d4", date: "May 12, 2026" },
  { id: 2, title: "Grocery List", content: "Milk, eggs, bread, avocado, coffee beans, yogurt, bananas.", tag: "Personal", icon: "🛒", color: "#10b981", date: "May 11, 2026" },
  { id: 3, title: "Book Ideas", content: "Start reading 'Atomic Habits' this week. Also checkout 'Deep Work' by Cal Newport.", tag: "Reading", icon: "📚", color: "#f59e0b", date: "May 10, 2026" },
  { id: 4, title: "React Learning", content: "Learned useState, useEffect today. Next: context API and custom hooks.", tag: "Study", icon: "⚛️", color: "#3b82f6", date: "May 9, 2026" },
  { id: 5, title: "Travel Plans", content: "Trip to Da Nang next month. Book hotel near the beach. Check flights on Vietjet.", tag: "Travel", icon: "✈️", color: "#ec4899", date: "May 8, 2026" },
  { id: 6, title: "Workout Routine", content: "Monday: chest + triceps. Wednesday: back + biceps. Friday: legs. Weekend: cardio.", tag: "Health", icon: "🏋️", color: "#ef4444", date: "May 7, 2026" },
];

function HomePage() {
  const [viewMode, setViewMode]           = useState("grid");
  const [search, setSearch]               = useState("");
  const [darkMode, setDarkMode]           = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [accentColor, setAccentColor]     = useState("#5147d4");
  const [fontSize, setFontSize]           = useState("medium");
  const [profile, setProfile]             = useState({ name: "Alex Johnson", email: "alex@example.com", avatarUrl: "" });
  const [editProfile, setEditProfile]     = useState({ ...profile });

  // Bootstrap Icons are loaded via RootStyle.css

  const filteredNotes = NOTES.filter((note) => {
    const q = search.toLowerCase();
    return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q) || note.tag.toLowerCase().includes(q);
  });

  const initials = profile.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  function saveProfile() {
    setProfile({ ...editProfile });
    setShowProfile(false);
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditProfile((p) => ({ ...p, avatarUrl: ev.target.result }));
    reader.readAsDataURL(file);
  }

  return (
    <div
      className={`app-wrapper font-${fontSize} ${darkMode ? "dark" : ""}`}
      style={{ "--accent": accentColor, "--accent-hover": accentColor + "cc" }}
    >
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <i className="bi bi-journal-bookmark-fill" />
          NoteSpace
        </div>

        <div className="search-wrap">
          <i className="bi bi-search" />
          <input
            className="search-input"
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="nav-right">
          {/* Dark Mode Toggle Button */}
          <button 
            className="icon-btn theme-toggle" 
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <i className={`bi ${darkMode ? "bi-sun-fill" : "bi-moon-stars-fill"}`} />
          </button>

          <div className="view-toggle">
            <button className={`view-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>
              <i className="bi bi-grid" />
            </button>
            <button className={`view-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
              <i className="bi bi-list-ul" />
            </button>
          </div>

          <div className="avatar-btn" onClick={() => { setEditProfile({ ...profile }); setShowProfile(true); }}>
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="avatar" /> : initials}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main">
        <div className="main-header">
          <div>
            <div className="main-title">My Notes</div>
            <div className="main-count">{filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}</div>
          </div>
          <button className="add-btn">
            <i className="bi bi-plus-lg" />
            New Note
          </button>
        </div>

        <div className={viewMode === "grid" ? "notes-grid" : "notes-list"}>
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">My Profile</div>
            <div className="avatar-area">
              <div className="avatar-big">
                {editProfile.avatarUrl ? <img src={editProfile.avatarUrl} alt="avatar" /> : initials}
              </div>
              <input id="avatar-file" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
              <button className="avatar-upload-btn" onClick={() => document.getElementById("avatar-file").click()}>Change Photo</button>
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" value={editProfile.name} onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowProfile(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }) {
  return (
    <div className="note-card" style={{ "--note-color": note.color }}>
      <div className="note-icon">{note.icon}</div>
      <div className="note-body">
        <div className="note-title">{note.title}</div>
        <div className="note-preview">{note.content}</div>
      </div>
      <div className="note-footer">
        <span className="note-tag">{note.tag}</span>
        <span className="note-date">{note.date}</span>
      </div>
    </div>
  );
}

export default HomePage;