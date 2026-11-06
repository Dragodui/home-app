export type UiStyle = "classic" | "glass";

// Native has only the classic style, because glisse needs the DOM. See glass-theme.web.ts.
export const SUPPORTS_UI_STYLES = false;
export const DEFAULT_UI_STYLE: UiStyle = "classic";

export function getGlassThemeOverrides(_isDark: boolean) {
  return {};
}

/** How a stored color, such as one a user picked for a room, appears on screen. */
export function toDisplayColor(color: string, _theme: { isDark: boolean; uiStyle: UiStyle }) {
  return color;
}

/** The color of a chart segment. */
export function toChartColor(color: string, _index: number, _theme: { isDark: boolean; uiStyle: UiStyle }) {
  return color;
}
