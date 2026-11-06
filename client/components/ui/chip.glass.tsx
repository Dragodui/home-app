import { Button as GlassButton } from "glisse";
import type { FC } from "react";
import { toDisplayColor } from "@/constants/glass-theme";
import { useTheme } from "@/stores/themeStore";
import type { ChipProps } from "./chip.classic";
import { useWebPress } from "./glass-surface.web";

/** Web version of Chip, on Liquid Glass. Same props as chip.tsx. */
const Chip: FC<ChipProps> = ({ label, icon: Icon, dotColor, selected, onPress, onLongPress }) => {
  const { theme } = useTheme();
  const { handlers } = useWebPress(undefined, onLongPress);
  const color = selected ? theme.background : theme.text;

  return (
    <GlassButton
      variant={selected ? "filled" : "glass"}
      tint={selected ? theme.text : undefined}
      aria-pressed={selected}
      {...handlers}
      onClick={onPress}
      icon={Icon ? <Icon size={14} color={color} /> : undefined}
      style={{
        height: 38,
        padding: "0 14px",
        borderRadius: 19,
        flex: "none",
        color,
        fontFamily: "Manrope_600SemiBold",
        fontSize: 14,
      }}
    >
      {dotColor && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: selected ? theme.background : toDisplayColor(dotColor, theme),
          }}
        />
      )}
      {label}
    </GlassButton>
  );
};

export default Chip;
