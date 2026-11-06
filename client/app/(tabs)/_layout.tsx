import { Tabs } from "expo-router";
import { CheckCircle, DollarSign, Home, type LucideIcon, ShoppingBag, User } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { glassTabBar } from "@/components/glass-tab-bar";
import ProfileDropdown from "@/components/ProfileDropdown";
import fonts from "@/constants/fonts";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

function TabIcon({ icon: Icon, color, focused }: { icon: LucideIcon; color: string; focused: boolean }) {
  const { theme } = useTheme();

  return (
    <View
      className={`w-12 h-12 rounded-16 justify-center items-center ${
        focused ? (theme.isDark ? "bg-white" : "bg-accent-purple") : ""
      }`}
    >
      <Icon size={25} color={focused ? theme.onAccent : color} strokeWidth={focused ? 2.5 : 2} />
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isDesktop } = useResponsiveLayout();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <Tabs
        tabBar={theme.uiStyle === "glass" ? glassTabBar : undefined}
        screenOptions={{
          tabBarActiveTintColor: theme.text,
          tabBarInactiveTintColor: theme.textSecondary,
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopWidth: 0,
            height: isDesktop ? 84 : 90,
            paddingTop: isDesktop ? 12 : 16,
            paddingBottom: isDesktop ? 16 : 28,
            paddingHorizontal: 16,
            position: "absolute",
            bottom: isDesktop ? 20 : 0,
            left: isDesktop ? undefined : 0,
            right: isDesktop ? undefined : 0,
            alignSelf: isDesktop ? "center" : undefined,
            width: isDesktop ? 520 : undefined,
            borderRadius: isDesktop ? 28 : 0,
            elevation: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: fonts[600],
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t.tabs.home,
            tabBarIcon: ({ color, focused }) => <TabIcon icon={Home} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: t.tabs.tasks,
            tabBarIcon: ({ color, focused }) => <TabIcon icon={CheckCircle} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            title: t.tabs.shopping,
            tabBarIcon: ({ color, focused }) => <TabIcon icon={ShoppingBag} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: t.tabs.budget,
            tabBarIcon: ({ color, focused }) => <TabIcon icon={DollarSign} color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen name="polls" options={{ href: null, title: t.tabs.polls }} />
        <Tabs.Screen name="notes" options={{ href: null, title: t.tabs.notes }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.tabs.profile,
            tabBarIcon: ({ color, focused }) => <TabIcon icon={User} color={color} focused={focused} />,
          }}
        />
      </Tabs>
      <View pointerEvents="box-none" className="absolute right-6 z-50" style={{ top: insets.top + 36 }}>
        <ProfileDropdown />
      </View>
    </View>
  );
}
