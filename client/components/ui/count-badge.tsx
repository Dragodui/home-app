import type { FC } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";

interface CountBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

/** Unread-style counter. Renders nothing at zero. */
const CountBadge: FC<CountBadgeProps> = ({ count, max = 99, className }) => {
  const { theme } = useTheme();

  if (count <= 0) return null;

  return (
    <View
      className={`min-w-5 h-5 rounded-full justify-center items-center px-1.5 ${className || ""}`}
      style={{ backgroundColor: theme.accent.pink }}
    >
      <Text variant="micro" color="onAccent" className="font-manrope-bold">
        {count > max ? `${max}+` : count}
      </Text>
    </View>
  );
};

export default CountBadge;
