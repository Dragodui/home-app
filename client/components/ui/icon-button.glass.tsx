import { Button as GlassButton } from "glisse";
import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { ActivityIndicator, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { getToneColors, type Tone } from "./tone";

type IconButtonSize = "sm" | "md";

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  size?: IconButtonSize;
  tone?: Tone;
  solid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  className?: string;
  style?: ViewStyle;
}

const SIZES: Record<IconButtonSize, { box: number; icon: number }> = {
  sm: { box: 40, icon: 18 },
  md: { box: 48, icon: 22 },
};

/** Web version of IconButton, on Liquid Glass. Same props as icon-button.tsx. */
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
  const isFilled = solid && tone !== "neutral";
  const foreground = isFilled ? colors.onSolid : tone === "neutral" ? theme.text : colors.onSoft;
  // Callers pass a background for the opaque design. The glass supplies its own.
  const { backgroundColor: _ignored, ...layoutStyle } = style ?? {};
  const { box, icon } = SIZES[size];

  return (
    <GlassButton
      variant={isFilled ? "filled" : "glass"}
      tint={isFilled ? colors.solid : undefined}
      aria-label={accessibilityLabel}
      className={className}
      disabled={disabled || loading}
      onClick={onPress}
      icon={loading ? <ActivityIndicator color={foreground} /> : <Icon size={icon} color={foreground} />}
      style={{ width: box, height: box, borderRadius: box / 2, flex: "none", ...(layoutStyle as object) }}
    />
  );
};

export default IconButton;
