import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Download, Share, X } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/stores/themeStore";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const IOS_PROMPT_DISMISSED_KEY = "ios-pwa-prompt-dismissed";

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);
  return isIOS && isWebkit && !isChrome && !isFirefox;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { theme } = useTheme();

  useEffect(() => {
    if (Platform.OS !== "web") return;

    // Check if already installed
    if (isStandalone()) return;

    // iOS Safari-specific prompt
    if (isIOSSafari()) {
      AsyncStorage.getItem(IOS_PROMPT_DISMISSED_KEY).then((dismissed) => {
        if (!dismissed) {
          setShowIOSPrompt(true);
        }
      });
      return;
    }

    // Debug: Check PWA criteria
    const checkPWACriteria = async () => {
      const info: string[] = [];

      // 1. Check HTTPS
      info.push(`Protocol: ${window.location.protocol}`);

      // 2. Check manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      info.push(`Manifest: ${manifestLink ? "✓" : "✗"}`);

      // 3. Check Service Worker
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        info.push(`SW: ${registration ? "✓ registered" : "✗ not registered"}`);
      } else {
        info.push("SW: ✗ not supported");
      }

      // 4. Check if already installed
      info.push(`Standalone: ${isStandalone() ? "Yes (already installed)" : "No"}`);

      setDebugInfo(info.join(" | "));
      console.log("[PWA Debug]", info.join("\n"));
    };

    checkPWACriteria();

    const handler = (e: Event) => {
      e.preventDefault();
      console.log("[PWA] beforeinstallprompt fired!");
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Debug: Check if event might have fired before listener
    setTimeout(() => {
      if (!deferredPrompt) {
        console.log("[PWA] No install prompt after 3s. Check criteria.");
      }
    }, 3000);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (Platform.OS !== "web") return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleIOSDismiss = async () => {
    await AsyncStorage.setItem(IOS_PROMPT_DISMISSED_KEY, "true");
    setShowIOSPrompt(false);
  };

  // Show debug info in development
  if (process.env.NODE_ENV === "development" && debugInfo) {
    console.log("[PWA] Debug Info:", debugInfo);
  }

  // iOS Safari prompt
  if (showIOSPrompt) {
    return (
      <View
        className="absolute bottom-6 left-4 right-4 z-50 rounded-2xl p-4 shadow-lg"
        style={{ elevation: 8, backgroundColor: theme.surface }}
      >
        <View className="flex-row items-center">
          <Share size={20} color={theme.accent.purple} />
          <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: theme.text }}>
            Install this app on your iPhone
          </Text>
          <Pressable onPress={handleIOSDismiss} className="p-1">
            <X size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
        <Text className="mt-2 text-xs" style={{ color: theme.textSecondary }}>
          Tap the <Text style={{ fontWeight: "600" }}>Share</Text> button, then{" "}
          <Text style={{ fontWeight: "600" }}>"Add to Home Screen"</Text>
        </Text>
      </View>
    );
  }

  if (!visible) return null;

  return (
    <View
      className="absolute bottom-6 left-4 right-4 z-50 flex-row items-center rounded-2xl px-4 py-3 shadow-lg"
      style={{ elevation: 8, backgroundColor: theme.surface }}
    >
      <Download size={20} color={theme.accent.purple} />
      <Text className="ml-3 flex-1 text-sm font-semibold" style={{ color: theme.text }}>
        Install app for a better experience
      </Text>
      <Pressable
        onPress={handleInstall}
        className="ml-2 rounded-xl px-4 py-2"
        style={{ backgroundColor: theme.accent.purple }}
      >
        <Text className="text-sm font-bold text-white">Install</Text>
      </Pressable>
      <Pressable onPress={handleDismiss} className="ml-2 p-1">
        <X size={18} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}
