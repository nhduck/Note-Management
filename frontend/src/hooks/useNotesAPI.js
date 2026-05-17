import { useCallback } from "react";

const getToken = () => localStorage.getItem("token") || "";
export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export function useNotesAPI(profile, setNotes, setLabels, activeLabel) {
  const fetchNotes = useCallback(async () => {
    if (!profile) return;
    try {
      const url = activeLabel
        ? `/api/notes?userId=${profile.id}&labelId=${activeLabel._id}`
        : `/api/notes?userId=${profile.id}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setNotes(data.notes);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  }, [profile, activeLabel, setNotes]);

  const fetchLabels = useCallback(async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/labels?userId=${profile.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setLabels(data.labels);
    } catch (err) {
      console.error("Error fetching labels:", err);
    }
  }, [profile, setLabels]);

  return { fetchNotes, fetchLabels };
}
