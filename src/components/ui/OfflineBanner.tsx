import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

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
        background: "rgb(71 85 105)",
        color: "white",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
        wifi_off
      </span>
      You're offline — showing cached data
    </div>
  );
}
