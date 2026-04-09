import { Platform } from "react-native";

type AuthSessionListener = () => void;

const listeners = new Set<AuthSessionListener>();
let webStorageListenerInstalled = false;

function installWebStorageListener() {
  if (webStorageListenerInstalled || Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  webStorageListenerInstalled = true;
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === "auth_token" || event.key === "user") {
      if (event.newValue === null) {
        emitAuthSessionExpired();
      }
    }
  });
}

installWebStorageListener();

export function onAuthSessionExpired(listener: AuthSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAuthSessionExpired() {
  for (const listener of listeners) {
    listener();
  }
}
