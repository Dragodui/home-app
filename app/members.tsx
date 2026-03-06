import { useRouter } from "expo-router";
import { ArrowLeft, Check, Clock, Shield, Trash2, User, Users, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MembersSkeleton } from "@/components/skeletons";
import { useAlert } from "@/components/ui/alert";
import { homeApi } from "@/lib/api";
import type { HomeMembership } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
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
      <View
        key={member.id}
        className="flex-row items-center p-4 rounded-20"
        style={{ backgroundColor: theme.surface }}
      >
        {/* Avatar */}
        <View
          className="w-12 h-12 rounded-full overflow-hidden mr-3.5"
          style={{ backgroundColor: theme.background }}
        >
          {member.user?.avatar ? (
            <Image source={{ uri: member.user.avatar }} className="w-full h-full" />
          ) : (
            <View className="w-full h-full justify-center items-center">
              <User size={24} color={theme.textSecondary} />
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-manrope-semibold" style={{ color: theme.text }}>
              {member.user?.name || "Unknown"}
            </Text>
            {isCurrentUser && (
              <Text className="text-xs font-manrope" style={{ color: theme.textSecondary }}>
                (you)
              </Text>
            )}
          </View>
          <Text className="text-sm font-manrope mt-0.5" style={{ color: theme.textSecondary }}>
            {member.user?.email}
          </Text>
          <View className="flex-row items-center gap-2 mt-1.5">
            {/* Role/Status badge */}
            {isPending ? (
              <View
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${theme.accent.yellow}20` }}
              >
                <Clock size={12} color={theme.accent.yellow} />
                <Text
                  className="text-xs font-manrope-semibold"
                  style={{ color: theme.accent.yellow }}
                >
                  {t.members.pending}
                </Text>
              </View>
            ) : (
              <View
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: isMemberAdmin ? `${theme.accent.yellow}20` : `${theme.accent.purple}20`,
                }}
              >
                {isMemberAdmin && <Shield size={12} color={theme.accent.yellow} />}
                <Text
                  className="text-xs font-manrope-semibold"
                  style={{
                    color: isMemberAdmin ? theme.accent.yellow : theme.accent.purple,
                  }}
                >
                  {isMemberAdmin ? t.members.admin : t.members.member}
                </Text>
              </View>
            )}
            {/* Join date */}
            <Text className="text-xs font-manrope" style={{ color: theme.textSecondary }}>
              {interpolate(t.members.joined, { date: formatDate(member.joinedAt) })}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        {isPending ? (
          <View className="flex-row gap-2 ml-2">
            <TouchableOpacity
              className="w-10 h-10 rounded-14 justify-center items-center"
              style={{ backgroundColor: `${theme.accent.mint}20` }}
              onPress={() => handleApproveMember(member)}
            >
              <Check size={18} color={theme.accent.mint} />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 rounded-14 justify-center items-center"
              style={{ backgroundColor: `${theme.accent.dangerLight}20` }}
              onPress={() => handleRejectMember(member)}
            >
              <X size={18} color={theme.accent.pink} />
            </TouchableOpacity>
          </View>
        ) : (
          isAdmin && !isCurrentUser && (
            <View className="flex-row gap-2 ml-2">
              <TouchableOpacity
                className="w-10 h-10 rounded-14 justify-center items-center"
                style={{ backgroundColor: `${theme.accent.yellow}20` }}
                onPress={() => handleUpdateRole(member)}
              >
                <Shield size={18} color={theme.accent.yellow} />
              </TouchableOpacity>
              {!isMemberAdmin && (
                <TouchableOpacity
                  className="w-10 h-10 rounded-14 justify-center items-center"
                  style={{ backgroundColor: `${theme.accent.dangerLight}20` }}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Trash2 size={18} color={theme.accent.pink} />
                </TouchableOpacity>
              )}
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          paddingTop: insets.top + 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
      >
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity
            className="w-12 h-12 rounded-16 justify-center items-center"
            style={{ backgroundColor: theme.surface }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-2xl font-manrope-bold text-center" style={{ color: theme.text }}>
            {t.members.title}
          </Text>
          <View className="w-12" />
        </View>

        {/* Loading State */}
        {isLoading ? (
          <MembersSkeleton />
        ) : (
          <>
            {/* Pending Members Section (admin only) */}
            {isAdmin && pendingMembers.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-manrope-bold mb-3" style={{ color: theme.text }}>
                  {t.members.pendingRequests} ({pendingMembers.length})
                </Text>
                <View className="gap-3">
                  {pendingMembers.map((member) => renderMemberCard(member, true))}
                </View>
              </View>
            )}

            {/* Current Members */}
            {members.length === 0 ? (
              <View className="flex-1 justify-center items-center py-20">
                <Users size={48} color={theme.textSecondary} />
                <Text className="text-base font-manrope-medium mt-4" style={{ color: theme.textSecondary }}>
                  {t.members.noMembers}
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {members.map((member) => renderMemberCard(member))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
