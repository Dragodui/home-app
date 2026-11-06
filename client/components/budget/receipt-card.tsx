import { ChevronDown, ChevronUp, Eye, Receipt } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { Button, Card, IconTile, Text } from "@/components/ui";
import { formatCurrencyAmount } from "@/lib/currency";
import type { Bill } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";
import ReceiptItems from "./receipt-items";

interface ReceiptCardProps {
  bill: Bill;
  fallbackTitle: string;
  currency: string;
  expanded: boolean;
  onToggle: () => void;
  onViewReceipt: (url: string) => void;
}

const ReceiptCard: FC<ReceiptCardProps> = ({ bill, fallbackTitle, currency, expanded, onToggle, onViewReceipt }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const data = bill.ocrData as Record<string, any>;
  const items = data.items || [];
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <Card size="sm" onPress={onToggle}>
      <View className="flex-row items-center gap-3">
        <IconTile icon={Receipt} tone="yellow" />
        <View className="flex-1">
          <Text variant="subtitle" className="mb-0.5" numberOfLines={1}>
            {data.vendor || fallbackTitle}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {data.date || new Date(bill.createdAt).toLocaleDateString("pl-PL")}
            {items.length > 0 && ` • ${items.length} ${t.budget.items.toLowerCase()}`}
          </Text>
        </View>
        <Text variant="heading">{formatCurrencyAmount(bill.totalAmount, currency)}</Text>
        <Chevron size={18} color={theme.textSecondary} />
      </View>

      {expanded && items.length > 0 && <ReceiptItems items={items} currency={currency} />}
      {expanded && bill.receiptImage && (
        <Button
          title={t.budget.viewReceipt}
          icon={<Eye size={16} color={theme.text} />}
          size="md"
          variant="bordered"
          className="mt-3"
          onPress={() => onViewReceipt(bill.receiptImage as string)}
        />
      )}
    </Card>
  );
};

export default ReceiptCard;
