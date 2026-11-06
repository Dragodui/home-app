import { Children, type FC, type ReactNode } from "react";
import { View } from "react-native";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";

type Columns = 1 | 2 | 3 | 4;

interface ResponsiveGridProps {
  children: ReactNode;
  mobileColumns?: 1 | 2;
  desktopColumns?: Columns;
  className?: string;
}

// Percentages leave room for the gap, because Yoga has no calc().
const MOBILE_WIDTHS = { 1: "100%", 2: "47%" } as const;
const DESKTOP_WIDTHS = { 1: "100%", 2: "49%", 3: "31.9%", 4: "23.8%" } as const;

const ResponsiveGrid: FC<ResponsiveGridProps> = ({ children, mobileColumns = 1, desktopColumns = 2, className }) => {
  const { isDesktop } = useResponsiveLayout();
  const columns = isDesktop ? desktopColumns : mobileColumns;
  const width = isDesktop ? DESKTOP_WIDTHS[desktopColumns] : MOBILE_WIDTHS[mobileColumns];

  return (
    <View
      className={`${columns > 1 ? "flex-row flex-wrap" : ""} ${columns === 2 ? "justify-between" : ""} gap-3 ${className || ""}`}
    >
      {Children.map(Children.toArray(children), (child) => (
        <View style={{ width }}>{child}</View>
      ))}
    </View>
  );
};

export default ResponsiveGrid;
