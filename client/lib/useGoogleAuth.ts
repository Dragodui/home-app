import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// You need to replace these with your actual Google OAuth credentials
// Get them from https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || "",
    iosClientId: GOOGLE_IOS_CLIENT_ID || "",
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
    isReady: !!request,
  };
}
