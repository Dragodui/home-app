import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

// You need to replace these with your actual Google OAuth credentials
// Get them from https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const FALLBACK_DISABLED_CLIENT_ID = "000000000000-disabled.apps.googleusercontent.com";

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

export function useGoogleAuth() {
  const hasWebClientId = GOOGLE_CLIENT_ID.trim().length > 0;
  const hasAndroidClientId = GOOGLE_ANDROID_CLIENT_ID.trim().length > 0;
  const hasIosClientId = GOOGLE_IOS_CLIENT_ID.trim().length > 0;
  const hasConfigForPlatform =
    Platform.OS === "web" ? hasWebClientId : Platform.OS === "android" ? hasAndroidClientId : hasIosClientId;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: hasWebClientId ? GOOGLE_CLIENT_ID : FALLBACK_DISABLED_CLIENT_ID,
    androidClientId: hasAndroidClientId ? GOOGLE_ANDROID_CLIENT_ID : undefined,
    iosClientId: hasIosClientId ? GOOGLE_IOS_CLIENT_ID : undefined,
  });

  const getUserInfo = async (accessToken: string): Promise<GoogleUser | null> => {
    try {
      const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = await response.json();
      return {
        email: user.email,
        name: user.name,
        picture: user.picture,
      };
    } catch (error) {
      console.error("Error fetching Google user info:", error);
      return null;
    }
  };

  return {
    request,
    response,
    promptAsync,
    getUserInfo,
    isReady: hasConfigForPlatform && !!request,
  };
}
