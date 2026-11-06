import { Trash2 } from "lucide-react-native";
import type { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { Checkbox, Text } from "@/components/ui";
import type { ShoppingItem } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}

const ShoppingItemRow: FC<ShoppingItemRowProps> = ({ item, onToggle, onLongPress, onDelete }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      className="flex-row items-center gap-4 py-2"
      onPress={onToggle}
      onLongPress={onLongPress}
      activeOpacity={0.95}
    >
      <Checkbox checked={item.isBought} />
      <View className="flex-1">
        <Text variant="heading" className={`font-manrope-semibold ${item.isBought ? "line-through opacity-50" : ""}`}>
          {item.name}
        </Text>
        {item.user?.name && (
          <Text variant="caption" color="secondary" className={`mt-0.5 ${item.isBought ? "opacity-50" : ""}`}>
            {t.shopping.addedByUser}: {item.user.name}
          </Text>
        )}
      </View>
      {item.isBought && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t.common.delete}
          className="p-2"
          hitSlop={8}
          onPress={onDelete}
        >
          <Trash2 size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default ShoppingItemRow;
