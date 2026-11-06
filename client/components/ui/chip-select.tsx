import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { useControlSurface } from "./surface";
import Text from "./text";

export interface ChipOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Small colored dot before the label. */
  dotColor?: string;
}

function Chip({
  label,
  icon: Icon,
  dotColor,
  selected,
  onPress,
  onLongPress,
}: {
  label: string;
  icon?: LucideIcon;
  dotColor?: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
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
}

function ChipRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className={className}
      // A horizontal ScrollView otherwise grows vertically inside a flex column.
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 8 }}
    >
      {children}
    </ScrollView>
  );
}

interface ChipSelectProps<T> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  onLongPress?: (value: T) => void;
  /** Shown after the options, for example an add button. */
  trailing?: ReactNode;
  className?: string;
}

/** Single-choice row of pills that scrolls horizontally on narrow screens. */
export function ChipSelect<T>({ options, value, onChange, onLongPress, trailing, className }: ChipSelectProps<T>) {
  return (
    <ChipRow className={className}>
      {options.map((option) => (
        <Chip
          key={String(option.value)}
          label={option.label}
          icon={option.icon}
          dotColor={option.dotColor}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          onLongPress={onLongPress ? () => onLongPress(option.value) : undefined}
        />
      ))}
      {trailing}
    </ChipRow>
  );
}

interface ChipMultiSelectProps<T> {
  options: readonly ChipOption<T>[];
  values: readonly T[];
  onChange: (values: T[]) => void;
  className?: string;
}

/** Multiple-choice version of ChipSelect. */
export function ChipMultiSelect<T>({ options, values, onChange, className }: ChipMultiSelectProps<T>) {
  return (
    <ChipRow className={className}>
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <Chip
            key={String(option.value)}
            label={option.label}
            icon={option.icon}
            selected={selected}
            onPress={() =>
              onChange(selected ? values.filter((value) => value !== option.value) : [...values, option.value])
            }
          />
        );
      })}
    </ChipRow>
  );
}
