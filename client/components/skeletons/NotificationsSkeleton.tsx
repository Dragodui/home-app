import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Skeleton from "@/components/ui/skeleton";
import { useTheme } from "@/stores/themeStore";

export default function NotificationsSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16 }}>
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <Skeleton width={48} height={48} borderRadius={16} />
          <View className="flex-1 items-center">
            <Skeleton width={140} height={24} borderRadius={8} />
          </View>
          <View style={{ width: 48 }} />
        </View>

        {/* Notification Items */}
        <View className="gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="p-4 rounded-[16px]" style={{ backgroundColor: theme.surface }}>
              <View className="flex-row items-start gap-3">
                <Skeleton width={40} height={40} borderRadius={12} />
                <View className="flex-1">
                  <Skeleton width="85%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
                  <Skeleton width="60%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
                  <Skeleton width={60} height={12} borderRadius={4} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
