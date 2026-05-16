function Sidebar({ labels, activeLabel, setActiveLabel, setShowLabelManager }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Nhãn</span>
        <button className="sidebar-manage-btn" onClick={() => setShowLabelManager(true)} title="Quản lý nhãn">
          <i className="bi bi-pencil-square" />
        </button>
      </div>

      <button
        className={`sidebar-label-item ${!activeLabel ? "sidebar-label-item--active" : ""}`}
        onClick={() => setActiveLabel(null)}
      >
        <i className="bi bi-journals" /><span>Tất cả ghi chú</span>
      </button>

      {labels.map(lbl => (
        <button
          key={lbl._id}
          className={`sidebar-label-item ${activeLabel?._id === lbl._id ? "sidebar-label-item--active" : ""}`}
          onClick={() => setActiveLabel(lbl)}
        >
          <i className="bi bi-tag-fill" /><span>{lbl.name}</span>
        </button>
      ))}

      {labels.length === 0 && (
        <p className="sidebar-empty">Chưa có nhãn nào.<br />Nhấn ✏️ để thêm.</p>
      )}
    </aside>
  );
}

export default Sidebar;