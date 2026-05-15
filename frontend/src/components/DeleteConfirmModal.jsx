import "../assets/DeleteConfirmStyle.css";

function DeleteConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={e => e.stopPropagation()}>
        <div className="delete-modal-icon"><i className="bi bi-trash3-fill" /></div>
        <h3 className="delete-modal-title">Xóa ghi chú?</h3>
        <p className="delete-modal-desc">Hành động này không thể hoàn tác. Ghi chú sẽ bị xóa vĩnh viễn.</p>
        <div className="delete-modal-actions">
          <button className="delete-cancel-btn" onClick={onCancel}>Hủy bỏ</button>
          <button className="delete-confirm-btn" onClick={onConfirm}>
            <i className="bi bi-trash3" /> Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
