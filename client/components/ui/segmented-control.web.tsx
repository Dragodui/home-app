import { SegmentedControl as GlassSegmentedControl } from "glisse";
import type { LucideIcon } from "lucide-react-native";
import { type CSSProperties, useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import type { Tone } from "./tone";

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

/** Web version of SegmentedControl, on Liquid Glass. Same props as segmented-control.tsx. */
function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);

  return (
    // glisse sizes segments in fixed pixels, so measure the row to make them fill it on any phone.
    <View className={className} style={{ height: 44 }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <GlassSegmentedControl
          value={value}
          onValueChange={(next) => onChange(next as T)}
          style={
            {
              "--lg-tab-width": `${width / options.length}px`,
              "--lg-tab-height": "44px",
              fontFamily: "Manrope_600SemiBold",
              fontSize: 13,
            } as CSSProperties
          }
          items={options.map(({ value: optionValue, label, icon: Icon }) => ({
            value: optionValue,
            label: (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                {Icon && <Icon size={16} color={theme.text} />}
                {label}
              </span>
            ),
          }))}
        />
      )}
    </View>
  );
}

export default SegmentedControl;
