import type { LucideIcon } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";
import { getToneColors, type Tone } from "./tone";

type EmptyStateSize = "md" | "lg";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Text or nested Text nodes. */
  description?: ReactNode;
  action?: ReactNode;
  tone?: Tone;
  size?: EmptyStateSize;
  className?: string;
}

const SIZES: Record<EmptyStateSize, { circle: number; icon: number; margin: string }> = {
  md: { circle: 64, icon: 32, margin: "mb-4" },
  lg: { circle: 120, icon: 64, margin: "mb-8" },
};

const EmptyState: FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  size = "md",
  className,
}) => {
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);
  const iconColor = tone === "neutral" ? theme.textSecondary : colors.onSoft;
  const isLarge = size === "lg";

  return (
    <View className={`flex-1 justify-center items-center py-20 px-6 ${className || ""}`}>
      <View
        className={`rounded-full justify-center items-center ${SIZES[size].margin}`}
        style={{ width: SIZES[size].circle, height: SIZES[size].circle, backgroundColor: colors.soft }}
      >
        <Icon size={SIZES[size].icon} color={iconColor} />
      </View>
      <Text variant={isLarge ? "title" : "heading"} className="text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text variant={isLarge ? "body" : "bodySmall"} color="secondary" className="text-center">
          {description}
        </Text>
      )}
      {action && <View className="w-full mt-6">{action}</View>}
    </View>
  );
};

export default EmptyState;
