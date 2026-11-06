import type { FC } from "react";
import { Button, ChipMultiSelect, ChipSelect, DateTimeField, Input, Modal, Section } from "@/components/ui";
import type { HomeMembership, Room } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";

export interface TaskFormValues {
  name: string;
  description: string;
  date: Date | null;
  reminderMinutes: string;
  roomId: number | null;
  userIds: number[];
}

interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: () => void;
  values: TaskFormValues;
  onChange: (changes: Partial<TaskFormValues>) => void;
  /** Hides the room choice when empty. */
  rooms?: Room[];
  noRoomLabel?: string;
  /** Hides the assignee choice when empty. */
  memberships?: HomeMembership[];
  minimumDate?: Date;
}

const TaskFormModal: FC<TaskFormModalProps> = ({
  visible,
  onClose,
  title,
  submitLabel,
  submitting,
  onSubmit,
  values,
  onChange,
  rooms = [],
  noRoomLabel,
  memberships = [],
  minimumDate,
}) => {
  const { t } = useI18n();

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <Input
        label={t.tasks.taskName}
        placeholder={t.tasks.taskNamePlaceholder}
        value={values.name}
        onChangeText={(name) => onChange({ name })}
      />
      <Input
        label={t.tasks.description}
        placeholder={t.tasks.descriptionPlaceholder}
        value={values.description}
        onChangeText={(description) => onChange({ description })}
        multiline
        numberOfLines={3}
      />
      <DateTimeField
        label={t.tasks.dueDate}
        placeholder={t.tasks.selectDateTime}
        value={values.date}
        onChange={(date) => onChange({ date })}
        minimumDate={minimumDate}
      />
      <Input
        label={t.tasks.reminderBefore}
        placeholder="30"
        value={values.reminderMinutes}
        onChangeText={(value) => onChange({ reminderMinutes: value.replace(/[^0-9]/g, "") })}
        keyboardType="number-pad"
      />

      {rooms.length > 0 && (
        <Section compact title={t.tasks.room}>
          <ChipSelect<number | null>
            value={values.roomId}
            onChange={(roomId) => onChange({ roomId })}
            options={[
              { value: null, label: noRoomLabel ?? t.common.none },
              ...rooms.map((room) => ({ value: room.id, label: room.name })),
            ]}
          />
        </Section>
      )}

      {memberships.length > 0 && (
        <Section compact title={t.tasks.assignTo}>
          <ChipMultiSelect
            values={values.userIds}
            onChange={(userIds) => onChange({ userIds })}
            options={memberships.map((membership) => ({
              value: membership.userId,
              label: membership.user?.name || `User ${membership.userId}`,
            }))}
          />
        </Section>
      )}

      <Button
        title={submitLabel}
        onPress={onSubmit}
        loading={submitting}
        disabled={!values.name.trim() || submitting}
        variant="yellow"
        className="mt-4"
      />
    </Modal>
  );
};

export default TaskFormModal;
