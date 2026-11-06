import type { Tabs } from "expo-router";
import { TabBar } from "glisse";
import { CheckCircle, DollarSign, Home, type LucideIcon, ShoppingBag, User } from "lucide-react-native";
import type { ComponentProps, CSSProperties } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

// Polls and notes are tabs for routing, but they open from the profile menu.
const TAB_ICONS: Record<string, LucideIcon> = {
  home: Home,
  tasks: CheckCircle,
  shopping: ShoppingBag,
  budget: DollarSign,
  profile: User,
};

function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const routes = state.routes.filter((route) => route.name in TAB_ICONS);
  const activeRoute = state.routes[state.index];
  // glisse fixes tabs at 72px, which overflows phones narrower than about 390px.
  const tabWidth = Math.min(72, Math.floor((width - 32 - 8) / routes.length));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + 16,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <TabBar
        value={activeRoute.name in TAB_ICONS ? activeRoute.name : null}
        onValueChange={(name) => navigation.navigate(name)}
        style={
          {
            pointerEvents: "auto",
            "--lg-tab-width": `${tabWidth}px`,
            "--lg-tab-selected": theme.text,
            fontFamily: "Manrope_600SemiBold",
          } as CSSProperties
        }
        items={routes.map((route) => {
          const Icon = TAB_ICONS[route.name];

          return {
            value: route.name,
            label: descriptors[route.key].options.title ?? route.name,
            // currentColor lets the selection tint the icon as it moves between tabs.
            icon: <Icon size={22} color="currentColor" />,
          };
        })}
      />
    </div>
  );
}

export const glassTabBar = (props: BottomTabBarProps) => <GlassTabBar {...props} />;
