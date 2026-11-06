import type { FC } from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "@/stores/themeStore";

export type TextVariant =
  | "hero"
  | "largeTitle"
  | "display"
  | "title"
  | "heading"
  | "subtitle"
  | "body"
  | "label"
  | "bodySmall"
  | "caption"
  | "micro"
  | "overline";

export type TextColor = "primary" | "secondary" | "muted" | "onAccent" | "onDanger" | "danger";

const VARIANT_CLASSES: Record<TextVariant, string> = {
  hero: "text-5xl font-manrope-extrabold",
  largeTitle: "text-4xl font-manrope-bold",
  display: "text-3xl font-manrope-bold",
  title: "text-2xl font-manrope-bold",
  heading: "text-lg font-manrope-bold",
  subtitle: "text-base font-manrope-semibold",
  body: "text-base font-manrope",
  label: "text-sm font-manrope-semibold",
  bodySmall: "text-sm font-manrope",
  caption: "text-xs font-manrope",
  micro: "text-[10px] font-manrope",
  overline: "text-xs font-manrope-bold uppercase tracking-widest",
};

const DEFAULT_COLOR: Partial<Record<TextVariant, TextColor>> = {
  overline: "secondary",
};

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  className?: string;
}

const Text: FC<TextProps> = ({ variant = "body", color, className, style, ...rest }) => {
  const { theme } = useTheme();

  const colors: Record<TextColor, string> = {
    primary: theme.text,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    onAccent: theme.onAccent,
    onDanger: theme.onDanger,
    danger: theme.status.error,
  };

  return (
    <RNText
      className={`${VARIANT_CLASSES[variant]} ${className || ""}`}
      style={[{ color: colors[color ?? DEFAULT_COLOR[variant] ?? "primary"] }, style]}
      {...rest}
    />
  );
};

export default Text;
