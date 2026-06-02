import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const WEB_NON_PERSISTENT_KEYS = new Set<string>([]);

/**
 * Wrapper around expo-secure-store for sensitive data (auth token, user info).
 * On web, we use AsyncStorage as a fallback for SecureStore.
 * Non-sensitive preferences (theme, language, home ID) also use AsyncStorage.
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
