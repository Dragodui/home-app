import { useEffect } from "react";
import { type EventModule, wsManager } from "@/lib/websocket";

export function useRealtimeRefresh(modules: EventModule[], callback: () => void) {
  const _modulesKey = modules.join(",");

  useEffect(() => {
    return wsManager.subscribe(modules, callback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, modules]);
}
