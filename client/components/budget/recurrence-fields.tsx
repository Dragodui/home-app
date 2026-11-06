import { Repeat } from "lucide-react-native";
import type { FC } from "react";
import { ChipSelect, ListItem, Section, SegmentedControl, Switch } from "@/components/ui";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";
import { type BillRecurrenceType, MONTHLY_RECURRENCE_DAYS, WEEKLY_RECURRENCE_DAYS } from "./budget-utils";

interface RecurrenceFieldsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  type: BillRecurrenceType;
  onTypeChange: (type: BillRecurrenceType) => void;
  day: number;
  onDayChange: (day: number) => void;
}

const RecurrenceFields: FC<RecurrenceFieldsProps> = ({
  enabled,
  onEnabledChange,
  type,
  onTypeChange,
  day,
  onDayChange,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <>
      <ListItem
        left={<Repeat size={18} color={theme.textSecondary} />}
        title={t.budget.regularExpense}
        subtitle={t.budget.regularExpenseHint}
        right={<Switch value={enabled} onValueChange={onEnabledChange} />}
        className="mb-4"
      />

      {enabled && (
        <Section compact title={t.budget.repeat}>
          <SegmentedControl<BillRecurrenceType>
            value={type}
            className="mb-3"
            onChange={(next) => {
              onTypeChange(next);
              if (next === "weekly") onDayChange(new Date().getDay());
              if (next === "monthly") onDayChange(new Date().getDate());
            }}
            options={[
              { value: "daily", label: t.tasks.schedule.daily },
              { value: "weekly", label: t.tasks.schedule.weekly },
              { value: "monthly", label: t.tasks.schedule.monthly },
            ]}
          />
          {type === "weekly" && <ChipSelect options={WEEKLY_RECURRENCE_DAYS} value={day} onChange={onDayChange} />}
          {type === "monthly" && <ChipSelect options={MONTHLY_RECURRENCE_DAYS} value={day} onChange={onDayChange} />}
        </Section>
      )}
    </>
  );
};

export default RecurrenceFields;
