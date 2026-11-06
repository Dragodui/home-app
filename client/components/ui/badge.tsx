import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { toDisplayColor } from "@/constants/glass-theme";
import { useTheme } from "@/stores/themeStore";
import { useControlSurface } from "./surface";
import Text from "./text";
import { getSoftColors, getToneColors, type Tone } from "./tone";

interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Any color, for example one chosen by a user. Takes priority over tone. */
  color?: string;
  icon?: LucideIcon;
  className?: string;
}

const Badge: FC<BadgeProps> = ({ label, tone = "neutral", color, icon: Icon, className }) => {
  const { theme } = useTheme();
  const surface = useControlSurface();
  const colors = color ? getSoftColors(theme, toDisplayColor(color, theme)) : getToneColors(theme, tone);
  const backgroundColor = !color && tone === "neutral" ? surface : colors.soft;

  return (
    <View
      className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${className || ""}`}
      style={{ backgroundColor }}
    >
      {Icon && <Icon size={12} color={colors.onSoft} />}
      <Text variant="caption" className="font-manrope-semibold" style={{ color: colors.onSoft }}>
        {label}
      </Text>
    </View>
  );
};

export default Badge;
