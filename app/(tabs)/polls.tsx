import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from "react-native";
import DatePicker from "@/components/ui/date-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, Check, Users, X, Eye, EyeOff, Calendar, RotateCcw } from "lucide-react-native";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useTheme } from "@/stores/themeStore";
import { useI18n } from "@/stores/i18nStore";
import { pollApi } from "@/lib/api";
import { Poll, PollOption } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAlert } from "@/components/ui/alert";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { PollsSkeleton } from "@/components/skeletons";

export default function PollsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { home, isAdmin } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votersOption, setVotersOption] = useState<PollOption | null>(null);

  // Create poll modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollType, setPollType] = useState<"public" | "anonymous">("public");
  const [allowRevote, setAllowRevote] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endsAt, setEndsAt] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Default: tomorrow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadPolls = useCallback(async () => {
    if (!home) {
      setIsLoading(false);
      return;
    }

    try {
      const pollsData = await pollApi.getByHomeId(home.id);
      setPolls(pollsData?.filter((p) => p.status === "open") || []);
    } catch (error) {
      console.error("Error loading polls:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  useRealtimeRefresh(["POLL"], loadPolls);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPolls();
    setRefreshing(false);
  };

  const handleCreatePoll = async () => {
    if (!home || !pollQuestion.trim()) return;

    const validOptions = pollOptions.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      alert(t.common.error, t.polls.addAtLeastTwoOptions);
      return;
    }

    setCreating(true);
    try {
      await pollApi.create(home.id, {
        question: pollQuestion.trim(),
        type: pollType,
        options: validOptions.map((opt) => ({ title: opt.trim() })),
        allow_revote: allowRevote,
        ends_at: hasEndDate ? endsAt.toISOString() : undefined,
      });

      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollType("public");
      setAllowRevote(false);
      setHasEndDate(false);
      setEndsAt(new Date(Date.now() + 24 * 60 * 60 * 1000));
      setShowCreateModal(false);
      await loadPolls();
    } catch (error) {
      console.error("Error creating poll:", error);
      alert(t.common.error, t.polls.failedToCreate);
    } finally {
      setCreating(false);
    }
  };

  const handleUnvote = async (pollId: number) => {
    if (!home) return;

    try {
      await pollApi.unvote(home.id, pollId);
      await loadPolls();
    } catch (error: any) {
      console.error("Error removing vote:", error);
      alert(t.common.error, t.polls.failedToUnvote || "Failed to remove vote");
    }
  };

  const handleVote = async (pollId: number, optionId: number) => {
    if (!home) return;

    try {
      await pollApi.vote(home.id, pollId, optionId);
      await loadPolls();
    } catch (error) {
      console.error("Error voting:", error);
      alert(t.common.error, t.polls.failedToVote);
    }
  };

  const addOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const hasUserVoted = (poll: Poll) => {
    if (!user || !poll.options) return false;
    return poll.options.some((opt) => opt.votes?.some((v) => v.user_id === user.id));
  };

  const getUserVote = (poll: Poll): number | null => {
    if (!user || !poll.options) return null;
    for (const opt of poll.options) {
      if (opt.votes?.some((v) => v.user_id === user.id)) {
        return opt.id;
      }
    }
    return null;
  };

  const getTimeRemaining = (poll: Poll) => {
    if (!poll.ends_at) {
      return t.polls.noEndDate || "No end date";
    }

    const now = new Date();
    const endDate = new Date(poll.ends_at);
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) {
      return t.polls.ended || "Ended";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return <PollsSkeleton />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: insets.top + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          className="text-4xl font-manrope-bold mb-6"
          style={{ color: theme.text }}
        >
          {t.polls.title}
        </Text>

        {/* Poll Cards */}
        {polls.length === 0 ? (
          <View className="flex-1 justify-center items-center py-15">
            <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
              {t.polls.noActivePolls}
            </Text>
          </View>
        ) : (
          polls.map((poll) => {
            const voted = hasUserVoted(poll);
            const userVote = getUserVote(poll);

            return (
              <View
                key={poll.id}
                className="rounded-3xl p-6 mb-4"
                style={{ backgroundColor: theme.accent.purple }}
              >
                {/* Poll Header */}
                <View className="flex-row justify-between items-center mb-4">
                  <View className="bg-white/60 px-3 py-1.5 rounded-xl">
                    <Text className="text-xs font-manrope-semibold text-[#1C1C1E]">
                      {getTimeRemaining(poll)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {poll.allow_revote && (
                      <View className="bg-white/60 p-1.5 rounded-lg">
                        <RotateCcw size={12} color="#1C1C1E" />
                      </View>
                    )}
                    <View className="flex-row items-center">
                      <Users size={16} color="#1C1C1E" />
                    </View>
                  </View>
                </View>

                {/* Poll Question */}
                <Text className="text-[22px] font-manrope-bold text-[#1C1C1E] leading-7 mb-5">
                  {poll.question}
                </Text>

                {/* Poll Options */}
                <View className="gap-2.5">
                  {poll.options?.map((option) => {
                    const isSelected = userVote === option.id;
                    const voteCount = option.votes?.length || 0;

                    return (
                      <TouchableOpacity
                        key={option.id}
                        className={`rounded-xl p-4 flex-row justify-between items-center ${
                          isSelected ? "bg-[#1C1C1E]" : "bg-white/60"
                        }`}
                        onPress={() => !voted && handleVote(poll.id, option.id)}
                        onLongPress={() => poll.type === "public" && (option.votes?.length ?? 0) > 0 && setVotersOption(option)}
                        disabled={voted && poll.type !== "public"}
                        activeOpacity={voted ? 1 : 0.8}
                      >
                        <Text
                          className={`text-[15px] font-manrope-semibold ${
                            isSelected ? "text-white" : "text-[#1C1C1E]"
                          }`}
                        >
                          {option.title}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          {isSelected && <Check size={16} color="#FFFFFF" />}
                          <Text
                            className={`text-[13px] font-manrope-medium ${
                              isSelected ? "text-white/70" : "text-black/50"
                            }`}
                          >
                            {voteCount} {voteCount !== 1 ? t.polls.votes : t.polls.vote}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Unvote button */}
                {voted && poll.allow_revote && (
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-2 py-3 mt-3 bg-white/60 rounded-xl"
                    onPress={() => handleUnvote(poll.id)}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={16} color="#1C1C1E" />
                    <Text className="text-sm font-manrope-semibold text-[#1C1C1E]">
                      {t.polls.removeVote || "Remove Vote"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {/* Create New Poll Button */}
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2.5 py-5 rounded-2xl border-2 border-dashed mt-2"
          style={{ borderColor: theme.textSecondary }}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color={theme.textSecondary} />
          <Text className="text-base font-manrope-semibold" style={{ color: theme.textSecondary }}>
            {t.polls.newPoll}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create Poll Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t.polls.createPoll}
        height="full"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-1">
            <Input
              label={t.polls.question}
              placeholder={t.polls.questionPlaceholder}
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />

            {/* Poll Type Selection */}
            <View className="mt-4 mb-2">
              <Text
                className="text-xs font-manrope-bold tracking-widest mb-3 ml-1"
                style={{ color: theme.textSecondary }}
              >
                {t.polls.pollType || "POLL TYPE"}
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                  style={{ backgroundColor: pollType === "public" ? theme.accent.purple : theme.surface }}
                  onPress={() => setPollType("public")}
                >
                  <Eye size={18} color={pollType === "public" ? "#1C1C1E" : theme.textSecondary} />
                  <Text
                    className="text-sm font-manrope-semibold"
                    style={{ color: pollType === "public" ? "#1C1C1E" : theme.textSecondary }}
                  >
                    {t.polls.public || "Public"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl"
                  style={{ backgroundColor: pollType === "anonymous" ? theme.accent.purple : theme.surface }}
                  onPress={() => setPollType("anonymous")}
                >
                  <EyeOff size={18} color={pollType === "anonymous" ? "#1C1C1E" : theme.textSecondary} />
                  <Text
                    className="text-sm font-manrope-semibold"
                    style={{ color: pollType === "anonymous" ? "#1C1C1E" : theme.textSecondary }}
                  >
                    {t.polls.anonymous || "Anonymous"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-2">
              <Text
                className="text-xs font-manrope-bold tracking-widest mb-3 ml-1"
                style={{ color: theme.textSecondary }}
              >
                {t.polls.options}
              </Text>
              {pollOptions.map((option, index) => (
                <View key={index} className="flex-row items-center gap-2 mb-2">
                  <View className="flex-1">
                    <Input
                      placeholder={t.polls.optionPlaceholder.replace("{index}", String(index + 1))}
                      value={option}
                      onChangeText={(text) => updateOption(index, text)}
                    />
                  </View>
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      className="w-11 h-11 rounded-xl justify-center items-center mb-4"
                      style={{ backgroundColor: theme.surface }}
                      onPress={() => removeOption(index)}
                    >
                      <X size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 6 && (
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed mt-2"
                  style={{ borderColor: theme.accent.purple }}
                  onPress={addOption}
                >
                  <Plus size={20} color={theme.accent.purple} />
                  <Text className="text-sm font-manrope-bold" style={{ color: theme.accent.purple }}>
                    {t.polls.addOption}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Allow Revote Toggle */}
            <View className="mt-4">
              <Text
                className="text-xs font-manrope-bold tracking-widest mb-3 ml-1"
                style={{ color: theme.textSecondary }}
              >
                {t.polls.settings || "SETTINGS"}
              </Text>
              <View
                className="flex-row items-center justify-between py-3.5 px-4 rounded-xl"
                style={{ backgroundColor: theme.surfaceLight }}
              >
                <View className="flex-row items-center gap-3">
                  <RotateCcw size={20} color={theme.text} />
                  <Text className="text-[15px] font-manrope-medium" style={{ color: theme.text }}>
                    {t.polls.allowRevote || "Allow Revote"}
                  </Text>
                </View>
                <Switch
                  value={allowRevote}
                  onValueChange={setAllowRevote}
                  trackColor={{ false: theme.border, true: theme.accent.purple }}
                  thumbColor={theme.isDark ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>
            </View>

            {/* End Date Toggle and Picker */}
            <View className="mt-4">
              <Text
                className="text-xs font-manrope-bold tracking-widest mb-3 ml-1"
                style={{ color: theme.textSecondary }}
              >
                {t.polls.endDate || "END DATE"}
              </Text>
              <View
                className="flex-row items-center justify-between py-3.5 px-4 rounded-xl"
                style={{ backgroundColor: theme.surfaceLight }}
              >
                <View className="flex-row items-center gap-3">
                  <Calendar size={20} color={theme.text} />
                  <Text className="text-[15px] font-manrope-medium" style={{ color: theme.text }}>
                    {t.polls.setEndDate || "Set End Date"}
                  </Text>
                </View>
                <Switch
                  value={hasEndDate}
                  onValueChange={setHasEndDate}
                  trackColor={{ false: theme.border, true: theme.accent.purple }}
                  thumbColor={theme.isDark ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              {hasEndDate && (
                <TouchableOpacity
                  className="flex-row items-center justify-between py-3.5 px-4 rounded-xl mt-2"
                  style={{ backgroundColor: theme.surfaceLight }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text className="text-[15px] font-manrope-medium" style={{ color: theme.text }}>
                    {formatDateTime(endsAt)}
                  </Text>
                  <Calendar size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}

              <DatePicker
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onConfirm={(date) => {
                  setEndsAt(date);
                  setShowDatePicker(false);
                }}
                value={endsAt}
                mode="datetime"
                minimumDate={new Date()}
                title={t.polls.endDate}
                confirmLabel={t.common.done}
              />
            </View>
          </View>
        </ScrollView>

        <View className="pt-4 border-t" style={{ borderTopColor: theme.border }}>
          <Button
            title={t.polls.createPoll}
            onPress={handleCreatePoll}
            loading={creating}
            disabled={
              !pollQuestion.trim() ||
              pollOptions.filter((o) => o.trim()).length < 2 ||
              creating
            }
            variant="purple"
          />
        </View>
      </Modal>

      {/* Voters Modal */}
      <Modal
        visible={votersOption !== null}
        onClose={() => setVotersOption(null)}
        title={votersOption?.title}
        height="auto"
      >
        <View className="gap-3">
          {votersOption?.votes?.map((vote) => (
            <View key={vote.id} className="flex-row items-center gap-3 py-2">
              <View
                className="w-9 h-9 rounded-full justify-center items-center"
                style={{ backgroundColor: theme.accent.purple }}
              >
                <Text className="text-sm font-manrope-bold text-[#1C1C1E]">
                  {(vote.user?.name ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-base font-manrope-semibold" style={{ color: theme.text }}>
                {vote.user?.name ?? `User #${vote.user_id}`}
              </Text>
            </View>
          ))}
          {(!votersOption?.votes || votersOption.votes.length === 0) && (
            <Text className="text-sm text-center py-4" style={{ color: theme.textSecondary }}>
              {t.polls.noVotesYet}
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
}
