import { useRouter } from "expo-router";
import { MessageCircle, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import {
  Avatar,
  CountBadge,
  EmptyState,
  IconTile,
  ListItem,
  Screen,
  ScreenHeader,
  Spinner,
  Text,
} from "@/components/ui";
import { chatApi } from "@/lib/api";
import type { ChatConversation } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";

export default function ChatListScreen() {
  const router = useRouter();
  const { t, language } = useI18n();
  const { home } = useHome();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!home) return;
    try {
      const data = await chatApi.getConversations(home.id);
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useRealtimeRefresh(["CHAT"], loadConversations);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/home");
  };

  // Same-day messages show the time, older ones the date.
  const formatStamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const isToday = date.toDateString() === new Date().toDateString();
    return isToday
      ? date.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit", hour12: false })
      : date.toLocaleDateString(language);
  };

  const previewOf = (conversation: ChatConversation) => {
    const last = conversation.lastMessage;
    if (!last) return "";
    const author = last.creator?.name || last.creator?.username || "";
    const body = last.content.trim() || (last.imageUrl ? "🖼" : "");
    // Only the shared chat needs the author prefix; in a direct chat it's obvious.
    return conversation.peerId == null && author ? `${author}: ${body}` : body;
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader title={t.chat.title} onBack={goBack} />

      {isLoading ? (
        <Spinner fill />
      ) : conversations.length === 0 ? (
        <EmptyState icon={MessageCircle} title={t.chat.noMessages} description={t.chat.noMessagesDescription} />
      ) : (
        <View className="gap-2">
          {conversations.map((conversation) => {
            const isHomeChat = conversation.peerId == null;
            const peerName = conversation.peer?.name || conversation.peer?.username || "";

            return (
              <ListItem
                key={isHomeChat ? "home" : conversation.peerId}
                singleLine
                title={isHomeChat ? home?.name || t.chat.title : peerName}
                subtitle={previewOf(conversation) || t.chat.noMessages}
                left={
                  isHomeChat ? (
                    <IconTile icon={Users} tone="purple" />
                  ) : (
                    <Avatar uri={conversation.peer?.avatar} name={peerName || "?"} />
                  )
                }
                right={
                  <View className="items-end gap-1">
                    {conversation.lastMessage && (
                      <Text variant="micro" color="secondary">
                        {formatStamp(conversation.lastMessage.createdAt)}
                      </Text>
                    )}
                    <CountBadge count={conversation.unreadCount} />
                  </View>
                }
                onPress={() => router.push(`/chat/${isHomeChat ? "home" : conversation.peerId}` as never)}
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
