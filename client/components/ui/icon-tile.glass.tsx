import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { useTheme } from "@/stores/themeStore";
import { GlassSurface } from "./glass-surface.web";
import type { Tone } from "./tone";

type IconTileSize = "md" | "lg";

interface IconTileProps {
  icon: LucideIcon;
  tone?: Tone;
  color?: string;
  size?: IconTileSize;
  className?: string;
}

const SIZES: Record<IconTileSize, { box: number; radius: number; icon: number }> = {
  md: { box: 44, radius: 14, icon: 20 },
  lg: { box: 80, radius: 24, icon: 40 },
};

/** Web version of IconTile: glass with a plain icon, never a colored or gray block. Same props as icon-tile.tsx. */
const IconTile: FC<IconTileProps> = ({ icon: Icon, size = "md", className }) => {
  const { theme } = useTheme();
  const { box, radius, icon } = SIZES[size];

  return (
    <GlassSurface
      className={className}
      style={{ width: box, height: box, borderRadius: radius, alignItems: "center", justifyContent: "center" }}
    >
      <Icon size={icon} color={theme.text} />
    </GlassSurface>
  );
};

export default IconTile;
