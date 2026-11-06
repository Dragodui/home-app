import { Check } from "lucide-react-native";
import type { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { getToneColors, type Tone } from "./tone";

interface CheckboxProps {
  checked: boolean;
  /** Leave out when the whole row is pressable. */
  onPress?: () => void;
  tone?: Tone;
  accessibilityLabel?: string;
}

const Checkbox: FC<CheckboxProps> = ({ checked, onPress, tone = "purple", accessibilityLabel }) => {
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);
  const className = "w-8 h-8 rounded-full border-2 justify-center items-center";
  const style = checked
    ? { backgroundColor: colors.solid, borderColor: colors.solid }
    : { borderColor: theme.textSecondary };
  const mark = checked ? <Check size={16} color={colors.onSolid} strokeWidth={3} /> : null;

  if (!onPress) {
    return (
      <View className={className} style={style}>
        {mark}
      </View>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      className={className}
      style={style}
      hitSlop={8}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {mark}
    </TouchableOpacity>
  );
};

export default Checkbox;
