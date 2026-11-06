import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bell, BellRing, Check, type LucideIcon, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { NotificationsSkeleton } from "@/components/skeletons";
import {
  Card,
  EmptyState,
  IconTile,
  ListItem,
  ResponsiveGrid,
  Screen,
  ScreenHeader,
  Text,
  useToast,
} from "@/components/ui";
import { notificationApi } from "@/lib/api";
import { getPushState, type PushPermissionState, subscribeToPush } from "@/lib/pushUtils";
import type { HomeNotification, Notification } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

function SwipeAction({
  icon: Icon,
  label,
  color,
  side,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  side: "left" | "right";
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      className={`justify-center items-center px-5 ${side === "left" ? "rounded-l-20" : "rounded-r-20"}`}
      style={{ backgroundColor: color }}
      onPress={onPress}
    >
      <Icon size={18} color={theme.onFill} />
      <Text variant="caption" className="font-manrope-semibold mt-1" style={{ color: theme.onFill }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { home } = useHome();
  const { user } = useAuth();
  const { show } = useToast();

  const [notifications, setNotifications] = useState<(Notification | HomeNotification)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  const [pushState, setPushState] = useState<PushPermissionState>("unsupported");

  const hiddenStorageKey = user ? `@hidden_notifications_${user.id}` : null;

  const getNotificationKey = useCallback(
    (notification: Notification | HomeNotification) =>
      !("to" in notification) ? `home:${notification.homeId}:${notification.id}` : `user:${notification.id}`,
    [],
  );
  const getSwipeableKey = useCallback(
    (notification: Notification | HomeNotification) =>
      `${notification.id}-${!("to" in notification) ? "home" : "user"}`,
    [],
  );

  const closeSwipeable = useCallback(
    (notification: Notification | HomeNotification) => {
      const key = getSwipeableKey(notification);
      swipeRefs.current[key]?.close();
    },
    [getSwipeableKey],
  );

  const getHiddenNotificationKeys = useCallback(async () => {
    if (!hiddenStorageKey) return new Set<string>();
    const raw = await AsyncStorage.getItem(hiddenStorageKey);
    if (!raw) return new Set<string>();
    try {
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed);
    } catch {
      return new Set<string>();
    }
  }, [hiddenStorageKey]);

  const hideNotification = useCallback(
    async (notification: Notification | HomeNotification) => {
      if (!hiddenStorageKey) return;
      const hidden = await getHiddenNotificationKeys();
      const key = getNotificationKey(notification);
      hidden.add(key);
      await AsyncStorage.setItem(hiddenStorageKey, JSON.stringify(Array.from(hidden)));
      setNotifications((prev) => prev.filter((item) => getNotificationKey(item) !== key));
      show({ title: t.common.deleted, message: t.notifications.hiddenForYou });
    },
    [getHiddenNotificationKeys, getNotificationKey, hiddenStorageKey, show, t],
  );

  const markAsRead = useCallback(
    async (notification: Notification | HomeNotification) => {
      if (notification.read) return;
      if (!("to" in notification)) {
        await notificationApi.markHomeNotificationAsRead(notification.homeId, notification.id);
      } else {
        await notificationApi.markAsRead(notification.id);
      }
      setNotifications((prev) =>
        prev.map((item) =>
          getNotificationKey(item) === getNotificationKey(notification) ? { ...item, read: true } : item,
        ),
      );
      show({ title: "Updated", message: "Notification marked as read." });
    },
    [getNotificationKey, show],
  );

  const loadNotifications = useCallback(async () => {
    try {
      let allNotifications: (Notification | HomeNotification)[] = [];

      // Load user notifications, scoped to the currently selected home
      const userNotifications = await notificationApi.getUserNotifications(home?.id).catch(() => []);
      allNotifications = [...userNotifications];

      // Load home notifications if user is in a home
      if (home) {
        const homeNotifications = await notificationApi.getHomeNotifications(home.id).catch(() => []);
        allNotifications = [...allNotifications, ...homeNotifications];
      }

      // Sort by date (newest first)
      allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const hidden = await getHiddenNotificationKeys();
      const visibleNotifications = allNotifications.filter(
        (notification) => !hidden.has(getNotificationKey(notification)),
      );

      setNotifications(visibleNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getHiddenNotificationKeys, getNotificationKey, home]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    getPushState().then(setPushState);
  }, []);

  const handleEnablePush = async () => {
    try {
      const success = await subscribeToPush();
      setPushState(success ? "granted" : await getPushState());
      if (success) {
        show({
          title: t.notifications.pushEnabled || "Enabled",
          message: t.notifications.pushEnabledText || "Push notifications enabled!",
        });
      }
    } catch {
      show({ title: "Error", message: t.notifications.pushError || "Failed to enable push notifications" });
    }
  };

  useRealtimeRefresh(["NOTIFICATION", "HOME_NOTIFICATION"], loadNotifications);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notification: Notification | HomeNotification) => {
    try {
      await markAsRead(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDelete = async (notification: Notification | HomeNotification) => {
    try {
      await hideNotification(notification);
    } catch (error) {
      console.error("Error hiding notification:", error);
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
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader title={t.profile.notifications} />

      {pushState === "prompt" && (
        <ListItem
          left={<BellRing size={22} color={theme.onFill} />}
          title={t.notifications.enablePush || "Enable push notifications"}
          subtitle={t.notifications.enablePushText || "Get notified even when the app is closed"}
          selected
          onPress={handleEnablePush}
          className="mb-4"
        />
      )}
      {pushState === "denied" && (
        <ListItem
          left={<Bell size={22} color={theme.textSecondary} />}
          title={t.notifications.pushBlocked || "Push notifications blocked"}
          subtitle={t.notifications.pushBlockedText || "Enable them in your browser settings"}
          className="mb-4"
        />
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t.notifications.noNotifications || "No notifications"}
          description={t.notifications.noNotificationsText || "You're all caught up!"}
        />
      ) : (
        <ResponsiveGrid>
          {notifications.map((notification) => (
            <Swipeable
              key={getSwipeableKey(notification)}
              ref={(ref) => {
                swipeRefs.current[getSwipeableKey(notification)] = ref;
              }}
              overshootLeft={false}
              overshootRight={false}
              onSwipeableOpen={(direction) => {
                if (direction === "left") {
                  closeSwipeable(notification);
                  handleDelete(notification);
                  return;
                }
                if (direction === "right" && !notification.read) {
                  closeSwipeable(notification);
                  handleMarkAsRead(notification);
                }
              }}
              renderLeftActions={() => (
                <SwipeAction
                  icon={Trash2}
                  label={t.common.delete}
                  color={theme.accent.pink}
                  side="left"
                  onPress={() => {
                    closeSwipeable(notification);
                    handleDelete(notification);
                  }}
                />
              )}
              renderRightActions={() =>
                notification.read ? null : (
                  <SwipeAction
                    icon={Check}
                    label="Read"
                    color={theme.accent.mint}
                    side="right"
                    onPress={() => {
                      closeSwipeable(notification);
                      handleMarkAsRead(notification);
                    }}
                  />
                )
              }
            >
              <Card
                size="sm"
                style={notification.read ? undefined : { borderLeftWidth: 3, borderLeftColor: theme.accent.purple }}
              >
                <View className="flex-row items-start gap-3">
                  <IconTile icon={Bell} tone="purple" />
                  <View className="flex-1">
                    <Text variant="bodySmall" className="font-manrope-medium mb-1">
                      {notification.description}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Swipeable>
          ))}
        </ResponsiveGrid>
      )}
    </Screen>
  );
}
