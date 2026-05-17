import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Single shared socket instance reused across the entire app
let _socket = null;

export function getSocket() {
  if (!_socket) {
    _socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return _socket;
}

/**
 * Join the current user's personal socket room so they receive note-updated
 * events even when the editor is not open
 * Call this once after the user profile is loaded.
 */
export function joinUserRoom(userId) {
  if (!userId) return;
  const socket = getSocket();
  socket.emit("join-user-room", { userId });
}

/**
 * Emit a "typing" event to all other users viewing the same note.
 * Call this inside an onChange handler with a debounce if needed.
 */
export function emitTyping(noteId, userId, username) {
  const socket = getSocket();
  socket.emit("typing", { noteId, userId, username });
}

/**
 * useSocket(noteId, onNoteUpdated, onUserTyping)
 *
 * - Joins the note room when the editor opens
 * - Listens for "note-updated" events and calls onNoteUpdated
 * - Listens for "user-typing" events and calls onUserTyping
 * - Leaves the room when the editor closes or the noteId changes
 *
 * @param {string|null} noteId       - The ID of the note currently open
 * @param {function}    onNoteUpdated - Called when another user saves the note
 * @param {function}    onUserTyping  - Called when another user is typing
 * @param {object}      currentUser  - { id, username } of the local user
 */
export function useSocket(noteId, onNoteUpdated, onUserTyping, currentUser) {
  // Keep refs so event handlers always see the latest callbacks
  // without needing to re-register the listeners on every render
  const noteUpdatedRef = useRef(onNoteUpdated);
  const userTypingRef  = useRef(onUserTyping);

  useEffect(() => { noteUpdatedRef.current = onNoteUpdated; }, [onNoteUpdated]);
  useEffect(() => { userTypingRef.current  = onUserTyping;  }, [onUserTyping]);

  useEffect(() => {
    if (!noteId) return;

    const socket = getSocket();

    // Join the room, passing user identity so the server can broadcast presence
    socket.emit("join-note", {
      noteId,
      userId:   currentUser?.id       || null,
      username: currentUser?.username || "Someone",
    });

    // Handler: another user saved the note
    const handleNoteUpdated = (data) => {
      if (data.noteId === noteId) {
        noteUpdatedRef.current?.(data);
      }
    };

    // Handler: another user is typing
    const handleUserTyping = (data) => {
      userTypingRef.current?.(data);
    };

    socket.on("note-updated", handleNoteUpdated);
    socket.on("user-typing",  handleUserTyping);

    return () => {
      socket.emit("leave-note", noteId);
      socket.off("note-updated", handleNoteUpdated);
      socket.off("user-typing",  handleUserTyping);
    };
  }, [noteId]);
}