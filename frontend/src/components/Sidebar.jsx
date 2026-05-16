function Sidebar({ labels, activeLabel, setActiveLabel, setShowLabelManager, isOpen, onClose }) {
  return (
    <>
      {/* MOBILE OVERLAY: Dimmed background overlay layer that displays only when the sidebar drawer is open on mobile screens */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}

      {/* SIDEBAR ASIDE CONTAINER: Toggles the open modifier class based on layout state */}
      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        
        {/* SIDEBAR HEADER SECTION */}
        <div className="sidebar-header">
          <span className="sidebar-title">Labels</span>
          {/* Action trigger to launch the standalone Label Management panel modal overlay */}
          <button
            className="sidebar-manage-btn"
            onClick={() => { setShowLabelManager(true); onClose(); }}
            title="Manage labels"
          >
            <i className="bi bi-pencil-square" />
          </button>
        </div>

        {/* DEFAULT TAB: "All Notes" filter switch option */}
        <button
          className={`sidebar-label-item ${!activeLabel ? "sidebar-label-item--active" : ""}`}
          onClick={() => { setActiveLabel(null); onClose(); }}
        >
          <i className="bi bi-journals" /><span>All Notes</span>
        </button>

        {/* DYNAMIC LIST: Maps over system labels to render individual filter selection buttons */}
        {labels.map(lbl => (
          <button
            key={lbl._id}
            className={`sidebar-label-item ${activeLabel?._id === lbl._id ? "sidebar-label-item--active" : ""}`}
            onClick={() => { setActiveLabel(lbl); onClose(); }}
          >
            <i className="bi bi-tag-fill" /><span>{lbl.name}</span>
          </button>
        ))}

        {/* FALLBACK STATUS VIEW: Displays guidance prompts if the profile has no existing filter records */}
        {labels.length === 0 && (
          <p className="sidebar-empty">No labels found.<br />Click ✏️ to add one.</p>
        )}
      </aside>
    </>
  );
}

export default Sidebar;