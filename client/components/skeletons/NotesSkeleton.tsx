import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Skeleton from "@/components/ui/skeleton";
import { useTheme } from "@/stores/themeStore";

export default function NotesSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Skeleton width={120} height={36} borderRadius={10} />
          <Skeleton width={36} height={36} borderRadius={18} />
        </View>

        {/* Categories Horizontal Bar */}
        <View className="flex-row gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={80} height={32} borderRadius={16} />
          ))}
        </View>

        {/* Note Cards */}
        {[1, 2, 3].map((i) => (
          <View key={i} className="rounded-3xl p-5 mb-4" style={{ backgroundColor: theme.surface }}>
            {/* Note Header */}
            <View className="flex-row justify-between items-center mb-3">
              <Skeleton width="60%" height={22} borderRadius={8} />
              <Skeleton width={60} height={16} borderRadius={8} />
            </View>

            {/* Note Snippet */}
            <Skeleton width="100%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={16} borderRadius={6} style={{ marginBottom: 12 }} />

            {/* Note Footer */}
            <View className="flex-row justify-between items-center">
              <Skeleton width={80} height={16} borderRadius={6} />
              <Skeleton width={40} height={16} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
