import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import IconTile from "./icon-tile";
import Text from "./text";
import { getToneColors, type Tone } from "./tone";

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconTone?: Tone;
  /** Replaces the icon tile, for example with an Avatar. */
  left?: ReactNode;
  /** Replaces the chevron that pressable rows show by default. */
  right?: ReactNode;
  selected?: boolean;
  selectedTone?: Tone;
  onPress?: () => void;
  className?: string;
}

const ListItem: FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  iconTone,
  left,
  right,
  selected = false,
  selectedTone = "purple",
  onPress,
  className,
}) => {
  const { theme } = useTheme();
  const selectedColors = getToneColors(theme, selectedTone);
  const containerClassName = `flex-row items-center p-4 rounded-20 gap-3.5 ${className || ""}`;
  const containerStyle = { backgroundColor: selected ? selectedColors.solid : theme.surface };

  const content = (
    <>
      {left ?? (icon && <IconTile icon={icon} tone={iconTone} />)}
      <View className="flex-1">
        <Text variant="subtitle" style={selected ? { color: selectedColors.onSolid } : undefined}>
          {title}
        </Text>
        {subtitle && (
          <Text
            variant="bodySmall"
            color="secondary"
            className="mt-0.5"
            style={selected ? { color: selectedColors.onSolid } : undefined}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (onPress && !selected && <ChevronRight size={20} color={theme.textSecondary} />)}
    </>
  );

  if (!onPress) {
    return (
      <View className={containerClassName} style={containerStyle}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={containerClassName}
      style={containerStyle}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {content}
    </TouchableOpacity>
  );
};

export default ListItem;
