import { Calendar, Repeat } from "lucide-react-native";
import type { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { Badge, Card, Checkbox, Text } from "@/components/ui";
import type { Task } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

interface TaskCardProps {
  task: Task;
  completed: boolean;
  assigneeLabel: string;
  assigneeColor: string;
  dueText: string;
  reminderText: string | null;
  completedDate: string;
  recurrenceLabel?: string;
  onToggle: () => void;
  onPress: () => void;
  onLongPress: () => void;
}

const TaskCard: FC<TaskCardProps> = ({
  task,
  completed,
  assigneeLabel,
  assigneeColor,
  dueText,
  reminderText,
  completedDate,
  recurrenceLabel,
  onToggle,
  onPress,
  onLongPress,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const finishedClass = completed ? "line-through opacity-50" : "";
  const separator = (
    <Text variant="micro" color="secondary">
      •
    </Text>
  );
  const meta = (text: string, color?: string) => (
    <Text variant="caption" color="secondary" className="font-manrope-semibold" style={color ? { color } : undefined}>
      {text}
    </Text>
  );

  return (
    <Card size="md" borderRadius={24}>
      <View className="flex-row items-center gap-4">
        <Checkbox checked={completed} tone="pink" onPress={onToggle} accessibilityLabel={task.name} />

        <TouchableOpacity className="flex-1" onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
          <View className="flex-row items-center gap-2 mb-2">
            <Text variant="heading" className={`flex-1 ${finishedClass}`} numberOfLines={1}>
              {task.name}
            </Text>
            {recurrenceLabel && <Badge label={recurrenceLabel} tone="purple" icon={Repeat} />}
          </View>
          {task.description ? (
            <Text variant="bodySmall" color="secondary" className={`mb-1 ${finishedClass}`} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}
          <View className="flex-row items-center flex-wrap gap-2">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: assigneeColor }} />
            {meta(assigneeLabel)}
            {task.room && (
              <>
                {separator}
                {meta(task.room.name)}
              </>
            )}
            {separator}
            <View className="flex-row items-center gap-1">
              <Calendar size={12} color={theme.textSecondary} />
              {meta(dueText)}
            </View>
            {reminderText && (
              <>
                {separator}
                {meta(`${t.tasks.reminderLabel}: ${reminderText}`)}
              </>
            )}
            {completed && completedDate ? (
              <>
                {separator}
                {meta(`Done: ${completedDate}`, theme.status.success)}
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

export default TaskCard;
