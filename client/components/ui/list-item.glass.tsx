import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { GlassSurface } from "./glass-surface.web";
import IconTile from "./icon-tile";
import Text from "./text";
import { getToneColors, type Tone } from "./tone";

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconTone?: Tone;
  left?: ReactNode;
  right?: ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
  singleLine?: boolean;
  selected?: boolean;
  selectedTone?: Tone;
  onPress?: () => void;
  className?: string;
}

/** Web version of ListItem, on glass. Same props as list-item.tsx. */
const ListItem: FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  iconTone,
  left,
  right,
  showChevron,
  disabled = false,
  singleLine = false,
  selected = false,
  selectedTone = "purple",
  onPress,
  className,
}) => {
  const { theme } = useTheme();
  const selectedColors = getToneColors(theme, selectedTone);
  const selectedText = selected ? { color: selectedColors.onSolid } : undefined;

  return (
    <GlassSurface
      fill={selected ? selectedColors.solid : undefined}
      onPress={disabled ? undefined : onPress}
      className={`flex-row ${className || ""}`}
      style={{ alignItems: "center", padding: 16, borderRadius: 20, gap: 14, opacity: disabled ? 0.7 : 1 }}
    >
      {left ?? (icon && <IconTile icon={icon} tone={iconTone} />)}
      <View className="flex-1">
        <Text variant="subtitle" numberOfLines={singleLine ? 1 : undefined} style={selectedText}>
          {title}
        </Text>
        {subtitle && (
          <Text
            variant="bodySmall"
            color="secondary"
            className="mt-0.5"
            numberOfLines={singleLine ? 1 : undefined}
            style={selectedText}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? ((showChevron ?? (!!onPress && !selected)) && <ChevronRight size={20} color={theme.textSecondary} />)}
    </GlassSurface>
  );
};

export default ListItem;
