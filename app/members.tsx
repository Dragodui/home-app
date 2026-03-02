import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  User,
  Shield,
  Trash2,
  Users,
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { useHome } from "@/contexts/HomeContext";
import { useAuth } from "@/contexts/AuthContext";
import { homeApi } from "@/lib/api";
import { HomeMembership } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { interpolate } from "@/contexts/I18nContext";

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { home, isAdmin, removeMember } = useHome();
  const { user } = useAuth();

  const [members, setMembers] = useState<HomeMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!home) return;
    try {
      const data = await homeApi.getMembers(home.id);
      setMembers(data);
    } catch (error) {
      console.error("Error loading members:", error);
      Alert.alert(t.common.error, t.members.failedToLoad);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [home, t]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useRealtimeRefresh(["HOME"], loadMembers);

  const handleRemoveMember = (member: HomeMembership) => {
    if (member.user_id === user?.id) {
      Alert.alert(t.common.error, t.members.cannotRemoveSelf);
      return;
    }

    Alert.alert(t.members.removeMember, t.members.removeMemberConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.members.remove,
        style: "destructive",
        onPress: async () => {
          const result = await removeMember(member.user_id);
          if (result.success) {
            await loadMembers();
          } else {
            Alert.alert(t.common.error, result.error || t.members.failedToRemove);
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
        }
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
          <Text
            className="flex-1 text-2xl font-manrope-bold text-center"
            style={{ color: theme.text }}
          >
            {t.members.title}
          </Text>
          <View className="w-12" />
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color={theme.accent.purple} />
          </View>
        ) : members.length === 0 ? (
          /* Empty State */
          <View className="flex-1 justify-center items-center py-20">
            <Users size={48} color={theme.textSecondary} />
            <Text
              className="text-base font-manrope-medium mt-4"
              style={{ color: theme.textSecondary }}
            >
              {t.members.noMembers}
            </Text>
          </View>
        ) : (
          /* Member List */
          <View className="gap-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
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
                      <Image
                        source={{ uri: member.user.avatar }}
                        className="w-full h-full"
                      />
                    ) : (
                      <View className="w-full h-full justify-center items-center">
                        <User size={24} color={theme.textSecondary} />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text
                        className="text-base font-manrope-semibold"
                        style={{ color: theme.text }}
                      >
                        {member.user?.name || "Unknown"}
                      </Text>
                      {isCurrentUser && (
                        <Text
                          className="text-xs font-manrope"
                          style={{ color: theme.textSecondary }}
                        >
                          (you)
                        </Text>
                      )}
                    </View>
                    <Text
                      className="text-sm font-manrope mt-0.5"
                      style={{ color: theme.textSecondary }}
                    >
                      {member.user?.email}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1.5">
                      {/* Role badge */}
                      <View
                        className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: isMemberAdmin
                            ? theme.accent.yellow + "20"
                            : theme.accent.purple + "20",
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
                      {/* Join date */}
                      <Text
                        className="text-xs font-manrope"
                        style={{ color: theme.textSecondary }}
                      >
                        {interpolate(t.members.joined, { date: formatDate(member.joined_at) })}
                      </Text>
                    </View>
                  </View>

                  {/* Remove button (admin only, can't remove self) */}
                  {isAdmin && !isCurrentUser && !isMemberAdmin && (
                    <TouchableOpacity
                      className="w-10 h-10 rounded-14 justify-center items-center ml-2"
                      style={{ backgroundColor: theme.accent.dangerLight + "20" }}
                      onPress={() => handleRemoveMember(member)}
                    >
                      <Trash2 size={18} color={theme.accent.pink} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
