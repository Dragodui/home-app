import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import Chip from "./chip";

export interface ChipOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Small colored dot before the label. */
  dotColor?: string;
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
