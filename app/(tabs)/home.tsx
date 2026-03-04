import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Zap,
  ArrowRight,
  Home as HomeIcon,
  BarChart2,
  User,
  Bell,
} from "lucide-react-native";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useTheme } from "@/stores/themeStore";
import { useI18n, interpolate } from "@/stores/i18nStore";
import { taskApi, pollApi, billApi, notificationApi } from "@/lib/api";
import { TaskAssignment, Poll } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import Card from "@/components/ui/card";
import { HomeSkeleton } from "@/components/skeletons";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { home, rooms, isLoading: homeLoading } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();

  const [nextAssignment, setNextAssignment] = useState<TaskAssignment | null>(
    null
  );
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


  const loadDashboardData = useCallback(async (isRefresh = false) => {
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
      const [assignmentData, pollsData, billsData, userNotifs, homeNotifs] = await Promise.all([
        taskApi.getClosestAssignment(home.id, user.id).catch(() => null),
        pollApi.getByHomeId(home.id).catch(() => []),
        billApi.getByHomeId(home.id).catch(() => []),
        notificationApi.getUserNotifications().catch(() => []),
        notificationApi.getHomeNotifications(home.id).catch(() => []),
      ]);

      setNextAssignment(assignmentData);
      setPolls(pollsData.filter((p) => p.status === "open") || []);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const total = (billsData || []).reduce((sum, bill) => {
        const billDate = new Date(bill.createdAt);
        if (
          billDate.getMonth() === currentMonth &&
          billDate.getFullYear() === currentYear
        ) {
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
  }, [home, user, homeLoading]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    loadDashboardData(false);
  }, [authLoading, isAuthenticated, home, user, loadDashboardData, router]);

  useRealtimeRefresh(["TASK", "POLL", "BILL", "BILL_CATEGORY", "NOTIFICATION", "HOME_NOTIFICATION"], () => loadDashboardData(true));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    setRefreshing(false);
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    loadDashboardData();
  }, [authLoading, isAuthenticated, home, user, loadDashboardData, router]);

  useRealtimeRefresh(["TASK", "POLL", "BILL", "BILL_CATEGORY", "NOTIFICATION", "HOME_NOTIFICATION"], loadDashboardData);

  if (authLoading || homeLoading || isLoading) {
    return <HomeSkeleton />;
  }

  // No home state
  if (!home) {
    return (
      <View
        className="flex-1 justify-center items-center p-10"
        style={{ backgroundColor: theme.background, paddingTop: insets.top + 40 }}
      >
        <View className="w-24 h-24 rounded-48 justify-center items-center mb-6 bg-accent-yellow">
          <HomeIcon size={48} color="#1C1C1E" />
        </View>
        <Text
          className="text-2xl font-manrope-bold mb-3"
          style={{ color: theme.text }}
        >
          {t.home.noHome}
        </Text>
        <Text
          className="text-base font-manrope text-center mb-8 leading-6"
          style={{ color: theme.textSecondary }}
        >
          {t.home.noHomeDescription}
        </Text>
        <TouchableOpacity
          className="px-10 py-4.5 rounded-20"
          style={{ backgroundColor: theme.text }}
          onPress={() => router.push("/(tabs)/profile")}
          activeOpacity={0.8}
        >
          <Text
            className="text-base font-manrope-bold"
            style={{ color: theme.background }}
          >
            {t.auth.getStarted}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTaskTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    if (date.toDateString() === today.toDateString()) {
      return `${t.common.today}, ${timeStr}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `${t.common.tomorrow}, ${timeStr}`;
    }
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: insets.top + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-1">
            <Text
              className="text-lg font-manrope italic mb-1"
              style={{ color: theme.textSecondary }}
            >
              {getGreeting()}
            </Text>
            <Text
              className="text-4xl font-manrope-bold"
              style={{ color: theme.text }}
            >
              {user?.name?.split(" ")[0] || "there"}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              activeOpacity={0.7}
              className="w-12 h-12 rounded-24 justify-center items-center"
              style={{ backgroundColor: theme.surface }}
            >
              <Bell size={22} color={theme.text} />
              {unreadCount > 0 && (
                <View
                  className="absolute -top-1 -right-1 min-w-5 h-5 rounded-10 justify-center items-center px-1"
                  style={{ backgroundColor: theme.accent.pink }}
                >
                  <Text className="text-[11px] font-manrope-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <View
                className="w-14 h-14 rounded-28 border-2 overflow-hidden justify-center items-center"
                style={{ borderColor: theme.accent.purple }}
              >
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} className="w-full h-full" />
                ) : (
                  <View
                    className="w-full h-full justify-center items-center"
                    style={{ backgroundColor: theme.surface }}
                  >
                    <User size={28} color={theme.textSecondary} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Card - Up Next Task */}
        <Card
          variant="yellow"
          borderRadius={32}
          padding={28}
          onPress={() => router.push("/(tabs)/tasks")}
          className="mb-4"
        >
          <View className="flex-row justify-between items-start mb-4">
            <Text className="text-xs font-manrope-bold tracking-widest text-black/40">
              {t.home.upNext}
            </Text>
            <View className="w-12 h-12 rounded-24 bg-black/[0.08] justify-center items-center">
              <Zap size={24} color="#1C1C1E" fill="#1C1C1E" />
            </View>
          </View>
          {nextAssignment ? (
            <>
              <Text className="text-2xl font-manrope-extrabold text-primary leading-[34px] mb-6">
                {nextAssignment.task?.name || t.home.currentTask}
              </Text>
              <View className="flex-row justify-between items-center">
                <View className="bg-black/[0.08] px-4 py-3 rounded-14">
                  <Text className="text-sm font-manrope-semibold text-primary">
                    {formatTaskTime(nextAssignment.assignedDate)}
                  </Text>
                </View>
                <ArrowRight size={24} color="#1C1C1E" />
              </View>
            </>
          ) : (
            <>
              <Text className="text-2xl font-manrope-extrabold text-primary leading-[34px] mb-6">
                {t.home.allCaughtUp}
              </Text>
              <View className="flex-row justify-between items-center">
                <View className="bg-black/[0.08] px-4 py-3 rounded-14">
                  <Text className="text-sm font-manrope-semibold text-primary">
                    {t.home.noPendingTasks}
                  </Text>
                </View>
                <ArrowRight size={24} color="#1C1C1E" />
              </View>
            </>
          )}
        </Card>

        {/* Grid Cards */}
        <View className="flex-row gap-3 mb-4">
          {/* Rooms Card */}
          <Card
            variant="surface"
            borderRadius={28}
            padding={20}
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
              <Text
                className="text-xl font-manrope-bold leading-[26px]"
                style={{ color: theme.text }}
              >
                {t.home.myRooms}
              </Text>
              <Text
                className="text-sm font-manrope mt-1"
                style={{ color: theme.textSecondary }}
              >
                {interpolate(t.home.spaces, { count: rooms.length })}
              </Text>
            </View>
          </Card>

          {/* Polls Card */}
          <Card
            variant="purple"
            borderRadius={28}
            padding={20}
            onPress={() => router.push("/polls")}
            style={{ flex: 1, height: 180, justifyContent: "space-between" }}
          >
            <View className="w-11 h-11 rounded-22 border-2 border-black/10 justify-center items-center">
              <BarChart2 size={22} color="#1C1C1E" />
            </View>
            <View className="flex-1 justify-end">
              <Text className="text-xl font-manrope-bold text-primary leading-[26px]">
                {t.home.activePolls}
              </Text>
              <Text className="text-sm font-manrope text-black/50 mt-1">
                {interpolate(t.home.pending, { count: polls.length })}
              </Text>
            </View>
          </Card>
        </View>

        {/* Smart Home Card */}
        <Card
            variant="surface"
            borderRadius={28}
            padding={20}
            onPress={() => router.push("/smarthome")}
            className="mb-4"
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-4">
                    <View className="w-11 h-11 rounded-22 bg-accent-cyan justify-center items-center">
                         <Zap size={22} color="#FFFFFF" />
                    </View>
                    <View>
                        <Text className="text-lg font-manrope-bold" style={{ color: theme.text }}>
                            Smart Home
                        </Text>
                        <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                            Manage devices
                        </Text>
                    </View>
                </View>
                <ArrowRight size={20} color={theme.text} />
            </View>
        </Card>

        {/* Budget Card */}
        <Card
          variant="white"
          borderRadius={32}
          padding={28}
          onPress={() => router.push("/(tabs)/budget")}
          className="mb-6"
        >
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-xs font-manrope-semibold text-muted tracking-widest">
              {t.home.monthlySpend}
            </Text>
          </View>
          <Text className="text-5xl font-manrope-extrabold text-primary mb-5">
            ${monthlySpend.toFixed(0)}
          </Text>
          <View className="flex-row justify-between items-center">
            <View className="bg-accent-pink/15 px-4 py-3 rounded-14">
              <Text className="text-[13px] font-manrope-bold text-accent-pink">
                {t.home.totalExpenses}
              </Text>
            </View>
            <ArrowRight size={24} color="#1C1C1E" />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
