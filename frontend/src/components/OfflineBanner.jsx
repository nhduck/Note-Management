import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      background: "#f59e0b",
      color: "#451a03",
      textAlign: "center",
      padding: "8px 16px",
      fontSize: "13px",
      fontWeight: "500",
      letterSpacing: "0.01em",
      zIndex: 9999,
      position: "relative",
    }}>
      ⚠️ Bạn đang offline — note vẫn được lưu và sẽ tự đồng bộ khi có mạng lại
    </div>
  );
}
