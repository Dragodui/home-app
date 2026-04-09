import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, EyeOff, Shield, User as UserIcon } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/alert";
import { billApi, homeApi, taskApi } from "@/lib/api";
import type { HomeMembership } from "@/lib/types";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useTheme } from "@/stores/themeStore";

type MemberStats = {
  tasksTotal: number;
  tasksCompleted: number;
  tasksActive: number;
  billsCreated: number;
  splitAmount: number;
};

type MemberProfileCacheEntry = {
  member: HomeMembership | null;
  stats: MemberStats | null;
};

const memberProfileCache = new Map<string, MemberProfileCacheEntry>();

export default function MemberProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { home } = useHome();
  const { theme } = useTheme();
  const { alert } = useAlert();
  const params = useLocalSearchParams<{ userId?: string }>();
  const targetUserID = Number(params.userId);

  const [member, setMember] = useState<HomeMembership | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  const isCurrentUser = member?.userId === user?.id;
  const canViewStats = isCurrentUser || member?.user?.profilePublic !== false;

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!home || Number.isNaN(targetUserID) || targetUserID <= 0) {
      setLoading(false);
      return;
    }

    const cacheKey = `${home.id}:${targetUserID}`;
    const cached = memberProfileCache.get(cacheKey);
    if (cached) {
      setMember(cached.member);
      setStats(cached.stats);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const members = await homeApi.getMembers(home.id);
      const targetMember = members.find((item) => item.userId === targetUserID) || null;
      setMember(targetMember);

      if (!targetMember) {
        setStats(null);
        memberProfileCache.set(cacheKey, { member: null, stats: null });
        return;
      }

      if (targetMember.userId !== user?.id && targetMember.user?.profilePublic === false) {
        setStats(null);
        memberProfileCache.set(cacheKey, { member: targetMember, stats: null });
        return;
      }

      const [assignments, bills] = await Promise.all([
        taskApi.getUserAssignments(home.id, targetMember.userId),
        billApi.getByHomeId(home.id),
      ]);

      const tasksCompleted = assignments.filter((assignment) => assignment.status === "completed").length;
      const tasksTotal = assignments.length;
      const tasksActive = tasksTotal - tasksCompleted;

      const billsCreated = bills.filter((bill) => bill.uploadedBy === targetMember.userId).length;
      const splitAmount = bills.reduce((sum, bill) => {
        const memberAmount = (bill.splits || [])
          .filter((split) => split.userId === targetMember.userId)
          .reduce((acc, split) => acc + split.amount, 0);
        return sum + memberAmount;
      }, 0);

      setStats({
        tasksTotal,
        tasksCompleted,
        tasksActive,
        billsCreated,
        splitAmount,
      });
      memberProfileCache.set(cacheKey, {
        member: targetMember,
        stats: {
          tasksTotal,
          tasksCompleted,
          tasksActive,
          billsCreated,
          splitAmount,
        },
      });
    } catch (error) {
      console.error("Error loading member profile:", error);
      alert("Error", "Failed to load member profile");
    } finally {
      setLoading(false);
    }
  }, [alert, home, targetUserID, user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleTogglePrivacy = async () => {
    if (!isCurrentUser || !member?.user) return;
    const nextValue = !(member.user.profilePublic ?? true);
    setUpdatingPrivacy(true);
    try {
      const result = await updateUser({ profilePublic: nextValue });
      if (!result.success) {
        alert("Error", result.error || "Failed to update visibility");
        return;
      }
      await loadProfile();
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const roleLabel = useMemo(() => {
    if (member?.role === "admin") return "Admin";
    return "Member";
  }, [member?.role]);

  if (!home) {
    return (
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: theme.background }}>
        <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
          Select home first
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-8">
          <TouchableOpacity
            className="w-12 h-12 rounded-16 justify-center items-center"
            style={{ backgroundColor: theme.surface }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-2xl font-manrope-bold text-center" style={{ color: theme.text }}>
            Member profile
          </Text>
          <View className="w-12" />
        </View>

        {loading ? (
          <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
            Loading...
          </Text>
        ) : !member ? (
          <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
            Member not found
          </Text>
        ) : (
          <>
            <View className="items-center mb-6">
              <View className="w-24 h-24 rounded-full overflow-hidden mb-3" style={{ backgroundColor: theme.surface }}>
                {member.user?.avatar ? (
                  <Image source={{ uri: member.user.avatar }} className="w-full h-full" />
                ) : (
                  <View className="w-full h-full justify-center items-center">
                    <UserIcon size={42} color={theme.textSecondary} />
                  </View>
                )}
              </View>
              <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>
                {member.user?.name || "Unknown"}
              </Text>
              {!!member.user?.username && (
                <Text className="text-sm font-manrope mt-1" style={{ color: theme.textSecondary }}>
                  @{member.user.username}
                </Text>
              )}
            </View>

            <View className="rounded-3xl p-4 mb-4" style={{ backgroundColor: theme.surface }}>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                  Role
                </Text>
                <View className="flex-row items-center gap-1">
                  {member.role === "admin" && <Shield size={12} color={theme.accent.yellow} />}
                  <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                    {roleLabel}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                  Joined
                </Text>
                <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                  {formatDate(member.joinedAt)}
                </Text>
              </View>
            </View>

            {isCurrentUser && (
              <TouchableOpacity
                className="rounded-3xl p-4 mb-4"
                style={{ backgroundColor: theme.surface, opacity: updatingPrivacy ? 0.7 : 1 }}
                onPress={handleTogglePrivacy}
                disabled={updatingPrivacy}
              >
                <Text className="text-base font-manrope-semibold mb-1" style={{ color: theme.text }}>
                  Stats visibility
                </Text>
                <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                  {member.user?.profilePublic === false ? "Hidden from other members" : "Visible to other members"}
                </Text>
              </TouchableOpacity>
            )}

            {!canViewStats ? (
              <View className="rounded-3xl p-4 flex-row items-center gap-3" style={{ backgroundColor: theme.surface }}>
                <EyeOff size={20} color={theme.textSecondary} />
                <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                  This member hid their stats.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                <View className="rounded-3xl p-4" style={{ backgroundColor: theme.surface }}>
                  <Text className="text-base font-manrope-semibold mb-3" style={{ color: theme.text }}>
                    Task stats
                  </Text>
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      Total
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.tasksTotal ?? 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      Completed
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.tasksCompleted ?? 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      Active
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.tasksActive ?? 0}
                    </Text>
                  </View>
                </View>

                <View className="rounded-3xl p-4" style={{ backgroundColor: theme.surface }}>
                  <Text className="text-base font-manrope-semibold mb-3" style={{ color: theme.text }}>
                    Budget stats
                  </Text>
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      Bills created
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.billsCreated ?? 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      Assigned split amount
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {(stats?.splitAmount ?? 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
