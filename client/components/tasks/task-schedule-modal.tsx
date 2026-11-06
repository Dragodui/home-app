import { X } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { Button, ListItem, Modal, Section, SegmentedControl, Text } from "@/components/ui";
import type { HomeMembership } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export type RecurrenceType = "daily" | "weekly" | "monthly";

interface TaskScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  recurrence: RecurrenceType;
  onRecurrenceChange: (recurrence: RecurrenceType) => void;
  memberships?: HomeMembership[];
  userIds: number[];
  onUserIdsChange: (userIds: number[]) => void;
  submitting: boolean;
  onSubmit: () => void;
}

const TaskScheduleModal: FC<TaskScheduleModalProps> = ({
  visible,
  onClose,
  recurrence,
  onRecurrenceChange,
  memberships = [],
  userIds,
  onUserIdsChange,
  submitting,
  onSubmit,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Modal visible={visible} onClose={onClose} title={t.tasks.schedule.create}>
      <Section compact title={t.tasks.schedule.recurrence}>
        <SegmentedControl<RecurrenceType>
          value={recurrence}
          onChange={onRecurrenceChange}
          options={[
            { value: "daily", label: t.tasks.schedule.daily },
            { value: "weekly", label: t.tasks.schedule.weekly },
            { value: "monthly", label: t.tasks.schedule.monthly },
          ]}
        />
      </Section>

      {memberships.length > 0 && (
        <Section compact title={t.tasks.schedule.rotationUsers}>
          <Text variant="caption" color="muted" className="mb-3 ml-1">
            {t.tasks.schedule.rotationHint}
          </Text>
          <View className="gap-2">
            {memberships.map((membership) => {
              const orderIndex = userIds.indexOf(membership.userId);
              const isSelected = orderIndex !== -1;

              return (
                <ListItem
                  key={membership.userId}
                  title={membership.user?.name || `User ${membership.userId}`}
                  selected={isSelected}
                  left={
                    isSelected ? (
                      <View className="w-6 h-6 rounded-full justify-center items-center bg-black/10">
                        <Text variant="caption" className="font-manrope-bold" style={{ color: theme.onFill }}>
                          {orderIndex + 1}
                        </Text>
                      </View>
                    ) : undefined
                  }
                  right={isSelected ? <X size={16} color={theme.onFill} /> : undefined}
                  showChevron={false}
                  onPress={() =>
                    onUserIdsChange(
                      isSelected ? userIds.filter((id) => id !== membership.userId) : [...userIds, membership.userId],
                    )
                  }
                />
              );
            })}
          </View>
          {userIds.length === 0 && (
            <Text variant="caption" color="danger" className="mt-2 ml-1">
              {t.tasks.schedule.selectUsers}
            </Text>
          )}
        </Section>
      )}

      <Button
        title={t.tasks.schedule.create}
        onPress={onSubmit}
        loading={submitting}
        disabled={userIds.length === 0 || submitting}
        variant="purple"
        className="mt-4"
      />
    </Modal>
  );
};

export default TaskScheduleModal;
