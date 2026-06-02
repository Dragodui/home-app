import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const WEB_NON_PERSISTENT_KEYS = new Set(["auth_token"]);

/**
 * Wrapper around expo-secure-store for sensitive data (auth token, user info).
 * On web, auth tokens are intentionally not persisted because SecureStore is not available.
 * Non-sensitive preferences (theme, language, home ID) should continue using AsyncStorage.
 */
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      if (WEB_NON_PERSISTENT_KEYS.has(key)) return null;
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (WEB_NON_PERSISTENT_KEYS.has(key)) {
        await AsyncStorage.removeItem(key);
        return;
      }
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
