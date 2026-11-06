import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { ActivityIndicator, TouchableOpacity, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { useControlSurface } from "./surface";
import { getToneColors, type Tone } from "./tone";

type IconButtonSize = "sm" | "md";

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  size?: IconButtonSize;
  tone?: Tone;
  /** Saturated accent fill instead of the soft tint, for the primary action of a screen. */
  solid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  className?: string;
  style?: ViewStyle;
}

const SIZES: Record<IconButtonSize, { container: string; icon: number }> = {
  sm: { container: "w-10 h-10 rounded-14", icon: 18 },
  md: { container: "w-12 h-12 rounded-16", icon: 22 },
};

const IconButton: FC<IconButtonProps> = ({
  icon: Icon,
  onPress,
  size = "md",
  tone = "neutral",
  solid = false,
  disabled = false,
  loading = false,
  accessibilityLabel,
  className,
  style,
}) => {
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);
  const surface = useControlSurface();
  const backgroundColor = tone === "neutral" ? surface : solid ? colors.solid : colors.soft;
  const foreground = solid ? colors.onSolid : colors.onSoft;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`justify-center items-center ${SIZES[size].container} ${disabled ? "opacity-50" : ""} ${className || ""}`}
      style={[{ backgroundColor }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? <ActivityIndicator color={foreground} /> : <Icon size={SIZES[size].icon} color={foreground} />}
    </TouchableOpacity>
  );
};

export default IconButton;
