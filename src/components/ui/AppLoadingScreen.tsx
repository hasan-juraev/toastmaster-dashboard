interface AppLoadingScreenProps {
  message?: string;
}

export function AppLoadingScreen({
  message = "Loading dashboard...",
}: AppLoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-6 text-app-text">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-app-border bg-app-panel px-6 py-10 text-center shadow-app-card">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <span className="material-symbols-outlined text-3xl">
            record_voice_over
          </span>
        </div>
        <h1 className="text-xl font-semibold text-app-text">Club Tracker</h1>
        <p className="mt-2 text-sm text-app-text-muted">{message}</p>
      </div>
    </div>
  );
}
