import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Skeleton from "@/components/ui/skeleton";

export default function MembersSkeleton() {
  const { theme } = useTheme();

  return (
    <View className="gap-3">
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className="flex-row items-center p-4 rounded-[20px]"
          style={{ backgroundColor: theme.surface }}
        >
          {/* Avatar */}
          <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 14 }} />

          {/* Info */}
          <View className="flex-1">
            <Skeleton width="50%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
            <Skeleton width="70%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
            <View className="flex-row items-center gap-2">
              <Skeleton width={60} height={22} borderRadius={11} />
              <Skeleton width={80} height={12} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
