import { Eye, FileText, Pencil, Users } from "lucide-react-native";
import type { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { Badge, Button, Card, IconTile, InfoRow, ListItem, Modal, Text } from "@/components/ui";
import { formatCurrencyAmount } from "@/lib/currency";
import type { Bill, BillSplit } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";
import { getBillCategoryIcon } from "./budget-utils";
import ReceiptItems from "./receipt-items";

interface BillDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  bill: Bill | null;
  title: string;
  uploaderName: string;
  categoryColor: string;
  currency: string;
  canEdit: boolean;
  getMemberName: (userId: number) => string;
  onViewReceipt: (url: string) => void;
  onEditSplits: () => void;
  onMarkSplitPaid: (split: BillSplit) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const BillDetailsModal: FC<BillDetailsModalProps> = ({
  visible,
  onClose,
  bill,
  title,
  uploaderName,
  categoryColor,
  currency,
  canEdit,
  getMemberName,
  onViewReceipt,
  onEditSplits,
  onMarkSplitPaid,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const splits = bill?.splits ?? [];
  const ocrData = (bill?.ocrData ?? {}) as Record<string, any>;
  const items = Array.isArray(ocrData.items) ? ocrData.items : [];

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      {bill && (
        <View className="gap-5">
          <View className="items-center">
            <IconTile
              icon={getBillCategoryIcon(bill.billCategory?.icon)}
              color={categoryColor}
              size="lg"
              className="mb-3"
            />
            <Text variant="display">{formatCurrencyAmount(bill.totalAmount, currency)}</Text>
            <View className="flex-row items-center gap-2 mt-2">
              <Badge label={bill.public === false ? "Private" : "Home"} />
              <Badge label={bill.isPayed ? t.budget.paid : t.budget.unpaid} />
            </View>
          </View>

          <Card size="sm">
            <InfoRow label={t.budget.category} value={title} />
            <InfoRow label={t.budget.uploadedBy} value={uploaderName} />
            <InfoRow label="Created" value={new Date(bill.createdAt).toLocaleString("pl-PL")} />
            {bill.periodStart && bill.periodEnd && (
              <InfoRow
                label={t.budget.period}
                value={`${new Date(bill.periodStart).toLocaleDateString("pl-PL")} - ${new Date(
                  bill.periodEnd,
                ).toLocaleDateString("pl-PL")}`}
              />
            )}
            {bill.paymentDate && (
              <InfoRow label="Payment date" value={new Date(bill.paymentDate).toLocaleString("pl-PL")} />
            )}
          </Card>

          {bill.description ? (
            <Card size="sm">
              <Text variant="overline" className="mb-2">
                {t.budget.description}
              </Text>
              <Text variant="bodySmall">{bill.description}</Text>
            </Card>
          ) : null}

          {bill.receiptImage && (
            <ListItem
              left={<FileText size={20} color={theme.accent.purple} />}
              title={t.budget.receiptFile}
              subtitle={t.budget.viewReceipt}
              right={<Eye size={18} color={theme.textSecondary} />}
              onPress={() => onViewReceipt(bill.receiptImage as string)}
            />
          )}

          {(ocrData.vendor || ocrData.date || items.length > 0) && (
            <Card size="sm">
              <Text variant="overline" className="mb-1">
                {t.budget.scanResults}
              </Text>
              {ocrData.vendor && <InfoRow label={t.budget.vendor} value={ocrData.vendor} />}
              {ocrData.date && <InfoRow label={t.budget.date} value={ocrData.date} />}
              {items.length > 0 && <ReceiptItems items={items} currency={currency} title={t.budget.items} />}
            </Card>
          )}

          {splits.length > 0 && (
            <Card size="sm">
              <View className="flex-row items-center justify-between gap-2 mb-3">
                <View className="flex-row items-center gap-2 shrink">
                  <Users size={16} color={theme.textSecondary} />
                  <Text variant="overline" className="shrink">
                    {t.budget.splitBetween}
                  </Text>
                </View>
                {canEdit && (
                  <Button
                    title={t.budget.editSplits}
                    icon={<Pencil size={12} color={theme.text} />}
                    size="sm"
                    variant="bordered"
                    onPress={onEditSplits}
                  />
                )}
              </View>
              {splits.map((split) => (
                <View key={split.id} className="flex-row items-center justify-between py-2 gap-3">
                  <View className="flex-row items-center gap-2 flex-1">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: split.paid ? theme.status.success : theme.accent.pink }}
                    />
                    <Text variant="bodySmall" className="shrink">
                      {split.user?.name ?? getMemberName(split.userId)}
                    </Text>
                  </View>
                  <Text variant="label">{formatCurrencyAmount(split.amount, currency)}</Text>
                  {!split.paid && canEdit && (
                    <TouchableOpacity accessibilityRole="button" hitSlop={8} onPress={() => onMarkSplitPaid(split)}>
                      <Badge label={t.budget.markAsPaid} tone="green" />
                    </TouchableOpacity>
                  )}
                  {split.paid && <Badge label={t.budget.paid} tone="green" />}
                </View>
              ))}
            </Card>
          )}

          {canEdit && (
            <View className="flex-row gap-3">
              <Button title={t.common.edit} size="md" variant="secondary" onPress={onEdit} className="flex-1" />
              <Button title={t.common.delete} size="md" variant="danger" onPress={onDelete} className="flex-1" />
            </View>
          )}
        </View>
      )}
    </Modal>
  );
};

export default BillDetailsModal;
