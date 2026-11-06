import { type FC, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import DatePicker from "./date-picker";
import { useControlSurface } from "./surface";
import Text from "./text";

interface DateTimeFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder: string;
  mode?: "date" | "datetime";
  minimumDate?: Date;
  className?: string;
}

const DateTimeField: FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  mode = "datetime",
  minimumDate,
  className,
}) => {
  const { theme } = useTheme();
  const surface = useControlSurface();
  const [pickerVisible, setPickerVisible] = useState(false);

  const formattedValue = value?.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(mode === "datetime" ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

  return (
    <View className={`gap-2 mb-4 ${className || ""}`}>
      {label && (
        <Text variant="overline" className="ml-1">
          {label}
        </Text>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        className="h-16 rounded-20 px-6 justify-center"
        style={{ backgroundColor: surface }}
        onPress={() => setPickerVisible(true)}
      >
        <Text
          variant="body"
          className="font-manrope-medium"
          style={{ color: value ? theme.text : theme.inputPlaceholder }}
        >
          {formattedValue ?? placeholder}
        </Text>
      </TouchableOpacity>
      <DatePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={(date) => {
          onChange(date);
          setPickerVisible(false);
        }}
        value={value ?? undefined}
        mode={mode}
        minimumDate={minimumDate}
        title={placeholder}
      />
    </View>
  );
};

export default DateTimeField;
