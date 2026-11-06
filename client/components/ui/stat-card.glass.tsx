import type { FC } from "react";
import { GlassSurface } from "./glass-surface.web";
import Text from "./text";

interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
  className?: string;
}

/** Web version of StatCard, on glass. Same props as stat-card.tsx. */
const StatCard: FC<StatCardProps> = ({ label, value, valueColor, className }) => (
  <GlassSurface className={className} style={{ flex: 1, padding: 16, borderRadius: 20 }}>
    <Text variant="caption" color="secondary" className="font-manrope-bold uppercase" numberOfLines={2}>
      {label}
    </Text>
    <Text variant="title" className="mt-1" style={valueColor ? { color: valueColor } : undefined}>
      {value}
    </Text>
  </GlassSurface>
);

export default StatCard;
