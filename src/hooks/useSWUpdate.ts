import { useRegisterSW } from "virtual:pwa-register/react";

export function useSWUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return {
    needRefresh,
    update: () => updateServiceWorker(true),
  };
}
