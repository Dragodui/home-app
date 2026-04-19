 import { useEffect } from "react";
import { Platform } from "react-native";
import { useToast } from "@/components/ui/toast";
import { wsManager } from "@/lib/websocket";
import { useAuthStore } from "@/stores/authStore";
import { notificationApi } from "@/lib/api";

function getNotificationDescription(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const value = (data as { description?: unknown }).description;
  return typeof value === "string" ? value : "";
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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
        // Native browser notification for foreground/hidden state
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
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    async function subscribeToPush() {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission !== "granted") {
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          // Already subscribed, we could optionally send it to the server again to ensure it's saved
          await notificationApi.subscribeToPushNotifications(existingSubscription).catch(() => {});
          return;
        }

        const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn("VAPID Public Key is missing");
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        await notificationApi.subscribeToPushNotifications(subscription);
        console.log("Subscribed to push notifications successfully.");
      } catch (err) {
        console.error("Failed to subscribe to push notifications", err);
      }
    }

    subscribeToPush();
  }, [isAuthenticated]);

  return null;
}
