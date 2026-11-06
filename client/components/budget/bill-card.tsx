import { Shield, Users } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { Badge, Card, IconTile, Text } from "@/components/ui";
import { formatCurrencyAmount } from "@/lib/currency";
import type { Bill } from "@/lib/types";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";
import { getBillCategoryIcon } from "./budget-utils";

interface BillCardProps {
  bill: Bill;
  title: string;
  uploaderName: string;
  categoryColor: string;
  currency: string;
  onPress: () => void;
  onLongPress: () => void;
}

const BillCard: FC<BillCardProps> = ({ bill, title, uploaderName, categoryColor, currency, onPress, onLongPress }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const splits = bill.splits || [];
  const userSplit = splits.find((split) => split.userId === user?.id);

  return (
    <Card size="sm" onPress={onPress} onLongPress={onLongPress}>
      <View className="flex-row items-center gap-3">
        <IconTile icon={getBillCategoryIcon(bill.billCategory?.icon)} color={categoryColor} />
        <View className="flex-1">
          <Text variant="subtitle" className="mb-0.5" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {uploaderName} · {new Date(bill.createdAt).toLocaleDateString("pl-PL")}
          </Text>
          {bill.public === false && <Badge label={t.budget.private} icon={Shield} className="self-start mt-1" />}
        </View>
        <View className="items-end shrink">
          <Text variant="heading" className="mb-0.5">
            {formatCurrencyAmount(bill.totalAmount, currency)}
          </Text>
          {userSplit && (
            <Text
              variant="caption"
              className="text-right"
              style={{ color: userSplit.paid ? theme.status.success : theme.accent.pink }}
            >
              {t.budget.yourShare}: {formatCurrencyAmount(userSplit.amount, currency)}
            </Text>
          )}
        </View>
      </View>

      {splits.length > 0 && (
        <View className="flex-row items-center mt-2 gap-1">
          <Users size={12} color={theme.textSecondary} />
          <Text variant="caption" color="secondary">
            {splits.length} {splits.length === 1 ? "split" : "splits"} · {splits.filter((split) => split.paid).length}{" "}
            {t.budget.paid.toLowerCase()}
          </Text>
        </View>
      )}
    </Card>
  );
};

export default BillCard;
