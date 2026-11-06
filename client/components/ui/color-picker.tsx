import type { FC } from "react";
import { TouchableOpacity, View } from "react-native";

interface ColorPickerProps {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const ColorPicker: FC<ColorPickerProps> = ({ colors, value, onChange, className }) => (
  <View className={`flex-row flex-wrap justify-center gap-2.5 ${className || ""}`}>
    {colors.map((color) => (
      <TouchableOpacity
        key={color}
        accessibilityRole="button"
        accessibilityLabel={color}
        accessibilityState={{ selected: color === value }}
        className={`w-9 h-9 rounded-full ${color === value ? "border-[3px] border-black/30" : ""}`}
        style={{ backgroundColor: color }}
        onPress={() => onChange(color)}
      />
    ))}
  </View>
);

export default ColorPicker;
