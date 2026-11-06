import { useRouter } from "expo-router";
import { Check, Clock, Shield, Trash2, Users, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { MembersSkeleton } from "@/components/skeletons";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  IconButton,
  ResponsiveGrid,
  Screen,
  ScreenHeader,
  Section,
  Text,
  useAlert,
} from "@/components/ui";
import { homeApi } from "@/lib/api";
import type { HomeMembership } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";

export default function MembersScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { home, isAdmin, removeMember } = useHome();
  const { user } = useAuth();
  const { alert } = useAlert();

  const [members, setMembers] = useState<HomeMembership[]>([]);
  const [pendingMembers, setPendingMembers] = useState<HomeMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!home) return;
    try {
      const data = await homeApi.getMembers(home.id);
      setMembers(data);

      if (isAdmin) {
        const pending = await homeApi.getPendingMembers(home.id);
        setPendingMembers(pending);
      }
    } catch (error) {
      console.error("Error loading members:", error);
      alert(t.common.error, t.members.failedToLoad);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [home, isAdmin, t, alert]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useRealtimeRefresh(["HOME"], loadMembers);

  const handleRemoveMember = (member: HomeMembership) => {
    if (member.userId === user?.id) {
      alert(t.common.error, t.members.cannotRemoveSelf);
      return;
    }

    alert(t.members.removeMember, t.members.removeMemberConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.members.remove,
        style: "destructive",
        onPress: async () => {
          const result = await removeMember(member.userId);
          if (result.success) {
            await loadMembers();
          } else {
            alert(t.common.error, result.error || t.members.failedToRemove);
          }
        },
      },
    ]);
  };

  const handleApproveMember = (member: HomeMembership) => {
    if (!home) return;
    alert(t.members.approveMember, t.members.approveConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.members.approve,
        onPress: async () => {
          try {
            await homeApi.approveMember(home.id, member.userId);
            await loadMembers();
          } catch {
            alert(t.common.error, t.members.failedToApprove);
          }
        },
      },
    ]);
  };

  const handleUpdateRole = (member: HomeMembership) => {
    if (!home) return;
    const isMemberAdmin = member.role === "admin";
    const newRole = isMemberAdmin ? "member" : "admin";

    alert(
      isMemberAdmin ? t.members.removeAdmin : t.members.makeAdmin,
      isMemberAdmin ? t.members.removeAdminConfirm : t.members.makeAdminConfirm,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: isMemberAdmin ? t.members.remove : t.members.approve,
          onPress: async () => {
            try {
              await homeApi.updateMemberRole(home.id, member.userId, newRole);
              await loadMembers();
            } catch {
              alert(t.common.error, t.members.failedToUpdateRole);
            }
          },
        },
      ],
    );
  };

  const handleRejectMember = (member: HomeMembership) => {
    if (!home) return;
    alert(t.members.rejectMember, t.members.rejectConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.members.reject,
        style: "destructive",
        onPress: async () => {
          try {
            await homeApi.rejectMember(home.id, member.userId);
            await loadMembers();
          } catch {
            alert(t.common.error, t.members.failedToReject);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMembers();
  }, [loadMembers]);

  const renderMemberCard = (member: HomeMembership, isPending = false) => {
    const isCurrentUser = member.userId === user?.id;
    const isMemberAdmin = member.role === "admin";

    return (
      <Card key={member.id} size="sm" className="flex-row items-center">
        <TouchableOpacity
          className="flex-row items-center flex-1"
          activeOpacity={0.8}
          disabled={isPending}
          onPress={() => {
            router.push({
              pathname: "/member-profile",
              params: { userId: String(member.userId) },
            });
          }}
        >
          <Avatar uri={member.user?.avatar} className="mr-3.5" />

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text variant="subtitle" numberOfLines={1} className="shrink">
                {member.user?.name || t.profile.memberProfileUnknown}
              </Text>
              {isCurrentUser && (
                <Text variant="caption" color="secondary">
                  {t.members.you}
                </Text>
              )}
            </View>
            <Text variant="bodySmall" color="secondary" numberOfLines={1} className="mt-0.5">
              {member.user?.email}
            </Text>
            <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              {isPending ? (
                <Badge label={t.members.pending} tone="yellow" icon={Clock} />
              ) : (
                <Badge
                  label={isMemberAdmin ? t.members.admin : t.members.member}
                  tone={isMemberAdmin ? "yellow" : "purple"}
                  icon={isMemberAdmin ? Shield : undefined}
                />
              )}
              <Text variant="caption" color="secondary">
                {interpolate(t.members.joined, { date: formatDate(member.joinedAt) })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isPending ? (
          <View className="flex-row gap-2 ml-2">
            <IconButton icon={Check} size="sm" tone="mint" onPress={() => handleApproveMember(member)} />
            <IconButton icon={X} size="sm" tone="danger" onPress={() => handleRejectMember(member)} />
          </View>
        ) : (
          isAdmin &&
          !isCurrentUser && (
            <View className="flex-row gap-2 ml-2">
              <IconButton icon={Shield} size="sm" tone="yellow" onPress={() => handleUpdateRole(member)} />
              {!isMemberAdmin && (
                <IconButton icon={Trash2} size="sm" tone="danger" onPress={() => handleRemoveMember(member)} />
              )}
            </View>
          )
        )}
      </Card>
    );
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader title={t.members.title} />

      {isLoading ? (
        <MembersSkeleton />
      ) : (
        <>
          {isAdmin && pendingMembers.length > 0 && (
            <Section title={`${t.members.pendingRequests} (${pendingMembers.length})`} titleVariant="heading">
              <ResponsiveGrid>{pendingMembers.map((member) => renderMemberCard(member, true))}</ResponsiveGrid>
            </Section>
          )}

          {members.length === 0 ? (
            <EmptyState icon={Users} title={t.members.noMembers} />
          ) : (
            <ResponsiveGrid>{members.map((member) => renderMemberCard(member))}</ResponsiveGrid>
          )}
        </>
      )}
    </Screen>
  );
}
