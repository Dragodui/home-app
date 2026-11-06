import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { useControlSurface } from "./surface";
import Text from "./text";

export interface ChipProps {
  label: string;
  icon?: LucideIcon;
  /** Small colored dot before the label. */
  dotColor?: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const Chip: FC<ChipProps> = ({ label, icon: Icon, dotColor, selected, onPress, onLongPress }) => {
  const { theme } = useTheme();
  const surface = useControlSurface();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-full"
      style={{ backgroundColor: selected ? theme.text : surface }}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {dotColor && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />}
      {Icon && <Icon size={14} color={selected ? theme.background : theme.textSecondary} />}
      <Text variant="label" style={{ color: selected ? theme.background : theme.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default Chip;
