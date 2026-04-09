import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Book,
  Car,
  Coffee,
  DoorOpen,
  Home as HomeIcon,
  Lightbulb,
  Plus,
  Trash2,
  Utensils,
  Wrench,
} from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

const ROOM_COLOR_OPTIONS = [
  "#FF7476",
  "#FF9F7A",
  "#FBEB9E",
  "#A8E6CF",
  "#7DD3E8",
  "#D8D4FC",
  "#F5A3D3",
  "#22C55E",
  "#F472B6",
  "#C4B5FD",
  "#94A3B8",
  "#FDE68A",
  "#6EE7B7",
];

const ROOM_ICON_OPTIONS = [
  "home",
  "utensils",
  "lightbulb",
  "coffee",
  "wrench",
  "car",
  "book",
] as const;

const getRoomIcon = (iconId: string | undefined, size: number, color: string) => {
  switch (iconId) {
    case "utensils":
      return <Utensils size={size} color={color} />;
    case "lightbulb":
      return <Lightbulb size={size} color={color} />;
    case "coffee":
      return <Coffee size={size} color={color} />;
    case "wrench":
      return <Wrench size={size} color={color} />;
    case "car":
      return <Car size={size} color={color} />;
    case "book":
      return <Book size={size} color={color} />;
    case "home":
    default:
      return <HomeIcon size={size} color={color} />;
  }
};

export default function RoomsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { home, rooms, isAdmin, createRoom, deleteRoom } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [selectedColor, setSelectedColor] = useState(ROOM_COLOR_OPTIONS[2]);
  const [selectedIcon, setSelectedIcon] = useState<(typeof ROOM_ICON_OPTIONS)[number]>("home");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;

    setIsLoading(true);
    const result = await createRoom(roomName.trim(), selectedIcon, selectedColor);
    setIsLoading(false);

    if (result.success) {
      setShowCreateModal(false);
      setRoomName("");
      setSelectedColor(ROOM_COLOR_OPTIONS[2]);
      setSelectedIcon("home");
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
              {isAdmin ? t.rooms.noRoomsAdminHint : t.rooms.noRoomsMemberHint}
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
              const backgroundColor = room.color || ROOM_COLORS[colorIndex];
              const finalTextColor =
                backgroundColor === theme.surface || backgroundColor === theme.border ? theme.text : "#1C1C1E";

              return (
                <TouchableOpacity
                  key={room.id}
                  className="rounded-28 p-6 relative"
                  style={{ backgroundColor, width: "47%", minHeight: 160 }}
                  onPress={() =>
                    router.push({ pathname: "/rooms/[id]", params: { id: String(room.id), name: room.name } })
                  }
                  >
                    <View className="w-14 h-14 rounded-20 justify-center items-center mb-4 bg-black/10">
                    {getRoomIcon(room.icon, 28, finalTextColor)}
                    </View>
                  <Text className="text-lg font-manrope-bold mb-1" style={{ color: finalTextColor }}>
                    {room.name}
                  </Text>
                  <Text className="text-xs font-manrope" style={{ color: finalTextColor, opacity: 0.6 }}>
                    {interpolate(t.rooms.added, { date: new Date(room.createdAt).toLocaleDateString() })}
                  </Text>
                  {isAdmin && (
                    <TouchableOpacity
                      className="absolute top-4 right-4 w-9 h-9 rounded-12 justify-center items-center"
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
      <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)} title={t.rooms.newRoom} height="full">
        <View className="flex-1">
          <Input
            label={t.rooms.roomName}
            placeholder={t.rooms.roomNamePlaceholder}
            value={roomName}
            onChangeText={setRoomName}
          />
          <Text className="text-xs font-manrope-bold uppercase mb-2 mt-5" style={{ color: theme.textSecondary }}>
            Icon
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            {ROOM_ICON_OPTIONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                className="w-10 h-10 rounded-full justify-center items-center border"
                style={{
                  backgroundColor: selectedIcon === icon ? theme.accent.purple : theme.surface,
                  borderColor: selectedIcon === icon ? theme.text : theme.border,
                }}
                onPress={() => setSelectedIcon(icon)}
              >
                {getRoomIcon(icon, 20, selectedIcon === icon ? "#1C1C1E" : theme.text)}
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>
            {t.budget.color}
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            {ROOM_COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                className="w-8 h-8 rounded-full"
                style={[{ backgroundColor: color }, selectedColor === color && { borderWidth: 2, borderColor: theme.text }]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
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
