import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  CheckCheck,
  CheckCircle,
  DollarSign,
  ImagePlus,
  MessageCircle,
  Send,
  ShoppingBag,
  Tag,
  User as UserIcon,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  Modal,
  Screen,
  ScreenHeader,
  Spinner,
  Text,
  useAlert,
} from "@/components/ui";
import { billApi, billCategoryApi, chatApi, homeApi, imageApi, noteApi, shoppingApi, taskApi } from "@/lib/api";
import type {
  Bill,
  BillCategory,
  ChatMessage,
  NoteCategory,
  ShoppingCategory,
  ShoppingItem,
  Task,
  User,
} from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

const PAGE_SIZE = 50;

// Mention chips stay in one purple family - only the shade changes per kind -
// so a message with several mentions doesn't turn into a rainbow.
const MENTION_SHADES = {
  all: "#9B95CC",
  user: "#B8B4DC",
  task: "#CBC6F2",
  bill: "#D8D4FC",
  item: "#E2DFFF",
  category: "#A9A3D6",
};

// Matches the same mention syntax notes use: @user:"Name", @task:Name, @Name, @all
const MENTION_REGEX = /@(user|task|bill|item|category):(?:"([^"]+)"|(\S+))|@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g;

type SuggestionStep = "category" | "users" | "tasks" | "bills" | "items" | "note_categories";

type Suggestion =
  | { key: string; name: string; kind: "all" }
  | { key: string; name: string; kind: "step"; step: SuggestionStep }
  | { key: string; name: string; kind: "value"; prefix: string };

export default function ChatThreadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // "home" is the shared chat; any other value is the peer user's id.
  const { peer } = useLocalSearchParams<{ peer: string }>();
  const peerId = peer && peer !== "home" ? Number(peer) : null;
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const { home } = useHome();
  const { user } = useAuth();
  const { alert } = useAlert();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Mention source data
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [noteCategories, setNoteCategories] = useState<NoteCategory[]>([]);
  const [billCategories, setBillCategories] = useState<BillCategory[]>([]);
  const [shoppingCategories, setShoppingCategories] = useState<ShoppingCategory[]>([]);

  // Mention autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionStep, setSuggestionStep] = useState<SuggestionStep>("category");
  const [suggestionQuery, setSuggestionQuery] = useState("");

  // Message action / read-receipt sheets
  const [actionsMessage, setActionsMessage] = useState<ChatMessage | null>(null);

  const inputRef = useRef<TextInput>(null);

  // The person on the other side of a direct chat, for the header.
  const peerUser = useMemo(
    () => (peerId === null ? undefined : members.find((m) => m.id === peerId)),
    [members, peerId],
  );

  // router.back() is a no-op when nothing is on the stack (chat opened via a
  // direct link or after a reload), so fall back to the home tab.
  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/chat");
  }, [router]);

  const loadMessages = useCallback(async () => {
    if (!home) return;
    try {
      const data = await chatApi.getMessages(home.id, { limit: PAGE_SIZE, peerId });
      setMessages(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home, peerId]);

  const loadMentionSources = useCallback(async () => {
    if (!home) return;
    try {
      const [memberData, taskData, billData, noteCatData, billCatData, shoppingCatData] = await Promise.all([
        homeApi.getMembers(home.id).catch(() => []),
        taskApi.getByHomeId(home.id).catch(() => []),
        billApi.getByHomeId(home.id).catch(() => []),
        noteApi.getCategoriesByHomeId(home.id).catch(() => []),
        billCategoryApi.getAll(home.id).catch(() => []),
        shoppingApi.getCategories(home.id).catch(() => []),
      ]);

      setMembers(memberData.map((m) => m.user).filter(Boolean) as User[]);
      setTasks(taskData);
      setBills(billData);
      setNoteCategories(noteCatData);
      setBillCategories(billCatData);
      setShoppingCategories(shoppingCatData);

      // Shopping items live under categories, so collect them per category.
      const itemLists = await Promise.all(
        shoppingCatData.map((c) => shoppingApi.getCategoryItems(home.id, c.id).catch(() => [] as ShoppingItem[])),
      );
      setItems(itemLists.flat());
    } catch (error) {
      console.error("Failed to load mention sources:", error);
    }
  }, [home]);

  useEffect(() => {
    loadMessages();
    loadMentionSources();
  }, [loadMessages, loadMentionSources]);

  useRealtimeRefresh(["CHAT"], loadMessages);

  // Mark everything visible as read whenever the newest message changes.
  const newestId = messages.length > 0 ? messages[0].id : null;
  useEffect(() => {
    if (!home || newestId === null) return;
    chatApi.markRead(home.id, newestId, peerId).catch(() => {});
  }, [home, newestId, peerId]);

  const handleLoadMore = async () => {
    if (!home || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestId = messages[messages.length - 1].id;
      const older = await chatApi.getMessages(home.id, { limit: PAGE_SIZE, beforeId: oldestId, peerId });
      setMessages((prev) => [...prev, ...older]);
      setHasMore(older.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Resolve the @mentions written in the text into the ID lists the API wants.
  const resolveMentions = (content: string) => {
    const userIds: number[] = [];
    const taskIds: number[] = [];
    const billIds: number[] = [];
    const itemIds: number[] = [];
    const noteCategoryIds: number[] = [];
    const billCategoryIds: number[] = [];
    const shoppingCategoryIds: number[] = [];
    let mentionsAll = false;

    const regex = new RegExp(MENTION_REGEX.source, "g");
    while (true) {
      const match = regex.exec(content);
      if (match === null) break;

      const prefixType = match[1];
      const name = match[2] || match[3] || match[4] || match[5];
      if (!name) continue;

      if (!prefixType && name.toLowerCase() === "all") {
        mentionsAll = true;
        continue;
      }

      if (prefixType === "user" || !prefixType) {
        const found = members.find((m) => m.username === name || m.name === name);
        if (found) {
          userIds.push(found.id);
          continue;
        }
      }
      if (prefixType === "task" || !prefixType) {
        const found = tasks.find((task) => task.name === name);
        if (found) {
          taskIds.push(found.id);
          continue;
        }
      }
      if (prefixType === "bill" || !prefixType) {
        const found = bills.find((b) => b.description === name);
        if (found) {
          billIds.push(found.id);
          continue;
        }
      }
      if (prefixType === "item" || !prefixType) {
        const found = items.find((i) => i.name === name);
        if (found) {
          itemIds.push(found.id);
          continue;
        }
      }
      if (prefixType === "category" || !prefixType) {
        const noteCat = noteCategories.find((c) => c.name === name);
        if (noteCat) {
          noteCategoryIds.push(noteCat.id);
          continue;
        }
        const billCat = billCategories.find((c) => c.name === name);
        if (billCat) {
          billCategoryIds.push(billCat.id);
          continue;
        }
        const shoppingCat = shoppingCategories.find((c) => c.name === name);
        if (shoppingCat) shoppingCategoryIds.push(shoppingCat.id);
      }
    }

    return {
      mentionsAll,
      mentionedUserIds: userIds,
      mentionedTaskIds: taskIds,
      mentionedBillIds: billIds,
      mentionedShoppingItemIds: itemIds,
      mentionedNoteCategoryIds: noteCategoryIds,
      mentionedBillCategoryIds: billCategoryIds,
      mentionedShoppingCategoryIds: shoppingCategoryIds,
    };
  };

  const handleDraftChange = (text: string) => {
    setDraft(text);

    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    const afterAt = text.substring(lastAtIndex);
    const isTypedPrefix = /^@(user|task|bill|item|category):"/.test(afterAt);
    if (afterAt.includes(" ") && !isTypedPrefix) {
      setShowSuggestions(false);
      return;
    }

    const prefixMatch = afterAt.match(/^@(user|task|bill|item|category):(.*)$/);
    if (prefixMatch) {
      const [, kind, query] = prefixMatch;
      const stepByKind: Record<string, SuggestionStep> = {
        user: "users",
        task: "tasks",
        bill: "bills",
        item: "items",
        category: "note_categories",
      };
      setSuggestionStep(stepByKind[kind]);
      setSuggestionQuery(query.replace(/"/g, ""));
      setShowSuggestions(true);
      return;
    }

    setSuggestionStep("category");
    setSuggestionQuery(afterAt.substring(1).toLowerCase());
    setShowSuggestions(true);
  };

  const suggestions = useMemo<Suggestion[]>(() => {
    const query = suggestionQuery.toLowerCase();

    if (suggestionStep === "category") {
      const kinds: Suggestion[] = [
        { key: "all", name: t.chat.mentionAll, kind: "all" },
        { key: "users", name: "Users", kind: "step", step: "users" },
        { key: "tasks", name: "Tasks", kind: "step", step: "tasks" },
        { key: "bills", name: "Bills", kind: "step", step: "bills" },
        { key: "items", name: "Shopping Items", kind: "step", step: "items" },
        { key: "categories", name: "Categories", kind: "step", step: "note_categories" },
      ];
      return kinds.filter((k) => k.name.toLowerCase().includes(query));
    }

    if (suggestionStep === "users") {
      return members
        .filter((m) => (m.username || m.name || "").toLowerCase().includes(query))
        .map((m) => ({ key: `user-${m.id}`, name: m.username || m.name, kind: "value" as const, prefix: "user" }));
    }
    if (suggestionStep === "tasks") {
      return tasks
        .filter((task) => task.name.toLowerCase().includes(query))
        .map((task) => ({ key: `task-${task.id}`, name: task.name, kind: "value" as const, prefix: "task" }));
    }
    if (suggestionStep === "bills") {
      return bills
        .filter((b) => (b.description || "").toLowerCase().includes(query))
        .map((b) => ({ key: `bill-${b.id}`, name: b.description || "", kind: "value" as const, prefix: "bill" }));
    }
    if (suggestionStep === "items") {
      return items
        .filter((i) => i.name.toLowerCase().includes(query))
        .map((i) => ({ key: `item-${i.id}`, name: i.name, kind: "value" as const, prefix: "item" }));
    }

    return [...noteCategories, ...billCategories, ...shoppingCategories]
      .filter((c) => c.name.toLowerCase().includes(query))
      .map((c) => ({ key: `cat-${c.name}`, name: c.name, kind: "value" as const, prefix: "category" }));
  }, [
    suggestionStep,
    suggestionQuery,
    members,
    tasks,
    bills,
    items,
    noteCategories,
    billCategories,
    shoppingCategories,
    t.chat.mentionAll,
  ]);

  const applySuggestion = (suggestion: Suggestion) => {
    const lastAtIndex = draft.lastIndexOf("@");
    if (lastAtIndex === -1) return;
    const before = draft.substring(0, lastAtIndex);

    if (suggestion.kind === "step") {
      const prefixByStep: Record<SuggestionStep, string> = {
        category: "@",
        users: "@user:",
        tasks: "@task:",
        bills: "@bill:",
        items: "@item:",
        note_categories: "@category:",
      };
      setDraft(`${before}${prefixByStep[suggestion.step]}`);
      setSuggestionStep(suggestion.step);
      setSuggestionQuery("");
      inputRef.current?.focus();
      return;
    }

    if (suggestion.kind === "all") {
      setDraft(`${before}@all `);
      setShowSuggestions(false);
      return;
    }

    // Quote names that contain spaces so the parser keeps them in one token.
    const value = suggestion.name.includes(" ") ? `"${suggestion.name}"` : suggestion.name;
    setDraft(`${before}@${suggestion.prefix}:${value} `);
    setShowSuggestions(false);
  };

  // Picks an image and uploads it right away, so sending stays instant and the
  // composer can show a preview of what's attached.
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      setUploadingImage(true);
      const uri = result.assets[0].uri;
      const formData = new FormData();

      if (Platform.OS === "web") {
        const blob = await (await fetch(uri)).blob();
        formData.append("image", blob, "chat.jpg");
      } else {
        // @ts-expect-error - React Native FormData expects this shape
        formData.append("image", { uri, name: "chat.jpg", type: "image/jpeg" });
      }

      const uploaded = await imageApi.upload(formData);
      if (uploaded.url) setAttachedImage(uploaded.url);
    } catch (error) {
      console.error("Failed to attach image:", error);
      alert(t.common.error, t.chat.failedToSend);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!home || sending || (!content && !attachedImage)) return;
    setSending(true);
    const mentions = resolveMentions(content);

    try {
      if (editingId !== null) {
        await chatApi.update(home.id, editingId, { content, imageUrl: attachedImage ?? "", ...mentions });
        setEditingId(null);
      } else {
        await chatApi.send(home.id, { content, imageUrl: attachedImage, recipientId: peerId, ...mentions });
      }
      setDraft("");
      setAttachedImage(null);
      setShowSuggestions(false);
      await loadMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(t.common.error, editingId !== null ? t.chat.failedToUpdate : t.chat.failedToSend);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (message: ChatMessage) => {
    setActionsMessage(null);
    alert(t.chat.deleteMessage, t.chat.deleteConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          if (!home) return;
          try {
            await chatApi.delete(home.id, message.id);
            await loadMessages();
          } catch (error) {
            console.error("Failed to delete message:", error);
            alert(t.common.error, t.chat.failedToDelete);
          }
        },
      },
    ]);
  };

  const startEditing = (message: ChatMessage) => {
    setActionsMessage(null);
    setEditingId(message.id);
    setDraft(message.content);
    setAttachedImage(message.imageUrl ?? null);
    inputRef.current?.focus();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString(language)} ${formatTime(dateStr)}`;
  };

  // Renders message text with mention badges, mirroring how notes display them.
  const renderContent = (message: ChatMessage) => {
    const regex = new RegExp(MENTION_REGEX.source, "g");
    const parts: React.ReactNode[] = [];
    const isOwn = message.createdBy === user?.id;
    const baseColor = isOwn ? theme.onAccent : theme.text;
    let lastIndex = 0;
    let key = 0;

    // Plain text goes in word by word so the wrapping row can break lines
    // naturally - one long Text inside a flex-wrap row would not wrap.
    const pushWords = (text: string) => {
      for (const word of text.split(/(\s+)/)) {
        if (word.trim() === "") continue;
        parts.push(
          <Text key={key++} variant="body" style={{ color: baseColor }}>
            {word}
          </Text>,
        );
      }
    };

    while (true) {
      const match = regex.exec(message.content);
      if (match === null) break;

      if (match.index > lastIndex) {
        pushWords(message.content.substring(lastIndex, match.index));
      }

      const prefixType = match[1];
      const name = match[2] || match[3] || match[4] || match[5] || "";

      let badgeColor = "";
      let icon: React.ReactNode = null;
      let matched = false;
      const chipText = theme.onAccent;

      if (!prefixType && name.toLowerCase() === "all") {
        matched = true;
        badgeColor = MENTION_SHADES.all;
        icon = <Users size={12} color={chipText} />;
      } else if (
        prefixType === "user" ||
        (!prefixType && message.mentionedUsers?.some((u) => u.username === name || u.name === name))
      ) {
        matched = true;
        badgeColor = MENTION_SHADES.user;
        icon = <UserIcon size={12} color={chipText} />;
      } else if (prefixType === "task" || (!prefixType && message.mentionedTasks?.some((task) => task.name === name))) {
        matched = true;
        badgeColor = MENTION_SHADES.task;
        icon = <CheckCircle size={12} color={chipText} />;
      } else if (
        prefixType === "bill" ||
        (!prefixType && message.mentionedBills?.some((b) => b.description === name))
      ) {
        matched = true;
        badgeColor = MENTION_SHADES.bill;
        icon = <DollarSign size={12} color={chipText} />;
      } else if (
        prefixType === "item" ||
        (!prefixType && message.mentionedShoppingItems?.some((i) => i.name === name))
      ) {
        matched = true;
        badgeColor = MENTION_SHADES.item;
        icon = <ShoppingBag size={12} color={chipText} />;
      } else if (
        prefixType === "category" ||
        (!prefixType &&
          (message.mentionedNoteCategories?.some((c) => c.name === name) ||
            message.mentionedBillCategories?.some((c) => c.name === name) ||
            message.mentionedShoppingCategories?.some((c) => c.name === name)))
      ) {
        matched = true;
        badgeColor = MENTION_SHADES.category;
        icon = <Tag size={12} color={chipText} />;
      }

      if (matched) {
        // A real View chip, not a nested Text: an icon element or vertical
        // padding inside a Text breaks React Native's inline line box, which
        // is what made chips wrap onto their own broken line.
        parts.push(
          <View
            key={key++}
            className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: badgeColor }}
          >
            {icon}
            <Text variant="label" style={{ color: chipText }}>
              {name}
            </Text>
          </View>,
        );
      } else {
        pushWords(match[0]);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < message.content.length) {
      pushWords(message.content.substring(lastIndex));
    }

    return <View className="flex-row flex-wrap items-center gap-x-1 gap-y-1">{parts}</View>;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.createdBy === user?.id;
    const readCount = item.reads?.length || 0;
    const author = item.creator;
    const mutedOnBubble = isOwn ? `${theme.onAccent}99` : theme.textSecondary;

    return (
      <View className={`mb-3 flex-row items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
        {!isOwn && (
          <Avatar
            uri={author?.avatar}
            name={author?.name || author?.username || "?"}
            size={36}
            style={{ backgroundColor: theme.surface }}
          />
        )}
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => isOwn && setActionsMessage(item)}
          className="max-w-[75%]"
        >
          {!isOwn && (
            <Text variant="caption" color="secondary" className="font-manrope-semibold mb-1 ml-1">
              {author?.name || author?.username || ""}
            </Text>
          )}
          <View
            className="px-4 py-3 rounded-2xl"
            style={{ backgroundColor: isOwn ? theme.accent.cyan : theme.surface }}
          >
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} className="w-56 h-56 rounded-xl mb-2" resizeMode="cover" />
            )}
            {item.content.trim().length > 0 && renderContent(item)}
            <View className="flex-row items-center justify-end gap-1.5 mt-1">
              {item.editedAt && (
                <Text variant="micro" style={{ color: mutedOnBubble }}>
                  {t.chat.edited}
                </Text>
              )}
              <Text variant="micro" style={{ color: mutedOnBubble }}>
                {formatTime(item.createdAt)}
              </Text>
              {/* One tick until somebody reads it, two once it's been read. */}
              {isOwn &&
                (readCount > 0 ? (
                  <CheckCheck size={13} color={theme.onAccent} />
                ) : (
                  <Check size={13} color={mutedOnBubble} />
                ))}
            </View>
          </View>
        </TouchableOpacity>
        {isOwn && (
          <Avatar
            uri={user?.avatar}
            name={user?.name || user?.username || "?"}
            size={36}
            style={{ backgroundColor: theme.surface }}
          />
        )}
      </View>
    );
  };

  const canSend = !!draft.trim() || !!attachedImage;

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title={peerId === null ? `${home?.name || ""} ${t.chat.title}` : peerUser?.name || peerUser?.username || ""}
        onBack={goBack}
        className="mb-4"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {isLoading ? (
          <Spinner fill />
        ) : messages.length === 0 ? (
          <EmptyState icon={MessageCircle} title={t.chat.noMessages} description={t.chat.noMessagesDescription} />
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            inverted
            contentContainerStyle={{ paddingBottom: 8 }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? <Spinner size="small" color={theme.textSecondary} className="my-4" /> : null
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Mention suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <View className="mb-2 rounded-2xl overflow-hidden max-h-48" style={{ backgroundColor: theme.surface }}>
            <FlatList
              data={suggestions}
              keyExtractor={(s) => s.key}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity className="px-4 py-3" onPress={() => applySuggestion(item)}>
                  <Text variant="label">{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Attached image preview */}
        {attachedImage && (
          <View className="mb-2 flex-row">
            <View className="relative">
              <Image source={{ uri: attachedImage }} className="w-20 h-20 rounded-xl" resizeMode="cover" />
              <TouchableOpacity
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full justify-center items-center"
                style={{ backgroundColor: theme.accent.pink }}
                hitSlop={8}
                onPress={() => setAttachedImage(null)}
              >
                <X size={14} color={theme.onAccent} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Composer */}
        <View className="flex-row items-end gap-2 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
          <IconButton icon={ImagePlus} onPress={pickImage} loading={uploadingImage} />
          {editingId !== null && (
            <IconButton
              icon={X}
              onPress={() => {
                setEditingId(null);
                setDraft("");
                setAttachedImage(null);
              }}
            />
          )}
          <TextInput
            ref={inputRef}
            className="flex-1 px-4 py-3 rounded-2xl font-manrope text-base max-h-32"
            style={{ backgroundColor: theme.surface, color: theme.text }}
            placeholder={t.chat.placeholder}
            placeholderTextColor={theme.textSecondary}
            value={draft}
            onChangeText={handleDraftChange}
            multiline
          />
          <IconButton
            icon={Send}
            tone={canSend ? "cyan" : "neutral"}
            solid={canSend}
            loading={sending}
            disabled={!canSend}
            onPress={handleSend}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Own-message actions, with the read-by avatars on top */}
      <Modal
        visible={actionsMessage !== null}
        onClose={() => setActionsMessage(null)}
        title={t.chat.title}
        height="auto"
      >
        <View className="gap-3">
          {/* Read-by block only appears once somebody has actually read it. */}
          {actionsMessage?.reads && actionsMessage.reads.length > 0 && (
            <View className="gap-2">
              <Text variant="overline">{t.chat.readBy}</Text>
              <View className="flex-row flex-wrap gap-3">
                {actionsMessage.reads.map((read) => {
                  const readerName = read.user?.name || read.user?.username;
                  return (
                    <View key={read.id} className="items-center gap-1 w-14">
                      <Avatar uri={read.user?.avatar} name={readerName || "?"} size={44} />
                      <Text variant="micro" className="font-manrope-semibold text-center" numberOfLines={1}>
                        {readerName || `#${read.userId}`}
                      </Text>
                      <Text variant="micro" color="secondary" className="text-center">
                        {formatDateTime(read.readAt)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <Button
            title={t.common.edit}
            size="md"
            variant="secondary"
            onPress={() => actionsMessage && startEditing(actionsMessage)}
          />
          <Button
            title={t.common.delete}
            size="md"
            variant="danger"
            onPress={() => actionsMessage && handleDelete(actionsMessage)}
          />
        </View>
      </Modal>
    </Screen>
  );
}
