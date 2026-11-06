import { useRouter } from "expo-router";
import { DoorOpen, House, Plus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import RoomFormModal from "@/components/rooms/room-form-modal";
import { DEFAULT_ROOM_COLOR, getRoomIcon, type RoomIconId } from "@/components/rooms/room-options";
import {
  ActionSheet,
  Button,
  Card,
  EmptyState,
  IconButton,
  ResponsiveGrid,
  Screen,
  ScreenHeader,
  Text,
  useAlert,
} from "@/components/ui";
import { toDisplayColor } from "@/constants/glass-theme";
import { roomApi } from "@/lib/api";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function RoomsScreen() {
  const router = useRouter();
  const { home, rooms, isAdmin, createRoom, deleteRoom, refreshRooms } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_ROOM_COLOR);
  const [selectedIcon, setSelectedIcon] = useState<RoomIconId>("home");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<(typeof rooms)[number] | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

  const handleSaveRoom = async () => {
    if (!roomName.trim()) return;
    if (!home) return;

    setIsLoading(true);
    try {
      if (editingRoomId) {
        await roomApi.update(home.id, editingRoomId, {
          name: roomName.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
        await refreshRooms();
      } else {
        const result = await createRoom(roomName.trim(), selectedIcon, selectedColor);
        if (!result.success) {
          alert(t.common.error, result.error || t.rooms.failedToCreate);
          return;
        }
      }

      setShowCreateModal(false);
      setEditingRoomId(null);
      setRoomName("");
      setSelectedColor(DEFAULT_ROOM_COLOR);
      setSelectedIcon("home");
    } catch (error) {
      console.error("Error saving room:", error);
      alert(t.common.error, editingRoomId ? t.rooms.failedToUpdate : t.rooms.failedToCreate);
    } finally {
      setIsLoading(false);
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

  const openRoomActions = (room: (typeof rooms)[number]) => {
    if (!isAdmin) return;
    setSelectedRoom(room);
  };

  const openEditRoom = (room: (typeof rooms)[number]) => {
    setEditingRoomId(room.id);
    setRoomName(room.name);
    setSelectedIcon((room.icon as RoomIconId) || "home");
    setSelectedColor(room.color || DEFAULT_ROOM_COLOR);
    setShowCreateModal(true);
  };

  if (!home) {
    return (
      <Screen>
        <ScreenHeader title={t.rooms.title} />
        <EmptyState icon={House} title={t.rooms.joinHomeToManage} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={t.rooms.title}
        right={
          isAdmin ? <IconButton icon={Plus} tone="yellow" solid onPress={() => setShowCreateModal(true)} /> : undefined
        }
      />

      {rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title={t.rooms.noRooms}
          description={isAdmin ? t.rooms.noRoomsAdminHint : t.rooms.noRoomsMemberHint}
          action={
            isAdmin ? (
              <Button title={t.rooms.createRoom || "Create Room"} onPress={() => setShowCreateModal(true)} />
            ) : undefined
          }
        />
      ) : (
        <ResponsiveGrid mobileColumns={2} desktopColumns={4}>
          {rooms.map((room, index) => {
            const ROOM_COLORS = [
              theme.accent.yellow,
              theme.accent.purple,
              theme.accent.pink,
              theme.surface,
              theme.border,
            ];
            const backgroundColor = room.color
              ? toDisplayColor(room.color, theme)
              : ROOM_COLORS[index % ROOM_COLORS.length];
            const textColor =
              backgroundColor === theme.surface || backgroundColor === theme.border ? theme.text : theme.onAccent;
            const RoomIcon = getRoomIcon(room.icon);

            return (
              <Card
                key={room.id}
                className="flex-1"
                style={{ backgroundColor, minHeight: 160 }}
                onPress={() =>
                  router.push({ pathname: "/rooms/[id]", params: { id: String(room.id), name: room.name } })
                }
                onLongPress={() => openRoomActions(room)}
              >
                <View className="w-14 h-14 rounded-20 justify-center items-center mb-4 bg-black/10">
                  <RoomIcon size={28} color={textColor} />
                </View>
                <Text variant="heading" className="mb-1" style={{ color: textColor }}>
                  {room.name}
                </Text>
                <Text variant="caption" style={{ color: textColor, opacity: 0.6 }}>
                  {interpolate(t.rooms.added, { date: new Date(room.createdAt).toLocaleDateString() })}
                </Text>
              </Card>
            );
          })}
        </ResponsiveGrid>
      )}

      <RoomFormModal
        visible={showCreateModal}
        isEditing={!!editingRoomId}
        name={roomName}
        color={selectedColor}
        icon={selectedIcon}
        saving={isLoading}
        onNameChange={setRoomName}
        onColorChange={setSelectedColor}
        onIconChange={setSelectedIcon}
        onSave={handleSaveRoom}
        onClose={() => {
          setShowCreateModal(false);
          setEditingRoomId(null);
        }}
      />

      <ActionSheet
        visible={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom?.name || "Room actions"}
        cancelLabel={t.common.cancel}
        actions={
          selectedRoom
            ? [
                { label: t.common.edit, onPress: () => openEditRoom(selectedRoom) },
                {
                  label: t.common.delete,
                  destructive: true,
                  onPress: () => handleDeleteRoom(selectedRoom.id, selectedRoom.name),
                },
              ]
            : []
        }
      />
    </Screen>
  );
}
