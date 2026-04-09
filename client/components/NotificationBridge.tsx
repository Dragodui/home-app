 import { useEffect } from "react";
import { Platform } from "react-native";
import { useToast } from "@/components/ui/toast";
import { wsManager } from "@/lib/websocket";
import { useAuthStore } from "@/stores/authStore";

function getNotificationDescription(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const value = (data as { description?: unknown }).description;
  return typeof value === "string" ? value : "";
}

export function NotificationBridge() {
  const { show } = useToast();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    return wsManager.subscribe(["NOTIFICATION", "HOME_NOTIFICATION"], (event) => {
      if (event.action !== "CREATED") return;
      const description = getNotificationDescription(event.data);
      if (!description) return;

      show({
        title: "Notification",
        message: description,
      });

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        typeof document !== "undefined" &&
        document.hidden &&
        Notification.permission === "granted"
      ) {
        new Notification("Notification", { body: description });
      }
    });
  }, [isAuthenticated, show]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "default"
    ) {
      return;
    }

    Notification.requestPermission().catch(() => undefined);
  }, [isAuthenticated]);

  return null;
}
