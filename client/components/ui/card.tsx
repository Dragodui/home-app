import type { FC, ReactNode } from "react";
import { TouchableOpacity, View, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";

type CardVariant = "default" | "surface" | "yellow" | "purple" | "pink" | "mint" | "white";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  borderRadius?: number;
  className?: string;
}

const Card: FC<CardProps> = ({
  children,
  variant = "default",
  style,
  onPress,
  padding = 24,
  borderRadius = 32,
  className,
}) => {
  const { theme } = useTheme();

  const getVariantClasses = () => {
    switch (variant) {
      case "surface":
        return theme.isDark ? "bg-surface-dark" : "bg-surface";
      case "yellow":
        return "bg-accent-yellow";
      case "purple":
        return "bg-accent-purple";
      case "pink":
        return "bg-accent-pink";
      case "mint":
        return "bg-accent-mint";
      case "white":
        return "bg-white";
      default:
        return theme.isDark ? "bg-surface-dark" : "bg-surface";
    }
  };

  const combinedClassName = `overflow-hidden ${getVariantClasses()} ${className || ""}`;

  if (onPress) {
    return (
      <TouchableOpacity
        className={combinedClassName}
        style={[{ padding, borderRadius }, style]}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={combinedClassName} style={[{ padding, borderRadius }, style]}>
      {children}
    </View>
  );
};

export default Card;
