import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Singleton socket instance — tái sử dụng xuyên suốt app
let _socket = null;

function getSocket() {
  if (!_socket) {
    _socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return _socket;
}

/**
 * useSocket(noteId, onNoteUpdated)
 * - Join phòng note khi mở editor
 * - Lắng nghe event "note-updated" từ server
 * - Leave phòng khi đóng editor hoặc đổi note
 */
export function useSocket(noteId, onNoteUpdated) {
  const callbackRef = useRef(onNoteUpdated);

  // Luôn giữ callback ref mới nhất để tránh stale closure
  useEffect(() => {
    callbackRef.current = onNoteUpdated;
  }, [onNoteUpdated]);

  useEffect(() => {
    if (!noteId) return;

    const socket = getSocket();

    // Tham gia phòng riêng cho note này
    socket.emit("join-note", noteId);

    const handler = (data) => {
      // Chỉ apply update nếu đúng noteId đang mở
      if (data.noteId === noteId) {
        callbackRef.current?.(data);
      }
    };

    socket.on("note-updated", handler);

    return () => {
      socket.emit("leave-note", noteId);
      socket.off("note-updated", handler);
    };
  }, [noteId]);
}
