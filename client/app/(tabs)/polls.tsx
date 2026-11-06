import { BarChart2, Calendar, Check, Eye, EyeOff, Plus, RotateCcw, Trash2, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { PollsSkeleton } from "@/components/skeletons";
import {
  Avatar,
  Button,
  Card,
  DateTimeField,
  EmptyState,
  Fab,
  IconButton,
  Input,
  ListItem,
  Modal,
  ResponsiveGrid,
  Section,
  SegmentedControl,
  Switch,
  TabHeader,
  TabScreen,
  Text,
  useAlert,
} from "@/components/ui";
import { pollApi } from "@/lib/api";
import type { Poll, PollOption } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

function PollPill({ label }: { label: string }) {
  const { theme } = useTheme();

  return (
    <View className="px-3 py-1.5 rounded-xl" style={{ backgroundColor: theme.optionFill }}>
      <Text variant="caption" color="onAccent" className="font-manrope-semibold">
        {label}
      </Text>
    </View>
  );
}

export default function PollsScreen() {
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
        allowRevote: allowRevote,
        endsAt: hasEndDate ? endsAt.toISOString() : undefined,
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

  const POLL_COLORS = [
    theme.accent.purple,
    theme.accent.yellow,
    theme.accent.mint,
    theme.accent.cyan,
    theme.accent.pink,
  ];

  const handleDeletePoll = async (pollId: number) => {
    if (!home) return;

    alert(
      t.polls.deletePoll || "Delete Poll",
      t.polls.deletePollConfirm || "Are you sure you want to delete this poll?",
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete || "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await pollApi.delete(home.id, pollId);
              await loadPolls();
            } catch (error) {
              console.error("Error deleting poll:", error);
              alert(t.common.error, t.polls.failedToDelete || "Failed to delete poll");
            }
          },
        },
      ],
    );
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
    return poll.options.some((opt) => opt.votes?.some((v) => v.userId === user.id));
  };

  const getUserVote = (poll: Poll): number | null => {
    if (!user || !poll.options) return null;
    for (const opt of poll.options) {
      if (opt.votes?.some((v) => v.userId === user.id)) {
        return opt.id;
      }
    }
    return null;
  };

  const getTimeRemaining = (poll: Poll) => {
    if (!poll.endsAt) {
      return t.polls.noEndDate || "No end date";
    }

    const now = new Date();
    const endDate = new Date(poll.endsAt);
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

  if (isLoading) {
    return <PollsSkeleton />;
  }

  return (
    <TabScreen
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={<Fab icon={Plus} tone="purple" aboveTabBar onPress={() => setShowCreateModal(true)} />}
    >
      <TabHeader title={t.polls.title} />

      {polls.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title={t.polls.noActivePolls}
          description={t.polls.noActivePollsDescription || "There are no active polls in this home yet."}
          action={<Button title={t.polls.createPoll || "Create Poll"} onPress={() => setShowCreateModal(true)} />}
        />
      ) : (
        <ResponsiveGrid>
          {polls.map((poll, index) => {
            const voted = hasUserVoted(poll);
            const userVote = getUserVote(poll);

            return (
              <Card key={poll.id} style={{ backgroundColor: POLL_COLORS[index % POLL_COLORS.length] }}>
                <View className="flex-row justify-between items-center mb-4">
                  <PollPill label={getTimeRemaining(poll)} />
                  <View className="flex-row items-center gap-2">
                    {isAdmin && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t.common.delete}
                        className="w-8 h-8 rounded-lg justify-center items-center"
                        hitSlop={8}
                        onPress={() => handleDeletePoll(poll.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color={theme.onAccent} />
                      </TouchableOpacity>
                    )}
                    <PollPill label={poll.type} />
                  </View>
                </View>

                <Text variant="heading" color="onAccent" className="mb-5" style={{ fontSize: 22, lineHeight: 28 }}>
                  {poll.question}
                </Text>

                <View className="gap-2.5">
                  {poll.options?.map((option) => {
                    const isSelected = userVote === option.id;
                    const voteCount = option.votes?.length || 0;

                    return (
                      <TouchableOpacity
                        key={option.id}
                        className="rounded-xl p-4 flex-row justify-between items-center gap-3"
                        style={{ backgroundColor: isSelected ? theme.selectedFill : theme.optionFill }}
                        onPress={() => !voted && handleVote(poll.id, option.id)}
                        onLongPress={() =>
                          poll.type === "public" && (option.votes?.length ?? 0) > 0 && setVotersOption(option)
                        }
                        disabled={voted && poll.type !== "public"}
                        activeOpacity={voted ? 1 : 0.8}
                      >
                        <Text
                          variant="label"
                          className="flex-1"
                          style={{ color: isSelected ? theme.onSelectedFill : theme.onAccent }}
                        >
                          {option.title}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          {isSelected && <Check size={16} color={theme.onSelectedFill} />}
                          <Text
                            variant="caption"
                            className="font-manrope-medium opacity-60"
                            style={{ color: isSelected ? theme.onSelectedFill : theme.onAccent }}
                          >
                            {voteCount} {voteCount !== 1 ? t.polls.votes : t.polls.vote}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {voted && poll.allowRevote && (
                  <Button
                    title={t.polls.removeVote || "Remove Vote"}
                    icon={<RotateCcw size={16} color={theme.onAccent} />}
                    size="md"
                    variant="onAccent"
                    onPress={() => handleUnvote(poll.id)}
                    className="mt-3"
                  />
                )}
              </Card>
            );
          })}
        </ResponsiveGrid>
      )}

      <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)} title={t.polls.createPoll}>
        <Input
          label={t.polls.question}
          placeholder={t.polls.questionPlaceholder}
          value={pollQuestion}
          onChangeText={setPollQuestion}
        />

        <Section compact title={t.polls.pollType || "POLL TYPE"}>
          <SegmentedControl<"public" | "anonymous">
            value={pollType}
            onChange={setPollType}
            options={[
              { value: "public", label: t.polls.public || "Public", icon: Eye },
              { value: "anonymous", label: t.polls.anonymous || "Anonymous", icon: EyeOff },
            ]}
          />
        </Section>

        <Section compact title={t.polls.options}>
          {pollOptions.map((option, index) => (
            <View key={index} className="flex-row items-start gap-2">
              <View className="flex-1">
                <Input
                  placeholder={t.polls.optionPlaceholder.replace("{index}", String(index + 1))}
                  value={option}
                  onChangeText={(text) => updateOption(index, text)}
                />
              </View>
              {pollOptions.length > 2 && (
                <IconButton
                  icon={X}
                  onPress={() => removeOption(index)}
                  className="mt-2"
                  accessibilityLabel={t.common.delete}
                />
              )}
            </View>
          ))}

          {pollOptions.length < 6 && (
            <Button
              title={t.polls.addOption}
              icon={<Plus size={20} color={theme.textSecondary} />}
              size="md"
              variant="outline"
              onPress={addOption}
            />
          )}
        </Section>

        <Section compact title={t.polls.settings || "SETTINGS"}>
          <ListItem
            left={<RotateCcw size={20} color={theme.text} />}
            title={t.polls.allowRevote || "Allow Revote"}
            right={<Switch value={allowRevote} onValueChange={setAllowRevote} />}
          />
        </Section>

        <Section compact title={t.polls.endDate || "END DATE"}>
          <ListItem
            left={<Calendar size={20} color={theme.text} />}
            title={t.polls.setEndDate || "Set End Date"}
            right={<Switch value={hasEndDate} onValueChange={setHasEndDate} />}
            className="mb-2"
          />
          {hasEndDate && (
            <DateTimeField placeholder={t.polls.endDate} value={endsAt} onChange={setEndsAt} minimumDate={new Date()} />
          )}
        </Section>

        <Button
          title={t.polls.createPoll}
          onPress={handleCreatePoll}
          loading={creating}
          disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2 || creating}
          variant="purple"
        />
      </Modal>

      <Modal
        visible={votersOption !== null}
        onClose={() => setVotersOption(null)}
        title={`${votersOption?.title} voters`}
        height="auto"
      >
        <View className="gap-3">
          {votersOption?.votes?.map((vote) => (
            <View key={vote.id} className="flex-row items-center gap-3 py-2">
              <Avatar uri={vote.user?.avatar} name={vote.user?.name ?? "?"} size={36} />
              <Text variant="subtitle">{vote.user?.name ?? `User #${vote.userId}`}</Text>
            </View>
          ))}
          {(!votersOption?.votes || votersOption.votes.length === 0) && (
            <Text variant="bodySmall" color="secondary" className="text-center py-4">
              {t.polls.noVotesYet}
            </Text>
          )}
        </View>
      </Modal>
    </TabScreen>
  );
}
