import { Children, type FC, type ReactNode } from "react";
import { View } from "react-native";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
}

/** One column on mobile, two columns on desktop. */
const ResponsiveGrid: FC<ResponsiveGridProps> = ({ children, className }) => {
  const { isDesktop } = useResponsiveLayout();

  return (
    <View className={`gap-3 ${isDesktop ? "flex-row flex-wrap justify-between" : ""} ${className || ""}`}>
      {Children.map(Children.toArray(children), (child) => (
        <View style={{ width: isDesktop ? "49%" : "100%" }}>{child}</View>
      ))}
    </View>
  );
};

export default ResponsiveGrid;
