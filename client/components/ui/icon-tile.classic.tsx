import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { toDisplayColor } from "@/constants/glass-theme";
import { useTheme } from "@/stores/themeStore";
import { getToneColors, type Tone } from "./tone";

type IconTileSize = "md" | "lg";

interface IconTileProps {
  icon: LucideIcon;
  tone?: Tone;
  /** Any fill color, for example one chosen by a user. Takes priority over tone. */
  color?: string;
  size?: IconTileSize;
  className?: string;
}

const SIZES: Record<IconTileSize, { container: string; icon: number }> = {
  md: { container: "w-11 h-11 rounded-14", icon: 20 },
  lg: { container: "w-20 h-20 rounded-3xl", icon: 40 },
};

const IconTile: FC<IconTileProps> = ({ icon: Icon, tone = "purple", color, size = "md", className }) => {
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);

  return (
    <View
      className={`justify-center items-center ${SIZES[size].container} ${className || ""}`}
      style={{ backgroundColor: color ? toDisplayColor(color, theme) : colors.solid }}
    >
      <Icon size={SIZES[size].icon} color={color ? theme.onFill : colors.onSolid} />
    </View>
  );
};

export default IconTile;
