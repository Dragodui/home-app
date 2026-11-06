import { createContext, useContext } from "react";
import { Platform, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";

const InModalContext = createContext(false);

/** Marks content as sitting on a Modal sheet, which already uses theme.surface as its background. */
export const ModalSurfaceProvider = InModalContext.Provider;

export function useInModal() {
  return useContext(InModalContext);
}

/** Fill for cards and controls that stays visible both on a screen and on a Modal sheet. */
export function useControlSurface() {
  const { theme } = useTheme();
  return useInModal() ? theme.sheetControl : theme.surface;
}

/** Blurs what is behind a translucent surface in the web Liquid Glass prototype. Native surfaces are opaque. */
export const frostStyle = (Platform.OS === "web" ? { backdropFilter: "blur(24px) saturate(170%)" } : undefined) as
  | ViewStyle
  | undefined;
