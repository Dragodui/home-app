import { Platform } from "react-native";
import { notificationApi } from "@/lib/api";

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export type PushPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export async function getPushState(): Promise<PushPermissionState> {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermissionState;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return false;

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  await notificationApi.subscribeToPushNotifications(subscription);
  return true;
}
