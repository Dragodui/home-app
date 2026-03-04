import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Skeleton from "@/components/ui/skeleton";
import { useTheme } from "@/stores/themeStore";

export default function TasksSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Skeleton width={120} height={36} borderRadius={10} style={{ marginBottom: 8 }} />
            <Skeleton width={160} height={16} borderRadius={6} />
          </View>
          <Skeleton width={56} height={56} borderRadius={18} />
        </View>

        {/* Filter Tabs */}
        <View className="flex-row gap-2.5 mb-6">
          <Skeleton width={60} height={40} borderRadius={12} />
          <Skeleton width={50} height={40} borderRadius={12} />
          <Skeleton width={80} height={40} borderRadius={12} />
        </View>

        {/* Task Items */}
        <View className="gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="rounded-[24px] p-5" style={{ backgroundColor: theme.surface }}>
              <View className="flex-row items-center gap-4">
                <Skeleton width={32} height={32} borderRadius={16} />
                <View className="flex-1">
                  <Skeleton width="70%" height={20} borderRadius={6} style={{ marginBottom: 8 }} />
                  <View className="flex-row items-center gap-2">
                    <Skeleton width={8} height={8} borderRadius={4} />
                    <Skeleton width={60} height={12} borderRadius={4} />
                    <Skeleton width={4} height={4} borderRadius={2} />
                    <Skeleton width={100} height={12} borderRadius={4} />
                  </View>
                </View>
                <Skeleton width={20} height={20} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
