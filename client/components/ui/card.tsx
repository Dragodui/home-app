import type { FC, ReactNode } from "react";
import { TouchableOpacity, View, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";

type CardVariant = "default" | "surface" | "yellow" | "purple" | "pink" | "mint" | "white";
type CardSize = "sm" | "md" | "lg";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  borderRadius?: number;
  className?: string;
}

const SIZES: Record<CardSize, { padding: number; borderRadius: number }> = {
  sm: { padding: 16, borderRadius: 20 },
  md: { padding: 20, borderRadius: 20 },
  lg: { padding: 24, borderRadius: 32 },
};

const Card: FC<CardProps> = ({
  children,
  variant = "default",
  size = "lg",
  style,
  onPress,
  padding = SIZES[size].padding,
  borderRadius = SIZES[size].borderRadius,
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
