import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, type ColorSchemeName } from "react-native";
import { create } from "zustand";
import { accentColors, categoryColors, darkTheme, lightTheme, statusColors, userColors } from "@/constants/colors";
import { DEFAULT_UI_STYLE, getGlassThemeOverrides, SUPPORTS_UI_STYLES, type UiStyle } from "@/constants/glass-theme";

type ThemeMode = "light" | "dark" | "system";

export interface Theme {
  mode: ThemeMode;
  uiStyle: UiStyle;
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
  sheetBackground: string;
  sheetControl: string;
  onAccent: string;
  onFill: string;
  softAlpha: string;
  optionFill: string;
  selectedFill: string;
  onSelectedFill: string;
  onDanger: string;
  accent: typeof accentColors;
  status: typeof statusColors;
  userColors: typeof userColors;
  categoryColors: typeof categoryColors;
}

const THEME_STORAGE_KEY = "@home_app_theme";
const UI_STYLE_STORAGE_KEY = "@home_app_ui_style";

function buildTheme(mode: ThemeMode, systemScheme: string | null | undefined, uiStyle: UiStyle): Theme {
  const isDark = mode === "dark" || (mode === "system" && systemScheme === "dark");
  const themeColors = isDark ? darkTheme : lightTheme;
  return {
    mode,
    uiStyle,
    isDark,
    ...themeColors,
    accent: accentColors,
    status: statusColors,
    userColors,
    categoryColors,
    ...(uiStyle === "glass" ? getGlassThemeOverrides(isDark) : {}),
  };
}

interface ThemeState {
  themeMode: ThemeMode;
  theme: Theme;
  isLoaded: boolean;
  init: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  setUiStyle: (uiStyle: UiStyle) => void;
  toggleTheme: () => void;
}

let appearanceSubscription: { remove: () => void } | null = null;

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: "dark",
  theme: buildTheme("dark", Appearance.getColorScheme(), DEFAULT_UI_STYLE),
  isLoaded: false,

  init: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const savedStyle = SUPPORTS_UI_STYLES ? await AsyncStorage.getItem(UI_STYLE_STORAGE_KEY) : null;
      const themeMode = saved === "light" || saved === "dark" || saved === "system" ? saved : get().themeMode;
      const uiStyle = savedStyle === "classic" || savedStyle === "glass" ? savedStyle : DEFAULT_UI_STYLE;
      set({ themeMode, theme: buildTheme(themeMode, Appearance.getColorScheme(), uiStyle) });
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
        set({ theme: buildTheme("system", colorScheme, get().theme.uiStyle) });
      }
    });
  },

  setThemeMode: (mode: ThemeMode) => {
    set({
      themeMode: mode,
      theme: buildTheme(mode, Appearance.getColorScheme(), get().theme.uiStyle),
    });
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(console.error);
  },

  setUiStyle: (uiStyle: UiStyle) => {
    set({ theme: buildTheme(get().themeMode, Appearance.getColorScheme(), uiStyle) });
    AsyncStorage.setItem(UI_STYLE_STORAGE_KEY, uiStyle).catch(console.error);
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
  const setUiStyle = useThemeStore((s) => s.setUiStyle);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { theme, themeMode, setThemeMode, setUiStyle, toggleTheme };
}

export function useThemeColors() {
  return useThemeStore((s) => s.theme);
}
