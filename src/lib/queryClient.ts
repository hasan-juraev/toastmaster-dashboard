import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      // Don't retry when offline — fail fast and show cached data
      retry: (failureCount, _error: unknown) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
    },
  },
});

// Persist the query cache to localStorage so data is available on reload and offline
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "tm-query-cache",
});
