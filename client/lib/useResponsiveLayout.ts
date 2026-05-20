import { Platform, useWindowDimensions } from "react-native";

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isTablet = width >= 768;
  const isDesktop = isWeb && width >= 1180;
  const horizontalPadding = isDesktop ? 32 : 20;

  return {
    width,
    isWeb,
    isTablet,
    isDesktop,
    horizontalPadding,
    contentMaxWidth: isDesktop ? 1240 : 960,
  };
}
