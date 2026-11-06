import type { ComponentProps, FC } from "react";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import Screen from "./screen";

type TabScreenProps = Omit<ComponentProps<typeof Screen>, "bottomPadding" | "keyboardAvoiding">;

/** Screen for the bottom tabs: keeps the content clear of the floating tab bar. */
const TabScreen: FC<TabScreenProps> = (props) => {
  const { isDesktop } = useResponsiveLayout();

  // An overlay is a Fab in practice, so keep the last row of content reachable above it.
  const bottomPadding = isDesktop ? 48 : props.overlay ? 192 : 120;

  return <Screen {...props} bottomPadding={bottomPadding} />;
};

export default TabScreen;
