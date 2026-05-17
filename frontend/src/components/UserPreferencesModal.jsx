import { useState, useEffect } from "react";
import "../assets/UserPreferencesStyle.css";

/* ═══════════════════════════════════════════════════════
   DEFAULT CONFIGURATION VALUES
═══════════════════════════════════════════════════════ */
export const DEFAULT_PREFS = {
  fontSize:  "medium",   // "small" | "medium" | "large" | "xlarge"
  noteColor: "#5147d4",  // Default system accent color
};

const FONT_OPTIONS = [
  { value: "small",  label: "Small",   px: "12px" },
  { value: "medium", label: "Medium",  px: "14px" },
  { value: "large",  label: "Large",   px: "16px" },
  { value: "xlarge", label: "X-Large", px: "18px" },
];

const COLOR_PRESETS = [
  "#5147d4", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#6b7280",
];

/* ═══════════════════════════════════════════════════════
   LOCALSTORAGE DATA PERSISTENCE PIPELINE (LOAD / SAVE)
═══════════════════════════════════════════════════════ */
export function loadPrefs() {
  try {
    const raw = localStorage.getItem("userPrefs");
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch { return { ...DEFAULT_PREFS }; }
}

export function savePrefs(prefs) {
  localStorage.setItem("userPrefs", JSON.stringify(prefs));
}

/* ═══════════════════════════════════════════════════════
   APPLICATION INJECTOR: MAPS CONFIGURATIONS TO CSS VARIABLES
═══════════════════════════════════════════════════════ */
// Converts hexadecimal colors to rgb format streams to support alpha-channel transparency structures
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "81, 71, 212";
}

// Lowers hexadecimal brightness levels by ~15% to construct dynamic cursor hover state mutations
function darkenHex(hex, amount = 20) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, parseInt(result[1], 16) - amount);
  const g = Math.max(0, parseInt(result[2], 16) - amount);
  const b = Math.max(0, parseInt(result[3], 16) - amount);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

export function applyPrefs(prefs) {
  const root = document.documentElement;
  const fOpt = FONT_OPTIONS.find(f => f.value === prefs.fontSize) || FONT_OPTIONS[1];
  const rgb  = hexToRgb(prefs.noteColor);

  // Directly bind settings parameters to global DOM CSS custom property tokens
  root.style.setProperty("--note-font-size", fOpt.px);
  root.style.setProperty("--accent",         prefs.noteColor);
  root.style.setProperty("--primary",        prefs.noteColor);
  root.style.setProperty("--primary-h",      darkenHex(prefs.noteColor));
  root.style.setProperty("--primary-ring",   `rgba(${rgb}, 0.18)`);
  root.style.setProperty("--shadow-btn",     `0 6px 20px rgba(${rgb}, 0.32)`);
  root.style.setProperty("--shadow-sm",      `0 2px 12px rgba(${rgb}, 0.08)`);
  root.style.setProperty("--shadow",         `0 2px 12px rgba(${rgb}, 0.08)`);
  // Fix 2: cập nhật màu thanh bên trái của note card theo theme
  root.style.setProperty("--note-color",     prefs.noteColor);
}

/* ═══════════════════════════════════════════════════════
   MAIN MODAL INTERFACE COMPONENT
═══════════════════════════════════════════════════════ */
function UserPreferencesModal({ onClose }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [saved, setSaved] = useState(false);

  // Real-time preview observer loop: Triggers styling pipeline as configurations shift locally
  useEffect(() => { applyPrefs(prefs); }, [prefs]);

  // Persists localized updates to storage and triggers confirmation lifecycle delays before closing
  const handleSave = () => {
    savePrefs(prefs);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  // Reverts settings parameters back to hardcoded default values
  const handleReset = () => {
    setPrefs({ ...DEFAULT_PREFS });
  };

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="up-modal" onClick={e => e.stopPropagation()}>

        {/* ── HEADER SECTION ── */}
        <div className="up-header">
          <div className="up-header-left">
            <div className="up-icon-wrap"><i className="bi bi-sliders" /></div>
            <span className="up-title">Display Preferences</span>
          </div>
          <button className="up-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* ── FORM BODY CONTROLS ── */}
        <div className="up-body">

          {/* CONTROL BLOCK 1: Note Text Typography Scaling options */}
          <section className="up-section">
            <div className="up-section-title">
              <i className="bi bi-fonts" /> Note Font Size
            </div>
            <div className="up-font-row">
              {FONT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`up-font-btn ${prefs.fontSize === opt.value ? "up-font-btn--active" : ""}`}
                  onClick={() => set("fontSize", opt.value)}
                >
                  <span className="up-font-preview" style={{ fontSize: opt.px }}>Aa</span>
                  <span className="up-font-label">{opt.label}</span>
                  <span className="up-font-px">{opt.px}</span>
                </button>
              ))}
            </div>

            {/* Typography Scaled Layout Mock Box */}
            <div className="up-preview-box">
              <span style={{ fontSize: FONT_OPTIONS.find(f => f.value === prefs.fontSize)?.px }}>
                This is a preview of the note content text using the selected size.
              </span>
            </div>
          </section>

          {/* CONTROL BLOCK 2: Core Global Accent Palette Selection triggers */}
          <section className="up-section">
            <div className="up-section-title">
              <i className="bi bi-palette" /> Theme Theme Color
            </div>
            <div className="up-color-grid">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  className={`up-color-swatch ${prefs.noteColor === color ? "up-color-swatch--active" : ""}`}
                  style={{ background: color }}
                  onClick={() => set("noteColor", color)}
                  title={color}
                >
                  {prefs.noteColor === color && <i className="bi bi-check2" />}
                </button>
              ))}
            </div>

            {/* Custom Interactive Color Pipette Stream Wrapper */}
            <div className="up-custom-color">
              <label className="up-custom-label">
                <i className="bi bi-eyedropper" /> Custom Color:
              </label>
              <div className="up-custom-picker-wrap">
                <input
                  type="color"
                  className="up-color-input"
                  value={prefs.noteColor}
                  onChange={e => set("noteColor", e.target.value)}
                />
                <span className="up-color-hex">{prefs.noteColor}</span>
              </div>
            </div>

            {/* Complete UI Card Composition Aesthetic Preview Panel */}
            <div className="up-color-preview" style={{ "--preview-color": prefs.noteColor }}>
              <div className="up-color-preview-card">
                <div className="up-color-preview-title">Note Title</div>
                <div className="up-color-preview-text">Sample note content body rendering...</div>
                <div className="up-color-preview-btn">Accent Theme</div>
              </div>
            </div>
          </section>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="up-footer">
          <button className="up-btn up-btn--reset" onClick={handleReset} title="Restore factory defaults">
            <i className="bi bi-arrow-counterclockwise" /> Reset Defaults
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="up-btn up-btn--cancel" onClick={onClose}>Cancel</button>
            <button className={`up-btn up-btn--save ${saved ? "up-btn--saved" : ""}`} onClick={handleSave}>
              {saved
                ? <><i className="bi bi-check2-circle" /> Saved!</>
                : <><i className="bi bi-floppy" /> Save Settings</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPreferencesModal;