import AsyncStorage from "@react-native-async-storage/async-storage";
import { type ColorSchemeName, Appearance } from "react-native";
import { create } from "zustand";
import { accentColors, categoryColors, darkTheme, lightTheme, statusColors, userColors } from "@/constants/colors";

type ThemeMode = "light" | "dark" | "system";

interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  inputBackground: string;
  inputText: string;
  inputPlaceholder: string;
  inputBorder: string;
  inputBorderFocused: string;
  navBackground: string;
  navIconActive: string;
  navIconInactive: string;
  tabIconActiveBackground: string;
  accent: typeof accentColors;
  status: typeof statusColors;
  userColors: typeof userColors;
  categoryColors: typeof categoryColors;
}

const THEME_STORAGE_KEY = "@home_app_theme";

function buildTheme(mode: ThemeMode, systemScheme: string | null | undefined): Theme {
  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const themeColors = isDark ? darkTheme : lightTheme;
  return {
    mode,
    isDark,
    ...themeColors,
    accent: accentColors,
    status: statusColors,
    userColors,
    categoryColors,
  };
}

interface ThemeState {
  themeMode: ThemeMode;
  theme: Theme;
  isLoaded: boolean;
  init: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

let appearanceSubscription: { remove: () => void } | null = null;

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: "dark",
  theme: buildTheme("dark", Appearance.getColorScheme()),
  isLoaded: false,

  init: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        set({
          themeMode: saved,
          theme: buildTheme(saved, Appearance.getColorScheme()),
        });
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    } finally {
      set({ isLoaded: true });
    }

    // Remove previous listener if init is called again
    if (appearanceSubscription) {
      appearanceSubscription.remove();
    }

    // Listen for system theme changes
    appearanceSubscription = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      const { themeMode } = get();
      if (themeMode === "system") {
        set({ theme: buildTheme("system", colorScheme) });
      }
    });
  },

  setThemeMode: (mode: ThemeMode) => {
    set({
      themeMode: mode,
      theme: buildTheme(mode, Appearance.getColorScheme()),
    });
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(console.error);
  },

  toggleTheme: () => {
    const newMode = get().themeMode === "dark" ? "light" : "dark";
    get().setThemeMode(newMode);
  },
}));

// Convenience hook matching existing API
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const themeMode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { theme, themeMode, setThemeMode, toggleTheme };
}

export function useThemeColors() {
  return useThemeStore((s) => s.theme);
}
