import type { FC } from "react";
import { ActivityIndicator, Text, type TextStyle, TouchableOpacity, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";

type ButtonVariant = "primary" | "secondary" | "yellow" | "purple" | "pink" | "outline" | "danger";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  className?: string;
}

const Button: FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
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
        return "#1C1C1E";
      default:
        return theme.isDark ? "#1C1C1E" : "#FFFFFF";
    }
  };

  return (
    <TouchableOpacity
      className={`h-16 rounded-20 justify-center items-center flex-row gap-2 px-6 ${getVariantClasses()} ${
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
          <Text className={`text-base font-manrope-bold ${getTextColorClass()}`} style={textStyle}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
