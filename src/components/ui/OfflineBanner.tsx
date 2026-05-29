import { useEffect, useState } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  // Show "back online" briefly when reconnecting
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (online) {
      setJustReconnected(true);
      const t = setTimeout(() => setJustReconnected(false), 3000);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (online && !justReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top) + 0.75rem)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        borderRadius: "9999px",
        fontSize: "0.82rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        boxShadow: "0 4px 16px rgba(15,23,42,0.14)",
        background: online ? "rgb(34 197 94)" : "rgb(71 85 105)",
        color: "white",
        transition: "background 300ms ease",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
        {online ? "wifi" : "wifi_off"}
      </span>
      {online ? "Back online" : "You're offline — showing cached data"}
    </div>
  );
}
