// Liquid Glass prototype: a designed black and white palette, not a desaturated one. Pure black and white with no gray
// fills: surfaces are glass, and emphasis comes from inverting them. Red stays only for destructive actions and errors.
export type UiStyle = "classic" | "glass";

export const SUPPORTS_UI_STYLES = true;
export const DEFAULT_UI_STYLE: UiStyle = "glass";

export function getGlassThemeOverrides(isDark: boolean) {
  const ink = isDark ? "#FFFFFF" : "#000000";
  const paper = isDark ? "#000000" : "#FFFFFF";

  return {
    background: paper,
    surface: isDark ? "#161618" : "#FFFFFF",
    surfaceLight: isDark ? "#1F1F22" : "#FFFFFF",
    text: ink,
    textSecondary: isDark ? "rgba(235, 235, 245, 0.6)" : "rgba(60, 60, 67, 0.6)",
    textMuted: isDark ? "rgba(235, 235, 245, 0.4)" : "rgba(60, 60, 67, 0.4)",
    border: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.1)",
    borderLight: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    inputText: ink,
    inputPlaceholder: isDark ? "rgba(235, 235, 245, 0.45)" : "rgba(60, 60, 67, 0.45)",
    inputBorderFocused: ink,
    sheetBackground: isDark ? "rgba(22, 22, 24, 0.82)" : "rgba(255, 255, 255, 0.82)",
    sheetControl: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
    // Cards are glass here, so what stands on them reads as body text. Real fills are inverted.
    onAccent: ink,
    onFill: paper,
    softAlpha: isDark ? "20" : "12",
    optionFill: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
    selectedFill: ink,
    onSelectedFill: paper,
    accent: {
      purple: ink,
      purpleDark: ink,
      yellow: ink,
      yellowDark: ink,
      pink: ink,
      pinkLight: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
      pinkBadge: isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.08)",
      mint: ink,
      mintDark: ink,
      green: ink,
      greenLight: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
      cyan: ink,
      danger: "#FF453A",
      dangerLight: "#FF3B30",
    },
    status: { success: ink, warning: ink, info: ink, error: "#FF453A" },
    userColors: [ink],
    categoryColors: { dinner: ink, snacks: ink, birthday: ink, other: ink },
  };
}

/** In the glass style stored colors, such as one picked for a room, are not shown. The stored value does not change. */
export function toDisplayColor(color: string, theme: { isDark: boolean; uiStyle: UiStyle }) {
  if (theme.uiStyle !== "glass") return color;
  return theme.isDark ? "#FFFFFF" : "#000000";
}

/** Glass chart segments differ by the opacity of the ink, which keeps them clean instead of a ramp of grays. */
export function toChartColor(color: string, index: number, theme: { isDark: boolean; uiStyle: UiStyle }) {
  if (theme.uiStyle !== "glass") return color;
  const ink = theme.isDark ? "#FFFFFF" : "#000000";
  return `${ink}${["FF", "8C", "4D", "26"][index % 4]}`;
}
