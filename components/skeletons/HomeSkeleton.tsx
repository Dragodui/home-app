import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";
import Skeleton from "@/components/ui/skeleton";

export default function HomeSkeleton() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Skeleton width={120} height={18} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width={160} height={36} borderRadius={10} />
          </View>
          <Skeleton width={56} height={56} borderRadius={28} />
        </View>

        {/* Hero Card */}
        <View
          className="rounded-[32px] p-7 mb-4"
          style={{ backgroundColor: theme.surface }}
        >
          <View className="flex-row justify-between items-start mb-4">
            <Skeleton width={60} height={12} borderRadius={4} />
            <Skeleton width={48} height={48} borderRadius={24} />
          </View>
          <Skeleton width="80%" height={28} borderRadius={8} style={{ marginBottom: 24 }} />
          <View className="flex-row justify-between items-center">
            <Skeleton width={140} height={40} borderRadius={14} />
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
        </View>

        {/* Grid Cards */}
        <View className="flex-row gap-3 mb-4">
          <View
            className="flex-1 rounded-[28px] p-5"
            style={{ backgroundColor: theme.surface, height: 180, justifyContent: "space-between" }}
          >
            <Skeleton width={44} height={44} borderRadius={22} />
            <View>
              <Skeleton width="70%" height={22} borderRadius={6} style={{ marginBottom: 6 }} />
              <Skeleton width="50%" height={14} borderRadius={4} />
            </View>
          </View>
          <View
            className="flex-1 rounded-[28px] p-5"
            style={{ backgroundColor: theme.surface, height: 180, justifyContent: "space-between" }}
          >
            <Skeleton width={44} height={44} borderRadius={22} />
            <View>
              <Skeleton width="70%" height={22} borderRadius={6} style={{ marginBottom: 6 }} />
              <Skeleton width="50%" height={14} borderRadius={4} />
            </View>
          </View>
        </View>

        {/* Smart Home Card */}
        <View
          className="rounded-[28px] p-5 mb-4"
          style={{ backgroundColor: theme.surface }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <Skeleton width={44} height={44} borderRadius={22} />
              <View>
                <Skeleton width={100} height={18} borderRadius={6} style={{ marginBottom: 4 }} />
                <Skeleton width={120} height={14} borderRadius={4} />
              </View>
            </View>
            <Skeleton width={20} height={20} borderRadius={10} />
          </View>
        </View>

        {/* Budget Card */}
        <View
          className="rounded-[32px] p-7"
          style={{ backgroundColor: theme.surface }}
        >
          <Skeleton width={100} height={12} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton width={120} height={44} borderRadius={10} style={{ marginBottom: 20 }} />
          <View className="flex-row justify-between items-center">
            <Skeleton width={130} height={40} borderRadius={14} />
            <Skeleton width={24} height={24} borderRadius={12} />
          </View>
        </View>
      </View>
    </View>
  );
}
