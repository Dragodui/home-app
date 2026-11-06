import type { FC } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { formatCurrencyAmount } from "@/lib/currency";
import { useTheme } from "@/stores/themeStore";

interface ReceiptItemsProps {
  items: { name: string; quantity: number; price?: number }[];
  currency: string;
  title?: string;
}

/** Line items of a scanned receipt, separated from the content above. */
const ReceiptItems: FC<ReceiptItemsProps> = ({ items, currency, title }) => {
  const { theme } = useTheme();

  return (
    <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
      {title && (
        <Text variant="overline" className="mb-2">
          {title}
        </Text>
      )}
      {items.map((item, index) => (
        <View key={`${item.name}-${index}`} className="flex-row justify-between gap-3 py-1.5">
          <Text variant="bodySmall" className="flex-1">
            {item.name}
            {item.quantity > 1 && (
              <Text variant="bodySmall" color="secondary">
                {" "}
                x{item.quantity}
              </Text>
            )}
          </Text>
          <Text variant="label">{formatCurrencyAmount(item.price || 0, currency)}</Text>
        </View>
      ))}
    </View>
  );
};

export default ReceiptItems;
