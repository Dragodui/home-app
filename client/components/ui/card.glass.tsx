import type { FC, ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { GlassSurface } from "./glass-surface.web";

type CardVariant = "default" | "surface" | "yellow" | "purple" | "pink" | "mint" | "white";
type CardSize = "sm" | "md" | "lg";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  padding?: number;
  borderRadius?: number;
  className?: string;
}

const SIZES: Record<CardSize, { padding: number; borderRadius: number }> = {
  sm: { padding: 16, borderRadius: 20 },
  md: { padding: 20, borderRadius: 20 },
  lg: { padding: 24, borderRadius: 32 },
};

/** Web version of Card: always glass. Same props as card.tsx. */
const Card: FC<CardProps> = ({
  children,
  size = "lg",
  style,
  onPress,
  onLongPress,
  padding = SIZES[size].padding,
  borderRadius = SIZES[size].borderRadius,
  className,
}) => {
  // Colored variants and fills from callers all become glass: the prototype has no colored blocks.
  const { backgroundColor: _ignored, ...layoutStyle } = StyleSheet.flatten(style) ?? {};

  return (
    <GlassSurface
      onPress={onPress}
      onLongPress={onLongPress}
      className={className}
      style={[{ padding, borderRadius, overflow: "hidden" }, layoutStyle]}
    >
      {children}
    </GlassSurface>
  );
};

export default Card;
