import type { FC } from "react";
import { CategoryFormModal } from "@/components/ui";
import { PICKER_COLORS } from "@/constants/colors";
import { useI18n } from "@/stores/i18nStore";
import { ROOM_ICON_OPTIONS, type RoomIconId } from "./room-options";

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
  const { t } = useI18n();

  return (
    <CategoryFormModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? t.rooms.editRoom : t.rooms.newRoom}
      namePlaceholder={t.rooms.roomNamePlaceholder}
      name={name}
      onNameChange={onNameChange}
      colors={PICKER_COLORS}
      color={color}
      onColorChange={onColorChange}
      iconOptions={ROOM_ICON_OPTIONS}
      icon={icon}
      onIconChange={onIconChange}
      submitLabel={isEditing ? t.common.save : t.rooms.createRoom}
      submitting={saving}
      onSubmit={onSave}
    />
  );
};

export default RoomFormModal;
