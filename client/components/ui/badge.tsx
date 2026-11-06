import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";
import { getToneColors, type Tone } from "./tone";

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}

const Badge: FC<BadgeProps> = ({ label, tone = "neutral", icon: Icon, className }) => {
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);

  return (
    <View
      className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${className || ""}`}
      style={{ backgroundColor: colors.soft }}
    >
      {Icon && <Icon size={12} color={colors.onSoft} />}
      <Text variant="caption" className="font-manrope-semibold" style={{ color: colors.onSoft }}>
        {label}
      </Text>
    </View>
  );
};

export default Badge;
