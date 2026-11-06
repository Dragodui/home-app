import { ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { useControlSurface } from "./surface";
import Text from "./text";

export interface ChipOption<T> {
  value: T;
  label: string;
}

interface ChipSelectProps<T> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Single-choice row of pills that scrolls horizontally on narrow screens. */
function ChipSelect<T>({ options, value, onChange, className }: ChipSelectProps<T>) {
  const { theme } = useTheme();
  const surface = useControlSurface();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className={className}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <TouchableOpacity
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: isSelected ? theme.text : surface }}
            onPress={() => onChange(option.value)}
          >
            <Text variant="label" style={{ color: isSelected ? theme.background : theme.text }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default ChipSelect;
