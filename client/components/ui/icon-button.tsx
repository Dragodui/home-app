import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { TouchableOpacity, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { getToneColors, type Tone } from "./tone";

type IconButtonSize = "sm" | "md";

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  size?: IconButtonSize;
  tone?: Tone;
  disabled?: boolean;
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
  disabled = false,
  accessibilityLabel,
  className,
  style,
}) => {
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`justify-center items-center ${SIZES[size].container} ${disabled ? "opacity-50" : ""} ${className || ""}`}
      style={[{ backgroundColor: colors.soft }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Icon size={SIZES[size].icon} color={colors.onSoft} />
    </TouchableOpacity>
  );
};

export default IconButton;
