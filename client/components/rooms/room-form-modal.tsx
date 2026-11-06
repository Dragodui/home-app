import { Check } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { Button, ColorPicker, IconPicker, Input, Modal } from "@/components/ui";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";
import { getRoomIcon, ROOM_COLOR_OPTIONS, ROOM_ICON_OPTIONS, type RoomIconId } from "./room-options";

interface RoomFormModalProps {
  visible: boolean;
  isEditing: boolean;
  name: string;
  color: string;
  icon: RoomIconId;
  saving: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onIconChange: (icon: RoomIconId) => void;
  onSave: () => void;
  onClose: () => void;
}

const RoomFormModal: FC<RoomFormModalProps> = ({
  visible,
  isEditing,
  name,
  color,
  icon,
  saving,
  onNameChange,
  onColorChange,
  onIconChange,
  onSave,
  onClose,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const PreviewIcon = getRoomIcon(icon);

  return (
    <Modal visible={visible} onClose={onClose} title={isEditing ? t.rooms.editRoom : t.rooms.newRoom}>
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-3xl justify-center items-center" style={{ backgroundColor: color }}>
          <PreviewIcon size={32} color={theme.onAccent} />
        </View>
      </View>

      <Input placeholder={t.rooms.roomNamePlaceholder} value={name} onChangeText={onNameChange} />

      <ColorPicker colors={ROOM_COLOR_OPTIONS} value={color} onChange={onColorChange} className="mb-6" />

      <IconPicker
        options={ROOM_ICON_OPTIONS}
        value={icon}
        onChange={onIconChange}
        selectedColor={color}
        className="mb-6"
      />

      <Button
        title={isEditing ? t.common.save : t.rooms.createRoom}
        icon={<Check size={20} color={theme.background} />}
        onPress={onSave}
        disabled={!name.trim() || saving}
      />
    </Modal>
  );
};

export default RoomFormModal;
