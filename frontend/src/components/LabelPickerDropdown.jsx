import { useRef, useEffect } from "react";
import "../assets/LabelPickerStyle.css";

function LabelPickerDropdown({ labels, activeNoteLabels, onToggle, onClose, noteId }) {
  // Create a reference to this dropdown element to detect outside clicks
  const ref = useRef(null);

  // Hook to handle clicking outside the dropdown to automatically close it
  useEffect(() => {
    const handler = e => { 
      // If the click target is outside the dropdown container, trigger onClose
      if (ref.current && !ref.current.contains(e.target)) onClose(); 
    };
    // Listen for mousedown events across the document
    document.addEventListener("mousedown", handler);
    // Cleanup function to remove the event listener when the component unmounts
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Extract array of IDs from currently attached labels for quick lookup
  const attachedIds = activeNoteLabels.map(l => l._id || l);

  return (
    <div className="label-picker-dropdown" ref={ref}>
      {/* Dropdown Header */}
      <div className="label-picker-header">Label Note</div>
      
      {/* CASE 1: No labels exist in the system yet */}
      {labels.length === 0 && (
        <p className="label-picker-empty">No labels found. Create one first.</p>
      )}
      
      {/* CASE 2: Labels exist but the note is brand new (has no database ID yet) */}
      {!noteId && labels.length > 0 && (
        <p className="label-picker-empty">Save the note first to add labels.</p>
      )}
      
      {/* CASE 3: Note exists, render the toggleable list of labels */}
      {noteId && labels.map(lbl => {
        // Check if this specific label is already attached to the note
        const attached = attachedIds.includes(lbl._id);
        
        return (
          <button 
            key={lbl._id} 
            className={`label-picker-item ${attached ? "label-picker-item--checked" : ""}`}
            onClick={() => onToggle(lbl)}
          >
            {/* Dynamic checkbox icon based on the active state */}
            <i className={`bi ${attached ? "bi-check-square-fill" : "bi-square"}`} />
            <span>{lbl.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default LabelPickerDropdown;