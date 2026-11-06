import { useLocalSearchParams } from "expo-router";
import { EyeOff, House, Shield, UserX } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  InfoRow,
  ListItem,
  ResponsiveGrid,
  Screen,
  ScreenHeader,
  Spinner,
  Text,
  useAlert,
} from "@/components/ui";
import { billApi, homeApi, taskApi } from "@/lib/api";
import type { HomeMembership } from "@/lib/types";
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
  const { user, updateUser } = useAuth();
  const { home } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
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

  if (!home) {
    return (
      <Screen width="md">
        <EmptyState icon={House} title={t.profile.memberProfileSelectHome} />
      </Screen>
    );
  }

  return (
    <Screen width="md">
      <ScreenHeader title={t.profile.myStats} />

      {loading ? (
        <Spinner fill />
      ) : !member ? (
        <EmptyState icon={UserX} title={t.profile.memberProfileNotFound} />
      ) : (
        <>
          <View className="items-center mb-6">
            <Avatar uri={member.user?.avatar} size={96} className="mb-3" style={{ backgroundColor: theme.surface }} />
            <Text variant="title" className="text-center">
              {member.user?.name || t.profile.memberProfileUnknown}
            </Text>
            {!!member.user?.username && (
              <Text variant="bodySmall" color="secondary" className="mt-1">
                @{member.user.username}
              </Text>
            )}
          </View>

          <Card size="sm" className="mb-4">
            <InfoRow
              label={t.profile.memberProfileRole}
              value={
                member.role === "admin" ? (
                  <Badge label={t.members.admin} tone="yellow" icon={Shield} />
                ) : (
                  <Badge label={t.members.member} tone="purple" />
                )
              }
            />
            <InfoRow label={t.profile.memberProfileJoined} value={formatDate(member.joinedAt)} />
          </Card>

          {isCurrentUser && (
            <ListItem
              title={t.profile.memberProfileStatsVisibility}
              subtitle={
                member.user?.profilePublic === false
                  ? t.profile.memberProfileHiddenFromMembers
                  : t.profile.memberProfileVisibleToMembers
              }
              showChevron={false}
              disabled={updatingPrivacy}
              onPress={handleTogglePrivacy}
              className="mb-4"
            />
          )}

          {!canViewStats ? (
            <ListItem
              left={<EyeOff size={20} color={theme.textSecondary} />}
              title={t.profile.memberProfileStatsHidden}
            />
          ) : (
            <ResponsiveGrid>
              <Card size="sm">
                <Text variant="subtitle" className="mb-1">
                  {t.profile.memberProfileTaskStats}
                </Text>
                <InfoRow label={t.common.total} value={stats?.tasksTotal ?? 0} />
                <InfoRow label={t.tasks.filters.completed} value={stats?.tasksCompleted ?? 0} />
                <InfoRow label={t.tasks.schedule.active} value={stats?.tasksActive ?? 0} />
              </Card>
              <Card size="sm">
                <Text variant="subtitle" className="mb-1">
                  {t.profile.memberProfileBudgetStats}
                </Text>
                <InfoRow label={t.profile.memberProfileBillsCreated} value={stats?.billsCreated ?? 0} />
                <InfoRow
                  label={t.profile.memberProfileAssignedSplitAmount}
                  value={(stats?.splitAmount ?? 0).toFixed(2)}
                />
              </Card>
            </ResponsiveGrid>
          )}
        </>
      )}
    </Screen>
  );
}
