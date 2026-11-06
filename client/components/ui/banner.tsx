import type { LucideIcon } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";
import { getToneColors, type Tone } from "./tone";

interface BannerProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: Tone;
  /** Shown on the right, for example an IconButton. */
  action?: ReactNode;
  className?: string;
}

const Banner: FC<BannerProps> = ({ icon: Icon, title, description, tone = "neutral", action, className }) => {
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);

  return (
    <View
      className={`flex-row items-center gap-3 p-4 rounded-20 ${className || ""}`}
      style={{ backgroundColor: colors.soft }}
    >
      <Icon size={20} color={colors.onSoft} />
      <View className="flex-1">
        <Text variant="label" className="font-manrope-bold" style={{ color: colors.onSoft }}>
          {title}
        </Text>
        {description && (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
      {action}
    </View>
  );
};

export default Banner;
