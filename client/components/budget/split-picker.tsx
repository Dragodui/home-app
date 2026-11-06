import type { FC } from "react";
import { View } from "react-native";
import { Card, ChipMultiSelect, InfoRow, Input, Section, SegmentedControl, Text } from "@/components/ui";
import { formatCurrencyAmount } from "@/lib/currency";
import type { HomeMembership } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import type { SplitMode } from "./budget-utils";

interface SplitPickerProps {
  members: HomeMembership[];
  currency: string;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  amounts: Record<number, string>;
  onAmountsChange: (amounts: Record<number, string>) => void;
  totalAmount: number;
}

const SplitPicker: FC<SplitPickerProps> = ({
  members,
  currency,
  selectedIds,
  onSelectedIdsChange,
  mode,
  onModeChange,
  amounts,
  onAmountsChange,
  totalAmount,
}) => {
  const { t } = useI18n();
  const getMemberName = (userId: number) =>
    members.find((member) => member.userId === userId)?.user?.name ?? `User #${userId}`;

  return (
    <Section compact title={t.budget.splitBetween}>
      <ChipMultiSelect
        values={selectedIds}
        onChange={onSelectedIdsChange}
        className="mb-3"
        options={members.map((member) => ({
          value: member.userId,
          label: member.user?.name ?? `User #${member.userId}`,
        }))}
      />

      {selectedIds.length > 0 && (
        <>
          <SegmentedControl<SplitMode>
            value={mode}
            onChange={onModeChange}
            className="mb-3"
            options={[
              { value: "equal", label: t.budget.equalSplit },
              { value: "manual", label: t.budget.manualSplit },
            ]}
          />

          {mode === "equal" && totalAmount > 0 && (
            <Card size="sm">
              {selectedIds.map((userId) => (
                <InfoRow
                  key={userId}
                  label={getMemberName(userId)}
                  value={formatCurrencyAmount(totalAmount / selectedIds.length, currency)}
                />
              ))}
            </Card>
          )}

          {mode === "manual" &&
            selectedIds.map((userId) => {
              const otherIds = selectedIds.filter((id) => id !== userId);
              const otherSum = otherIds.reduce((sum, id) => sum + (parseFloat(amounts[id] || "0") || 0), 0);
              const allOthersFilled =
                otherIds.length > 0 && otherIds.every((id) => amounts[id] && parseFloat(amounts[id]) > 0);
              const isLastEmpty = !amounts[userId] && allOthersFilled && totalAmount > 0;
              const autoValue = isLastEmpty ? Math.max(0, totalAmount - otherSum).toFixed(2) : "";

              return (
                <View key={userId} className="flex-row items-start gap-3">
                  <Text variant="bodySmall" className="flex-1 mt-5">
                    {getMemberName(userId)}
                  </Text>
                  <View className="w-32">
                    <Input
                      placeholder={autoValue || "0.00"}
                      value={amounts[userId] || ""}
                      onChangeText={(value) => {
                        const newAmounts = { ...amounts, [userId]: value };
                        // Auto-fill the last empty field
                        const remaining = selectedIds.filter((id) => id !== userId && !newAmounts[id]);
                        if (remaining.length === 1 && totalAmount > 0) {
                          const filledSum = selectedIds
                            .filter((id) => id !== remaining[0])
                            .reduce((sum, id) => sum + (parseFloat(newAmounts[id] || "0") || 0), 0);
                          const remainder = Math.max(0, totalAmount - filledSum);
                          if (remainder > 0) {
                            newAmounts[remaining[0]] = remainder.toFixed(2);
                          }
                        }
                        onAmountsChange(newAmounts);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              );
            })}
        </>
      )}
    </Section>
  );
};

export default SplitPicker;
