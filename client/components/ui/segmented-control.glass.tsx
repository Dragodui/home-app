import { SegmentedControl as GlassSegmentedControl } from "glisse";
import type { LucideIcon } from "lucide-react-native";
import { type CSSProperties, useState } from "react";
import { View, type ViewStyle } from "react-native";
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

const INLINE_ICON_STYLE = { display: "inline-block", verticalAlign: "-3px", marginRight: 6 } as unknown as ViewStyle;

// glisse colors the resting label with --lg-segment-label and applies --lg-tab-selected only inside its lens. The
// thumb here is inverted, so the selected label has to invert too, or it is white on white.
const SELECTED_LABEL_STYLE = document.createElement("style");
SELECTED_LABEL_STYLE.textContent = ".lg-segmented .lg-tab[data-selected] { color: var(--lg-tab-selected); }";
document.head.appendChild(SELECTED_LABEL_STYLE);

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
              "--lg-tab-selected": theme.background,
              fontFamily: "Manrope_600SemiBold",
              fontSize: 13,
            } as CSSProperties
          }
          items={options.map(({ value: optionValue, label, icon: Icon }) => ({
            value: optionValue,
            // glisse trims .lg-tab-text to the text's height and centers that, so the label must stay
            // inline. A flex wrapper overflows the trimmed box upward and floats above the middle.
            label: Icon ? (
              <>
                <Icon size={16} color="currentColor" style={INLINE_ICON_STYLE} />
                {label}
              </>
            ) : (
              label
            ),
          }))}
        />
      )}
    </View>
  );
}

export default SegmentedControl;
