import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, Home, Trash2, DoorOpen } from "lucide-react-native";
import { useHome } from "@/stores/homeStore";
import { useTheme } from "@/stores/themeStore";
import { useI18n, interpolate } from "@/stores/i18nStore";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useAlert } from "@/components/ui/alert";

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { home, rooms, isAdmin, createRoom, deleteRoom } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;

    setIsLoading(true);
    const result = await createRoom(roomName.trim());
    setIsLoading(false);

    if (result.success) {
      setShowCreateModal(false);
      setRoomName("");
    } else {
      alert(t.common.error, result.error || t.rooms.failedToCreate);
    }
  };

  const handleDeleteRoom = (roomId: number, roomName: string) => {
    alert(t.rooms.deleteRoom, interpolate(t.rooms.deleteRoomConfirm, { name: roomName }), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          const result = await deleteRoom(roomId);
          if (!result.success) {
            alert(t.common.error, result.error || t.rooms.failedToDelete);
          }
        },
      },
    ]);
  };

  if (!home) {
    return (
      <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: theme.background }}>
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-12 h-12 rounded-16 justify-center items-center"
            style={{ backgroundColor: theme.surface }}
          >
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>
            {t.rooms.title}
          </Text>
          <View className="w-12" />
        </View>
        <View className="flex-1 justify-center items-center py-15">
          <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
            {t.rooms.joinHomeToManage}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-12 h-12 rounded-16 justify-center items-center"
            style={{ backgroundColor: theme.surface }}
          >
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>
            {t.rooms.title}
          </Text>
          {isAdmin ? (
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="w-12 h-12 rounded-16 justify-center items-center"
              style={{ backgroundColor: theme.accent.yellow }}
            >
              <Plus size={24} color="#1C1C1E" />
            </TouchableOpacity>
          ) : (
            <View className="w-12" />
          )}
        </View>

        {/* Rooms Grid */}
        {rooms.length === 0 ? (
          <View className="items-center py-15">
            <View
              className="w-24 h-24 rounded-full justify-center items-center mb-6"
              style={{ backgroundColor: theme.surface }}
            >
              <DoorOpen size={48} color={theme.textSecondary} />
            </View>
            <Text className="text-22 font-manrope-bold mb-2" style={{ color: theme.text }}>
              {t.rooms.noRooms}
            </Text>
            <Text
              className="text-sm font-manrope text-center px-5"
              style={{ color: theme.textSecondary, lineHeight: 22 }}
            >
              {isAdmin
                ? t.rooms.noRoomsAdminHint
                : t.rooms.noRoomsMemberHint}
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-4">
            {rooms.map((room, index) => {
              const ROOM_COLORS = [
                theme.accent.yellow,
                theme.accent.purple,
                theme.accent.pink,
                theme.surface,
                theme.border,
              ];
              const colorIndex = index % ROOM_COLORS.length;
              const backgroundColor = ROOM_COLORS[colorIndex];
              const finalTextColor = (backgroundColor === theme.surface || backgroundColor === theme.border) ? theme.text : "#1C1C1E";

              return (
                <TouchableOpacity
                  key={room.id}
                  className="rounded-28 p-6 relative"
                  style={{ backgroundColor, width: "47%", minHeight: 160 }}
                  onPress={() => router.push({ pathname: "/rooms/[id]", params: { id: String(room.id), name: room.name } })}
                >
                  <View className="w-14 h-14 rounded-20 justify-center items-center mb-4 bg-black/10">
                    <Home size={28} color={finalTextColor} />
                  </View>
                  <Text className="text-lg font-manrope-bold mb-1" style={{ color: finalTextColor }}>
                    {room.name}
                  </Text>
                  <Text className="text-xs font-manrope" style={{ color: finalTextColor, opacity: 0.6 }}>
                    {interpolate(t.rooms.added, { date: new Date(room.created_at).toLocaleDateString() })}
                  </Text>
                  {isAdmin && (
                    <TouchableOpacity
                      className="absolute top-4 right-4 w-9 h-9 rounded-12 justify-center items-center"
                      style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                      onPress={() => handleDeleteRoom(room.id, room.name)}
                    >
                      <Trash2 size={18} color={theme.accent.danger} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t.rooms.newRoom}
        height="full"
      >
        <View className="flex-1">
          <Input
            label={t.rooms.roomName}
            placeholder={t.rooms.roomNamePlaceholder}
            value={roomName}
            onChangeText={setRoomName}
          />
          <Button
            title={t.rooms.createRoom}
            onPress={handleCreateRoom}
            loading={isLoading}
            disabled={!roomName.trim() || isLoading}
            variant="yellow"
            style={{ marginTop: "auto" }}
          />
        </View>
      </Modal>
    </View>
  );
}
