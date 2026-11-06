import { Button as GlassButton } from "glisse";
import type { FC, ReactNode } from "react";
import { ActivityIndicator, type TextStyle, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "yellow"
  | "purple"
  | "pink"
  | "outline"
  | "bordered"
  | "onAccent"
  | "danger";
type ButtonSize = "lg" | "md" | "sm";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: ReactNode;
  className?: string;
}

const SIZES: Record<ButtonSize, { height: number; fontSize: number; padding: number }> = {
  lg: { height: 56, fontSize: 16, padding: 24 },
  md: { height: 46, fontSize: 14, padding: 18 },
  sm: { height: 34, fontSize: 12, padding: 12 },
};

/** Web version of Button, on Liquid Glass. Same props as button.tsx. */
const Button: FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "lg",
  style,
  textStyle,
  icon,
  className,
}) => {
  const { theme } = useTheme();

  const filled: Partial<Record<ButtonVariant, { fill: string; color: string }>> = {
    primary: { fill: theme.text, color: theme.background },
    yellow: { fill: theme.accent.yellow, color: theme.onAccent },
    purple: { fill: theme.accent.purple, color: theme.onAccent },
    pink: { fill: theme.accent.pink, color: theme.onAccent },
    danger: { fill: theme.accent.dangerLight, color: theme.onDanger },
  };
  const fill = filled[variant];
  const color = fill?.color ?? (variant === "onAccent" ? theme.onAccent : theme.text);
  const { height, fontSize, padding } = SIZES[size];

  return (
    <GlassButton
      variant={fill ? "filled" : "glass"}
      tint={fill?.fill}
      className={className}
      disabled={disabled || loading}
      onClick={onPress}
      icon={loading ? undefined : icon}
      style={{
        height,
        padding: `0 ${padding}px`,
        borderRadius: height / 2,
        color,
        fontFamily: "Manrope_700Bold",
        fontSize,
        minWidth: 0,
        ...(style as object),
      }}
    >
      {loading ? <ActivityIndicator color={color} /> : <span style={textStyle as object}>{title}</span>}
    </GlassButton>
  );
};

export default Button;
