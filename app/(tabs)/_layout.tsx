import { Tabs } from "expo-router";
import { ChartColumn, CheckCircle, DollarSign, Home, ShoppingBag, User } from "lucide-react-native";
import { View } from "react-native";
import fonts from "@/constants/fonts";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.isDark ? "#FFFFFF" : "#1C1C1E",
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 0,
          height: 90,
          paddingTop: 16,
          paddingBottom: 28,
          paddingHorizontal: 16,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
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
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-12 h-12 rounded-16 justify-center items-center ${
                focused ? (theme.isDark ? "bg-white" : "bg-accent-purple") : ""
              }`}
            >
              <Home size={22} color={focused ? "#1C1C1E" : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t.tabs.tasks,
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-12 h-12 rounded-16 justify-center items-center ${
                focused ? (theme.isDark ? "bg-white" : "bg-accent-purple") : ""
              }`}
            >
              <CheckCircle size={22} color={focused ? "#1C1C1E" : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: t.tabs.shopping,
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-12 h-12 rounded-16 justify-center items-center ${
                focused ? (theme.isDark ? "bg-white" : "bg-accent-purple") : ""
              }`}
            >
              <ShoppingBag size={22} color={focused ? "#1C1C1E" : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: t.tabs.budget,
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-12 h-12 rounded-16 justify-center items-center ${
                focused ? (theme.isDark ? "bg-white" : "bg-accent-purple") : ""
              }`}
            >
              <DollarSign size={22} color={focused ? "#1C1C1E" : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="polls"
        options={{
          title: t.tabs.polls,
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-12 h-12 rounded-16 justify-center items-center ${
                focused ? (theme.isDark ? "bg-white" : "bg-accent-purple") : ""
              }`}
            >
              <ChartColumn size={22} color={focused ? "#1C1C1E" : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-12 h-12 rounded-16 justify-center items-center ${
                focused ? (theme.isDark ? "bg-white" : "bg-accent-purple") : ""
              }`}
            >
              <User size={22} color={focused ? "#1C1C1E" : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
