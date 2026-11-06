import { Check, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Button from "./button";
import ColorPicker from "./color-picker";
import IconPicker, { type IconOption } from "./icon-picker";
import Input from "./input";
import Modal from "./modal";

interface CategoryFormModalProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  title: string;
  namePlaceholder: string;
  name: string;
  onNameChange: (name: string) => void;
  colors: readonly string[];
  color: string;
  onColorChange: (color: string) => void;
  iconOptions: readonly IconOption<T>[];
  icon: T;
  onIconChange: (icon: T) => void;
  submitLabel: string;
  submitting: boolean;
  onSubmit: () => void;
}

/** Name, color and icon form with a live preview, for anything shown as a colored tile. */
function CategoryFormModal<T extends string>({
  visible,
  onClose,
  title,
  namePlaceholder,
  name,
  onNameChange,
  colors,
  color,
  onColorChange,
  iconOptions,
  icon,
  onIconChange,
  submitLabel,
  submitting,
  onSubmit,
}: CategoryFormModalProps<T>) {
  const { theme } = useTheme();
  const PreviewIcon: LucideIcon | undefined = iconOptions.find((option) => option.value === icon)?.icon;

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <View className="items-center mb-6">
        <View className="w-20 h-20 rounded-3xl justify-center items-center" style={{ backgroundColor: color }}>
          {PreviewIcon && <PreviewIcon size={32} color={theme.onAccent} />}
        </View>
      </View>

      <Input placeholder={namePlaceholder} value={name} onChangeText={onNameChange} />
      <ColorPicker colors={colors} value={color} onChange={onColorChange} className="mb-6" />
      <IconPicker options={iconOptions} value={icon} onChange={onIconChange} selectedColor={color} className="mb-6" />

      <Button
        title={submitLabel}
        icon={<Check size={20} color={theme.background} />}
        onPress={onSubmit}
        disabled={!name.trim() || submitting}
      />
    </Modal>
  );
}

export default CategoryFormModal;
