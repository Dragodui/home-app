import { useRouter } from "expo-router";
import { ArrowLeft, Bell, Check } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationsSkeleton } from "@/components/skeletons";
import { notificationApi } from "@/lib/api";
import type { HomeNotification, Notification } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { home } = useHome();

  const [notifications, setNotifications] = useState<(Notification | HomeNotification)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      let allNotifications: (Notification | HomeNotification)[] = [];

      // Load user notifications
      const userNotifications = await notificationApi.getUserNotifications().catch(() => []);
      allNotifications = [...userNotifications];

      // Load home notifications if user is in a home
      if (home) {
        const homeNotifications = await notificationApi.getHomeNotifications(home.id).catch(() => []);
        allNotifications = [...allNotifications, ...homeNotifications];
      }

      // Sort by date (newest first)
      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(allNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useRealtimeRefresh(["NOTIFICATION", "HOME_NOTIFICATION"], loadNotifications);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notification: Notification | HomeNotification) => {
    try {
      if ("homeId" in notification) {
        // Home notification
        await notificationApi.markHomeNotificationAsRead(notification.homeId, notification.id);
      } else {
        // User notification
        await notificationApi.markAsRead(notification.id);
      }
      await loadNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.notifications.justNow || "Just now";
    if (diffMins < 60) return `${diffMins} ${t.notifications.minutesAgo || "min ago"}`;
    if (diffHours < 24) return `${diffHours} ${t.notifications.hoursAgo || "h ago"}`;
    if (diffDays < 7) return `${diffDays} ${t.notifications.daysAgo || "d ago"}`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return <NotificationsSkeleton />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: insets.top + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity
            className="w-12 h-12 rounded-16 justify-center items-center"
            style={{ backgroundColor: theme.surface }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-2xl font-manrope-bold text-center" style={{ color: theme.text }}>
            {t.profile.notifications}
          </Text>
          <View className="w-12" />
        </View>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View className="flex-1 justify-center items-center pt-20">
            <View
              className="w-25 h-25 rounded-full justify-center items-center mb-6"
              style={{ backgroundColor: theme.surface }}
            >
              <Bell size={48} color={theme.textSecondary} />
            </View>
            <Text className="text-xl font-manrope-bold mb-2" style={{ color: theme.text }}>
              {t.notifications.noNotifications || "No notifications"}
            </Text>
            <Text className="text-15 font-manrope" style={{ color: theme.textSecondary }}>
              {t.notifications.noNotificationsText || "You're all caught up!"}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {notifications.map((notification) => (
              <View
                key={`${notification.id}-${"homeId" in notification ? "home" : "user"}`}
                className="p-4 rounded-16"
                style={{
                  backgroundColor: theme.surface,
                  borderLeftWidth: !notification.read ? 3 : 0,
                  borderLeftColor: !notification.read ? theme.accent.purple : undefined,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="w-10 h-10 rounded-12 justify-center items-center"
                    style={{ backgroundColor: theme.accent.purple }}
                  >
                    <Bell size={18} color="#1C1C1E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-15 font-manrope-medium mb-1" style={{ color: theme.text, lineHeight: 22 }}>
                      {notification.description}
                    </Text>
                    <Text className="text-13 font-manrope" style={{ color: theme.textSecondary }}>
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>
                </View>
                {!notification.read && (
                  <TouchableOpacity
                    className="absolute top-4 right-4 w-8 h-8 rounded-16 justify-center items-center"
                    style={{ backgroundColor: theme.background }}
                    onPress={() => markAsRead(notification)}
                  >
                    <Check size={18} color={theme.accent.purple} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
