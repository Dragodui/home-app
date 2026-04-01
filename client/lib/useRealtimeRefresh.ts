import { useEffect } from "react";
import { type EventModule, wsManager } from "@/lib/websocket";

export function useRealtimeRefresh(modules: EventModule[], callback: () => void) {
  const modulesKey = modules.join(",");

  useEffect(() => {
    return wsManager.subscribe(modules, callback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, modulesKey]);
}
