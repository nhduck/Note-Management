// Import the external CSS file for styling the modal
import "../assets/DeleteConfirmStyle.css";

// Define the DeleteConfirmModal component with two props: onCancel and onConfirm
function DeleteConfirmModal({ onCancel, onConfirm }) {
  return (
    // Backdrop overlay: clicks here will trigger onCancel to close the modal
    <div className="modal-overlay" onClick={onCancel}>
      
      {/* Modal content box: stopPropagation prevents clicks inside from closing the modal */}
      <div className="delete-modal" onClick={e => e.stopPropagation()}>
        
        {/* Top icon section for the delete action */}
        <div className="delete-modal-icon">
          <i className="bi bi-trash3-fill" />
        </div>
        
        {/* Modal heading/title */}
        <h3 className="delete-modal-title">Delete note?</h3>
        
        {/* Warning description text */}
        <p className="delete-modal-desc">
          This action cannot be undone. The note will be permanently deleted.
        </p>
        
        {/* Action buttons section */}
        <div className="delete-modal-actions">
          {/* Cancel button to close the modal without deleting */}
          <button className="delete-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          
          {/* Confirm button to proceed with the deletion */}
          <button className="delete-confirm-btn" onClick={onConfirm}>
            <i className="bi bi-trash3" /> Delete
          </button>
        </div>

      </div>
    </div>
  );
}

// Export the component as default so it can be imported in other files
export default DeleteConfirmModal;