import type { LucideIcon } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";
import { getToneColors, type Tone } from "./tone";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  activeTone?: Tone;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <View className={`flex-row gap-3 ${className || ""}`}>
      {options.map(({ value: optionValue, label, icon: Icon, activeTone = "purple" }) => {
        const isActive = optionValue === value;
        const activeColors = getToneColors(theme, activeTone);
        const foreground = isActive ? activeColors.onSolid : theme.textSecondary;

        return (
          <TouchableOpacity
            key={optionValue}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-14"
            style={{ backgroundColor: isActive ? activeColors.solid : theme.background }}
            onPress={() => onChange(optionValue)}
          >
            {Icon && <Icon size={20} color={foreground} />}
            <Text variant="label" style={{ color: foreground }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default SegmentedControl;
