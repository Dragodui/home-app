import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Skeleton from "@/components/ui/skeleton";
import { useTheme } from "@/stores/themeStore";

export default function BudgetSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Skeleton width={120} height={36} borderRadius={10} style={{ marginBottom: 8 }} />
            <Skeleton width={100} height={16} borderRadius={6} />
          </View>
          <Skeleton width={56} height={56} borderRadius={18} />
        </View>

        {/* Donut Chart Placeholder */}
        <View className="items-center mb-6">
          <Skeleton width={180} height={180} borderRadius={90} />
        </View>

        {/* Category Legend */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <View key={i} className="flex-row items-center gap-2">
              <Skeleton width={12} height={12} borderRadius={6} />
              <Skeleton width={60} height={14} borderRadius={4} />
            </View>
          ))}
        </View>

        {/* Bill Items */}
        <View className="gap-3">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="rounded-[24px] p-5" style={{ backgroundColor: theme.surface }}>
              <View className="flex-row items-center gap-4">
                <Skeleton width={44} height={44} borderRadius={14} />
                <View className="flex-1">
                  <Skeleton width="60%" height={18} borderRadius={6} style={{ marginBottom: 6 }} />
                  <Skeleton width="40%" height={14} borderRadius={4} />
                </View>
                <Skeleton width={60} height={20} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
