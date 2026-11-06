import type { LucideIcon } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { useControlSurface } from "./surface";

export interface IconOption<T extends string> {
  value: T;
  icon: LucideIcon;
}

interface IconPickerProps<T extends string> {
  options: readonly IconOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Fill of the selected option. Defaults to the purple accent. */
  selectedColor?: string;
  className?: string;
}

function IconPicker<T extends string>({ options, value, onChange, selectedColor, className }: IconPickerProps<T>) {
  const { theme } = useTheme();
  const surface = useControlSurface();

  return (
    <View className={`flex-row flex-wrap justify-center gap-2.5 ${className || ""}`}>
      {options.map(({ value: optionValue, icon: Icon }) => {
        const isSelected = optionValue === value;

        return (
          <TouchableOpacity
            key={optionValue}
            accessibilityRole="button"
            accessibilityLabel={optionValue}
            accessibilityState={{ selected: isSelected }}
            className="w-12 h-12 rounded-full justify-center items-center"
            style={{ backgroundColor: isSelected ? (selectedColor ?? theme.accent.purple) : surface }}
            onPress={() => onChange(optionValue)}
          >
            <Icon size={20} color={isSelected ? theme.onAccent : theme.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default IconPicker;
