import type { Theme } from "@/stores/themeStore";

export type Tone = "neutral" | "purple" | "yellow" | "pink" | "mint" | "cyan" | "green" | "warning" | "danger";

interface ToneColors {
  /** Saturated fill and the foreground that stays readable on it. */
  solid: string;
  onSolid: string;
  /** Tinted fill and the foreground that stays readable on it. */
  soft: string;
  onSoft: string;
}

const ACCENT_KEYS = {
  purple: "purple",
  yellow: "yellow",
  pink: "pink",
  mint: "mint",
  cyan: "cyan",
  green: "green",
} as const;

/** Tinted fill and readable foreground for an arbitrary color, such as one chosen by a user. */
export function getSoftColors(theme: Theme, color: string): { soft: string; onSoft: string } {
  // Pastel accents have no contrast on a light background, so light mode tints harder and uses body text.
  return {
    soft: `${color}${theme.softAlpha}`,
    onSoft: theme.isDark ? color : theme.text,
  };
}

export function getToneColors(theme: Theme, tone: Tone): ToneColors {
  if (tone === "neutral") {
    return { solid: theme.surface, onSolid: theme.text, soft: theme.surface, onSoft: theme.text };
  }

  if (tone === "danger") {
    return {
      solid: theme.accent.dangerLight,
      onSolid: theme.onDanger,
      soft: theme.accent.pinkLight,
      onSoft: theme.accent.pink,
    };
  }

  const color = tone === "warning" ? theme.status.warning : theme.accent[ACCENT_KEYS[tone]];
  return {
    solid: color,
    onSolid: theme.onFill,
    ...getSoftColors(theme, color),
  };
}
