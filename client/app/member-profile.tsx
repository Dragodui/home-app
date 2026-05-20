import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, EyeOff, Shield, User as UserIcon } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/alert";
import { billApi, homeApi, taskApi } from "@/lib/api";
import type { HomeMembership } from "@/lib/types";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
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
  const { t } = useI18n();
  const { alert } = useAlert();
  const params = useLocalSearchParams<{ userId?: string }>();
  const targetUserID = Number(params.userId);
  const { isDesktop, horizontalPadding } = useResponsiveLayout();

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
      alert(t.common.error, t.profile.memberProfileLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [alert, home, t.common.error, t.profile.memberProfileLoadFailed, targetUserID, user?.id]);

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
        alert(t.common.error, result.error || t.profile.memberProfileVisibilityFailed);
        return;
      }
      await loadProfile();
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const roleLabel = useMemo(() => {
    if (member?.role === "admin") return t.members.admin;
    return t.members.member;
  }, [member?.role, t.members.admin, t.members.member]);

  if (!home) {
    return (
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: theme.background }}>
        <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
          {t.profile.memberProfileSelectHome}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36,
          paddingTop: insets.top + 16,
          width: "100%",
          maxWidth: 960,
          alignSelf: "center",
        }}
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
            {t.profile.myStats}
          </Text>
          <View className="w-12" />
        </View>

        {loading ? (
          <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
            {t.common.loading}
          </Text>
        ) : !member ? (
          <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
            {t.profile.memberProfileNotFound}
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
                {member.user?.name || t.profile.memberProfileUnknown}
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
                  {t.profile.memberProfileRole}
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
                  {t.profile.memberProfileJoined}
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
                  {t.profile.memberProfileStatsVisibility}
                </Text>
                <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                  {member.user?.profilePublic === false
                    ? t.profile.memberProfileHiddenFromMembers
                    : t.profile.memberProfileVisibleToMembers}
                </Text>
              </TouchableOpacity>
            )}

            {!canViewStats ? (
              <View className="rounded-3xl p-4 flex-row items-center gap-3" style={{ backgroundColor: theme.surface }}>
                <EyeOff size={20} color={theme.textSecondary} />
                <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                  {t.profile.memberProfileStatsHidden}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 12 }}>
                <View className="rounded-3xl p-4" style={{ backgroundColor: theme.surface, flex: 1 }}>
                  <Text className="text-base font-manrope-semibold mb-3" style={{ color: theme.text }}>
                    {t.profile.memberProfileTaskStats}
                  </Text>
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      {t.common.total}
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.tasksTotal ?? 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      {t.tasks.schedule.completed}
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.tasksCompleted ?? 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      {t.tasks.schedule.active}
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.tasksActive ?? 0}
                    </Text>
                  </View>
                </View>

                <View className="rounded-3xl p-4" style={{ backgroundColor: theme.surface, flex: 1 }}>
                  <Text className="text-base font-manrope-semibold mb-3" style={{ color: theme.text }}>
                    {t.profile.memberProfileBudgetStats}
                  </Text>
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      {t.profile.memberProfileBillsCreated}
                    </Text>
                    <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                      {stats?.billsCreated ?? 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                      {t.profile.memberProfileAssignedSplitAmount}
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
