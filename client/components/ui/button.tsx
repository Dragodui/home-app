import type { FC } from "react";
import { ActivityIndicator, Text, type TextStyle, TouchableOpacity, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";

type ButtonVariant = "primary" | "secondary" | "yellow" | "purple" | "pink" | "outline" | "bordered" | "danger";
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
  icon?: React.ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<ButtonSize, { container: string; text: string }> = {
  lg: { container: "h-16 rounded-20 px-6", text: "text-base" },
  md: { container: "h-12 rounded-14 px-4", text: "text-sm" },
  sm: { container: "h-9 rounded-xl px-3", text: "text-xs" },
};

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

  const getVariantClasses = () => {
    switch (variant) {
      case "yellow":
        return "bg-accent-yellow";
      case "purple":
        return "bg-accent-purple";
      case "pink":
        return "bg-accent-pink";
      case "secondary":
        return theme.isDark ? "bg-surface-dark" : "bg-surface";
      case "outline":
        return `bg-transparent border-2 border-dashed ${theme.isDark ? "border-gray-700" : "border-gray-100"}`;
      case "bordered":
        return `bg-transparent border ${theme.isDark ? "border-gray-700" : "border-gray-100"}`;
      case "danger":
        return "bg-accent-danger-light";
      default:
        return theme.isDark ? "bg-white" : "bg-primary";
    }
  };

  const getTextColorClass = () => {
    switch (variant) {
      case "yellow":
      case "purple":
      case "pink":
        return "text-primary";
      case "outline":
        return "text-muted";
      case "secondary":
      case "bordered":
        return theme.isDark ? "text-white" : "text-primary";
      case "danger":
        return "text-white";
      default:
        return theme.isDark ? "text-primary" : "text-white";
    }
  };

  const getLoaderColor = () => {
    switch (variant) {
      case "yellow":
      case "purple":
      case "pink":
        return theme.onAccent;
      case "outline":
        return theme.textSecondary;
      case "secondary":
      case "bordered":
        return theme.text;
      case "danger":
        return theme.onDanger;
      default:
        return theme.background;
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      className={`justify-center items-center flex-row gap-2 ${SIZE_CLASSES[size].container} ${getVariantClasses()} ${
        disabled ? "opacity-50" : ""
      } ${className || ""}`}
      style={style}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getLoaderColor()} />
      ) : (
        <>
          {icon}
          <Text className={`${SIZE_CLASSES[size].text} font-manrope-bold ${getTextColorClass()}`} style={textStyle}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
