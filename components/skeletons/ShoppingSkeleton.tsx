import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";
import Skeleton from "@/components/ui/skeleton";

export default function ShoppingSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Skeleton width={140} height={36} borderRadius={10} style={{ marginBottom: 8 }} />
            <Skeleton width={80} height={16} borderRadius={6} />
          </View>
          <Skeleton width={56} height={56} borderRadius={18} />
        </View>

        {/* Category Grid */}
        <View className="flex-row flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className="rounded-[24px] p-[18px]"
              style={{
                backgroundColor: theme.surface,
                width: "47%",
                aspectRatio: 0.9,
                justifyContent: "space-between",
              }}
            >
              <Skeleton width={40} height={40} borderRadius={12} />
              <View>
                <Skeleton width="70%" height={22} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={14} borderRadius={4} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
