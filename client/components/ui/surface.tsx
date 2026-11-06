import { createContext, useContext } from "react";
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
  return useInModal() ? theme.background : theme.surface;
}
