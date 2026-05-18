# NOTESPACE — PROJECT README
Note Management Web Application

## TABLE OF CONTENTS
  1. Project Overview
  2. Technology Stack
  3. Features Implemented
  4. Running the Project (Docker Compose — Recommended)
  5. Running the Project (Manual / Development Mode)
  6. Pre-loaded Test Accounts
  7. Optional / Extra-Point Features
  8. Notes for Evaluators
  9. Known Limitations

## 1. PROJECT OVERVIEW

NoteSpace is a full-stack note management web application built with React
(frontend) and Node.js/Express (backend), using MongoDB Atlas as the database.
It supports note creation, labeling, sharing, password protection, real-time
collaboration, and offline capability via a Progressive Web App (PWA) approach.

## 2. TECHNOLOGY STACK

  Frontend:
    - React 19 + React Router v7
    - Vite 8 (build tool)
    - Socket.IO Client (real-time collaboration)
    - Bootstrap Icons, Bootstrap 5 (UI)
    - Custom CSS with CSS variables (light/dark theme support)

  Backend:
    - Node.js + Express 5
    - MongoDB Atlas (cloud database) via Mongoose
    - Socket.IO (WebSocket server)
    - bcryptjs (password hashing)
    - Nodemailer + Gmail SMTP (email notifications)
    - Cloudinary (image upload & storage)
    - Multer (file handling middleware)

  Infrastructure:
    - Docker + Docker Compose (containerized deployment)
    - Nginx (frontend static server + reverse proxy)

## 3. FEATURES IMPLEMENTED

  --- 2.1 Account Management ---
  [x] Login required to access the app; redirects unauthenticated users
  [x] Registration with email, display name, and password (bcrypt-hashed)
  [x] OTP verification sent to email after registration
  [x] Unverified accounts can use all features; a banner prompts email
      verification until the OTP is confirmed
  [x] User Preferences: font size (4 levels), accent/note color, dark/light
      theme toggle
  [x] Password reset via OTP sent to email (expires in 10 minutes); user
      must log in again after reset

  --- 2.2 Simple Note Management ---
  [x] Grid view by default; toggle to list view
  [x] Single modal interface for both creating and editing notes (title +
      content only)
  [x] Auto-save with debounce — no manual Save button required
  [x] Delete confirmation dialog before any note is permanently removed
  [x] Image attachments (one or multiple) via Cloudinary upload
  [x] Notes sorted by pinned status first, then by last modified time
      (most recent at top); pinned notes sorted by pin time
  [x] Live search (300ms debounce) scanning both title and content
  [x] Label management: view all, create, rename, delete labels
  [x] Filter notes by label; notes retain their labels if a label is deleted;
      renaming a label reflects instantly on all associated notes

  --- 2.3 Advanced Note Management ---
  [x] Per-note password protection (bcrypt-hashed, unique per note)
  [x] Password prompt required before viewing, editing, or deleting a
      locked note
  [x] Change note password (requires current password first)
  [x] Disable note password (requires current password confirmation)
  [x] Share notes with registered users via email; specify read-only or
      edit permission; share with multiple recipients
  [x] Owner can view all recipients, modify permissions, or revoke access
      at any time from the Share modal
  [x] "Shared with me" section showing sharer name, permission level, and
      share timestamp
  [x] Real-time collaboration for notes shared with edit permission
      (Socket.IO: live sync of content, typing indicators, presence
      awareness — user-joined / user-left events)
  [x] Visual status icons on note cards: lock icon (password-protected),
      people icon (shared), pin icon (pinned) — visible in both grid and
      list views
  [x] Email validation on share: only registered emails are accepted

  --- 2.4 Additional Requirements ---
  [x] PWA offline support: Service Worker caches static assets (network-first
      strategy); offline edits are queued and synced automatically when the
      connection is restored
  [x] Docker Compose deployment (see Section 4)
  [x] Responsive design with media query breakpoints for mobile, tablet, and
      desktop

## 4. RUNNING THE PROJECT — DOCKER COMPOSE (RECOMMENDED)

Prerequisites:
  - Docker Desktop (or Docker Engine + Docker Compose) installed and running
  - Ports 80 and 5000 available on the host machine

Steps:

  1. Extract the submitted ZIP file to a folder on your machine.

  2. Open a terminal in the root of the project (where docker-compose.yml is).

  3. Build and start all services:

       docker-compose up --build

  4. Wait for both containers to start. You should see:
       ✅ Connected to MongoDB
       Server running on port 5000

  5. Open your browser and navigate to:

       http://localhost

  The frontend (Nginx on port 80) automatically proxies /api and /socket.io
  requests to the backend container (port 5000). No extra configuration needed.

  6. To stop the application:

       docker-compose down

Notes:
  - The database is hosted on MongoDB Atlas (cloud). An active internet
    connection is required even when running locally via Docker.
  - All environment variables (DB URI, email credentials, Cloudinary keys)
    are already embedded in docker-compose.yml and backend/.env for ease of
    evaluation. No additional .env setup is required.

## 5. RUNNING THE PROJECT — MANUAL / DEVELOPMENT MODE

Prerequisites:
  - Node.js >= 18
  - npm >= 9

Step A — Start the Backend:

  cd backend
  npm install
  node server.js

  The backend runs on http://localhost:5000

Step B — Start the Frontend (in a separate terminal):

  cd frontend
  npm install
  npm run dev

  The frontend dev server runs on http://localhost:5173
  (Vite is configured to proxy /api and /socket.io to localhost:5000)

Step C — Open the application:

  http://localhost:5173

## 6. PRE-LOADED TEST ACCOUNTS

The following accounts have been created in the database with sample notes,
labels, and shared content for evaluation purposes.


  Account 1
  
  Email:    huynhduc9881@gmail.com
  
  Password: Duc12345@
  
  Contains: sample notes, pinned notes, labeled notes, password-protected notes, shared notes
  
  
  Account 2
  
  Email:    duchoc12h@gmail.com
  
  Password: Duc12345@
  
  Contains: notes shared from Account 1 (view + edit)
  

  Note for evaluators: To test real-time collaboration, log into Account 1
  in one browser (or tab) and Account 2 in another, then open the same
  shared editable note in both.

  To test email features (OTP verification, password reset), use a real
  email address during registration. Emails are sent from:
    pokemongo99113@gmail.com  via Gmail SMTP.

## 7. OPTIONAL / EXTRA-POINT FEATURES

The following features go beyond the basic requirements and are implemented
for additional credit:

  (a) REAL-TIME COLLABORATION (WebSocket)
      Notes shared with "edit" permission support simultaneous multi-user
      editing. Changes from any editor are broadcast instantly to all other
      users viewing the same note. A typing indicator shows when another user
      is actively editing.
      Implementation: Socket.IO rooms per note (note:<id>), events:
        - note-updated: syncs saved content to all viewers
        - user-typing:  broadcasts typing presence
        - user-joined / user-left: presence awareness

  (b) IMAGE ATTACHMENTS
      Notes support one or multiple image attachments. Images are uploaded
      to Cloudinary and displayed as thumbnails on note cards. Password-
      protected notes blur their thumbnail until unlocked.

  (c) PWA OFFLINE QUEUE
      When the user edits a note while offline, the change is saved to a
      local in-memory queue (offlineQueue.js). When connectivity is restored,
      the queue is flushed automatically and the note is synced to the server.
      An offline banner (OfflineBanner.jsx) notifies the user of their
      connectivity status.

  (d) USER PREFERENCES (THEME & FONT)
      The preferences panel allows:
        - Note font size: Small / Medium / Large / X-Large
        - Accent/primary color: 10 presets + custom color picker
        - Dark / Light mode toggle (persisted across sessions)
      Color changes apply globally to all UI accent elements in real time.

  (e) PER-NOTE PASSWORD PROTECTION (BETTER APPROACH)
      - Enabling password: stored as bcrypt hash
      - Changing password: must verify current password first
      - Disabling password: must verify current password before removal
      - Unlocking to view/edit/delete: password prompt intercepted at card
        click level, before any action proceeds

  (f) SHARING WITH FINE-GRAINED PERMISSION CONTROL
      - Owner sees full list of recipients with email + permission + timestamp
      - Owner can change individual permissions (view <-> edit) at any time
      - Owner can revoke access for one user or all users at once
      - Email validation ensures only registered users can be added
      - Real-time Socket.IO events notify recipients when a note is shared
        or access is revoked (note-shared / note-unshared)

  (g) PASSWORD STRENGTH VALIDATION ON REGISTRATION
      Registration enforces strong password rules with a live checklist:
        - At least 8 characters
        - At least one numeric digit
        - At least one special character (!@#$%^&*...)
      Validation is enforced on both frontend (live checklist UI) and backend
      (server-side check before account creation).

## 8. NOTES FOR EVALUATORS

  - Database: MongoDB Atlas (cloud-hosted). No local MongoDB installation
    needed. The connection string, credentials, and all API keys are already
    in docker-compose.yml and backend/.env.

  - Email (Nodemailer/Gmail): OTP emails for registration and password reset
    are sent from pokemongo99113@gmail.com. If testing with a real email
    address, check the inbox (and spam folder) for the 6-digit OTP code.
    The OTP expires in 10 minutes.

  - Image Upload (Cloudinary): Image uploads are handled by Cloudinary.
    An internet connection is required for image upload functionality.

  - WebSocket: Socket.IO is used for real-time features. The Nginx config
    (nginx.conf) correctly proxies WebSocket upgrade headers. When running
    via Docker Compose, real-time features work out of the box.

  - Dark Mode: Toggle the sun/moon icon in the top-right of the navbar.
    The theme preference is saved in localStorage and persists across sessions.

  - Offline Mode: Disable your network connection while logged in to see the
    offline banner. Any note edits made offline are queued and replayed once
    the connection is restored.

## 9. KNOWN LIMITATIONS

  - After registration, users are redirected to the OTP verification screen
    before accessing the app. This differs slightly from the spec's
    "automatically logged in" wording, but ensures email integrity before
    granting full access.

  - The activation mechanism uses a 6-digit OTP (instead of a clickable link
    in the email). The functionality is equivalent — the OTP expires and can
    be resent.

  - When setting a note password for the first time, the password is entered
    once (not twice). The "change password" and "disable password" flows
    correctly require the current password as confirmation.

  - Note content is not persisted to IndexedDB for offline reading. The
    Service Worker caches the app shell (HTML/CSS/JS) and queues write
    operations, but previously loaded notes are not available offline from
    local storage.

  - Email notification to recipients when a note is shared with them is not
    yet implemented; recipients are notified via a real-time Socket.IO event
    if they are currently online.

END OF README
