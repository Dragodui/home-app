import { useRouter } from "expo-router";
import { ArrowRight, BarChart2, Bell, Home as HomeIcon, Zap } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { HomeSkeleton } from "@/components/skeletons";
import {
  Button,
  Card,
  EmptyState,
  ListItem,
  ResponsiveGrid,
  Screen,
  TabHeader,
  TabScreen,
  Text,
} from "@/components/ui";
import { billApi, notificationApi, pollApi, taskApi } from "@/lib/api";
import { formatCurrencyAmount, getHomeCurrency } from "@/lib/currency";
import type { Poll, TaskAssignment } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { home, rooms, isLoading: homeLoading } = useHome();
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const homeCurrency = getHomeCurrency(home);

  const [nextAssignment, setNextAssignment] = useState<TaskAssignment | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.home.goodMorning;
    if (hour < 18) return t.home.goodAfternoon;
    return t.home.goodEvening;
  };

  const loadDashboardData = useCallback(
    async (isRefresh = false) => {
      if (!home || !user) {
        if (!homeLoading) {
          setIsLoading(false);
        }
        return;
      }

      if (!isRefresh) {
        setIsLoading(true);
      }

      try {
        const [assignmentData, tasksData, pollsData, billsData, userNotifs, homeNotifs] = await Promise.all([
          taskApi.getClosestAssignment(home.id, user.id).catch(() => null),
          taskApi.getByHomeId(home.id).catch(() => []),
          pollApi.getByHomeId(home.id).catch(() => []),
          billApi.getByHomeId(home.id).catch(() => []),
          notificationApi.getUserNotifications(home.id).catch(() => []),
          notificationApi.getHomeNotifications(home.id).catch(() => []),
        ]);

        const taskIds = new Set((tasksData || []).map((task) => task.id));
        const validAssignment = assignmentData && taskIds.has(assignmentData.taskId) ? assignmentData : null;
        setNextAssignment(validAssignment);
        setPolls(pollsData.filter((p) => p.status === "open") || []);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const total = (billsData || []).reduce((sum, bill) => {
          const billDate = new Date(bill.createdAt);
          if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
            return sum + bill.totalAmount;
          }
          return sum;
        }, 0);
        setMonthlySpend(total);

        const allNotifs = [...(userNotifs || []), ...(homeNotifs || [])];
        setUnreadCount(allNotifs.filter((n) => !n.read).length);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [home, user, homeLoading],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    loadDashboardData(false);
  }, [authLoading, isAuthenticated, loadDashboardData, router]);

  useRealtimeRefresh(["TASK", "POLL", "BILL", "BILL_CATEGORY", "NOTIFICATION", "HOME_NOTIFICATION"], () =>
    loadDashboardData(true),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    setRefreshing(false);
  };

  if (authLoading || homeLoading || isLoading) {
    return <HomeSkeleton />;
  }

  // No home state
  if (!home) {
    return (
      <Screen>
        <EmptyState
          icon={HomeIcon}
          tone="yellow"
          size="lg"
          title={t.home.noHome}
          description={t.home.noHomeDescription}
          action={<Button title={t.auth.getStarted} onPress={() => router.push("/(tabs)/profile")} />}
        />
      </Screen>
    );
  }

  const formatTaskTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString(language, {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });

    if (date.toDateString() === today.toDateString()) {
      return `${t.common.today}, ${timeStr}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `${t.common.tomorrow}, ${timeStr}`;
    }
    return date.toLocaleDateString(language, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const heroTitle = nextAssignment ? nextAssignment.task?.name || t.home.currentTask : t.home.allCaughtUp;
  const heroCaption = !nextAssignment
    ? t.home.noPendingTasks
    : nextAssignment.task?.dueDate
      ? formatTaskTime(nextAssignment.task.dueDate)
      : t.tasks.noDueDate;

  return (
    <TabScreen refreshing={refreshing} onRefresh={onRefresh}>
      <TabHeader eyebrow={getGreeting()} title={user?.name?.split(" ")[0] || "there"} />
      {/* <View className="flex-row items-center gap-3" style={{ marginRight: 64 }}>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
            className="w-12 h-12 rounded-full justify-center items-center"
            style={{ backgroundColor: theme.surface }}
          >
            <Bell size={22} color={theme.text} />
            {unreadCount > 0 && (
              <View
                className="absolute -top-1 -right-1 min-w-5 min-h-5 rounded-full justify-center items-center px-1"
                style={{ backgroundColor: theme.accent.pink }}
              >
                <Text className="text-[11px] font-manrope-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity> */}
      {/* </View> */}

      <ResponsiveGrid>
        <View>
          {/* Hero Card - Up Next Task */}
          <Card variant="yellow" padding={28} onPress={() => router.push("/(tabs)/tasks")} className="mb-4">
            <View className="flex-row justify-between items-start mb-4">
              <Text variant="overline" color="onAccent" className="opacity-40">
                {t.home.upNext}
              </Text>
              <View className="w-12 h-12 rounded-24 bg-black/[0.08] justify-center items-center">
                <Zap size={24} color={theme.onAccent} fill={theme.onAccent} />
              </View>
            </View>
            <Text variant="title" color="onAccent" className="font-manrope-extrabold mb-6">
              {heroTitle}
            </Text>
            <View className="flex-row justify-between items-center gap-3">
              <View className="bg-black/[0.08] px-4 py-3 rounded-14 shrink">
                <Text variant="label" color="onAccent">
                  {heroCaption}
                </Text>
              </View>
              <ArrowRight size={24} color={theme.onAccent} />
            </View>
          </Card>

          <ListItem
            icon={Zap}
            iconTone="cyan"
            title={t.smartHome.title}
            subtitle={t.smartHome.manageDevices}
            right={<ArrowRight size={20} color={theme.text} />}
            onPress={() => router.push("/smarthome")}
            className="mb-4"
          />
        </View>

        <View>
          {/* Grid Cards */}
          <View className="flex-row gap-3 mb-4">
            <Card
              size="md"
              borderRadius={28}
              onPress={() => router.push("/rooms")}
              style={{ flex: 1, height: 180, justifyContent: "space-between" }}
            >
              <View
                className="w-11 h-11 rounded-22 border-2 justify-center items-center"
                style={{ borderColor: theme.borderLight }}
              >
                <HomeIcon size={22} color={theme.text} />
              </View>
              <View className="flex-1 justify-end">
                <Text variant="heading">{t.home.myRooms}</Text>
                <Text variant="bodySmall" color="secondary" className="mt-1">
                  {interpolate(t.home.spaces, { count: rooms.length })}
                </Text>
              </View>
            </Card>

            <Card
              variant="purple"
              size="md"
              borderRadius={28}
              onPress={() => router.push("/(tabs)/polls")}
              style={{ flex: 1, height: 180, justifyContent: "space-between" }}
            >
              <View className="w-11 h-11 rounded-22 border-2 border-black/10 justify-center items-center">
                <BarChart2 size={22} color={theme.onAccent} />
              </View>
              <View className="flex-1 justify-end">
                <Text variant="heading" color="onAccent">
                  {t.home.activePolls}
                </Text>
                <Text variant="bodySmall" color="onAccent" className="mt-1 opacity-50">
                  {interpolate(t.home.pending, { count: polls.length })}
                </Text>
              </View>
            </Card>
          </View>

          <Card
            variant="white"
            padding={28}
            onPress={() => router.push("/(tabs)/budget")}
            className="mb-6"
            // Stays white in dark mode; in light mode a plain white card washes
            // out against the background, so it's nudged to the surface tone.
            style={theme.isDark ? undefined : { backgroundColor: theme.surface }}
          >
            <Text variant="overline" className="mb-2">
              {t.home.monthlySpend}
            </Text>
            <Text variant="hero" color="onAccent" className="mb-5" numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrencyAmount(monthlySpend, homeCurrency, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
            <View className="flex-row justify-between items-center">
              <View className="bg-accent-pink/15 px-4 py-3 rounded-14">
                <Text variant="caption" className="font-manrope-bold" style={{ color: theme.accent.pink }}>
                  {t.home.totalExpenses}
                </Text>
              </View>
              <ArrowRight size={24} color={theme.onAccent} />
            </View>
          </Card>
        </View>
      </ResponsiveGrid>
    </TabScreen>
  );
}
