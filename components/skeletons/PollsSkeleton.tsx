import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";
import Skeleton from "@/components/ui/skeleton";

export default function PollsSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        {/* Header */}
        <Skeleton width={100} height={36} borderRadius={10} style={{ marginBottom: 24 }} />

        {/* Poll Cards */}
        {[1, 2].map((i) => (
          <View
            key={i}
            className="rounded-3xl p-6 mb-4"
            style={{ backgroundColor: theme.surface }}
          >
            {/* Poll Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Skeleton width={70} height={28} borderRadius={12} />
              <View className="flex-row items-center gap-2">
                <Skeleton width={28} height={28} borderRadius={8} />
                <Skeleton width={20} height={20} borderRadius={10} />
              </View>
            </View>

            {/* Question */}
            <Skeleton width="90%" height={24} borderRadius={8} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={24} borderRadius={8} style={{ marginBottom: 20 }} />

            {/* Options */}
            <View className="gap-2.5">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} width="100%" height={52} borderRadius={12} />
              ))}
            </View>
          </View>
        ))}

        {/* Create Button */}
        <Skeleton width="100%" height={56} borderRadius={16} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}
