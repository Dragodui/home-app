// Liquid Glass prototype: cards stay opaque, so glass bends the content that scrolls under it.
// Only sheets are translucent.
export function getGlassThemeOverrides(isDark: boolean) {
  return isDark
    ? {
        sheetBackground: "rgba(38, 38, 44, 0.72)",
        sheetControl: "rgba(255, 255, 255, 0.1)",
      }
    : {
        sheetBackground: "rgba(246, 246, 250, 0.72)",
        sheetControl: "rgba(255, 255, 255, 0.65)",
      };
}
