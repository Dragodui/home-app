import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, Check, CircleAlert, Clock3, Repeat, Trash } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  InfoRow,
  Screen,
  ScreenHeader,
  Spinner,
  Text,
  useAlert,
} from "@/components/ui";
import { taskApi } from "@/lib/api";
import type { Task } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);
  const { t } = useI18n();
  const { user } = useAuth();
  const { home, isAdmin } = useHome();
  const { alert } = useAlert();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/tasks");
  }, [router]);

  const loadTask = useCallback(async () => {
    if (!home || !Number.isFinite(taskId)) {
      setLoading(false);
      return;
    }

    try {
      const taskData = await taskApi.getById(home.id, taskId);
      setTask(taskData);
    } catch (error) {
      console.error("Failed to load task details:", error);
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [home, taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useRealtimeRefresh(["TASK"], loadTask);

  const myAssignment = useMemo(
    () => task?.assignments?.find((assignment) => assignment.userId === user?.id),
    [task?.assignments, user?.id],
  );
  const completed = myAssignment?.status === "completed" || task?.assignments?.some((a) => a.status === "completed");

  const dueText = useMemo(() => {
    if (!task?.dueDate) return t.tasks.noDueDate;
    const date = new Date(task.dueDate);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  }, [task?.dueDate, t.tasks.noDueDate]);

  const reminderText = useMemo(() => {
    if (!task?.dueDate) return t.tasks.noReminder;
    if ((task.reminderMinutes ?? 30) === 0) return t.tasks.reminderAtDue;
    return `${task.reminderMinutes ?? 30} ${t.tasks.reminderMinutesSuffix}`;
  }, [task?.dueDate, task?.reminderMinutes, t.tasks.noReminder, t.tasks.reminderAtDue, t.tasks.reminderMinutesSuffix]);

  const assigneesText = useMemo(() => {
    if (!task?.assignments?.length) return t.tasks.unassigned;
    const names = task.assignments.map((assignment) => assignment.user?.name).filter(Boolean) as string[];
    if (names.length === 0) return t.tasks.assigned;
    return names.join(", ");
  }, [task?.assignments, t.tasks.assigned, t.tasks.unassigned]);

  const handleToggleStatus = async () => {
    if (!home || !task || !user || submitting) return;
    setSubmitting(true);
    try {
      if (completed) {
        const assignmentId = myAssignment?.id ?? task.assignments?.find((a) => a.status === "completed")?.id;
        if (!assignmentId) return;
        await taskApi.markUncompleted(home.id, task.id, assignmentId);
      } else {
        await taskApi.completeTask(home.id, task.id);
      }
      await loadTask();
    } catch (error) {
      console.error("Failed to toggle task status:", error);
      alert(t.common.error, completed ? t.tasks.failedToUncomplete : t.tasks.failedToComplete);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!home || !task || submitting) return;

    alert(t.tasks.deleteTask, t.tasks.deleteTaskConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          try {
            await taskApi.delete(home.id, task.id);
            goBack();
          } catch (error) {
            console.error("Failed to delete task:", error);
            alert(t.common.error, t.tasks.failedToDelete);
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen width="md">
        <Spinner fill />
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen width="md">
        <EmptyState
          icon={CircleAlert}
          tone="danger"
          title={t.common.error}
          description="Task not found."
          action={<Button title={t.common.done} onPress={goBack} />}
        />
      </Screen>
    );
  }

  const scheduleLabel = task.schedule
    ? t.tasks.schedule[task.schedule.recurrenceType as keyof typeof t.tasks.schedule] || t.tasks.schedule.scheduled
    : null;

  const nextRunText = task.schedule?.nextRunDate
    ? t.tasks.schedule.nextRun.replace("{date}", new Date(task.schedule.nextRunDate).toLocaleString())
    : null;

  return (
    <Screen width="md">
      <ScreenHeader
        title={`Task #${task.id}`}
        onBack={goBack}
        right={
          isAdmin ? (
            <IconButton icon={Trash} tone="danger" onPress={handleDelete} accessibilityLabel={t.common.delete} />
          ) : undefined
        }
      />

      <Card size="md" className="mb-4">
        <Text variant="title">{task.name || "—"}</Text>
      </Card>

      <Card size="md" className="mb-4">
        <Text variant="overline" className="mb-2">
          {t.tasks.description}
        </Text>
        <Text variant="body">{task.description || "—"}</Text>
      </Card>

      <Card size="md" className="mb-4">
        <InfoRow icon={Calendar} label={t.tasks.dueDate} value={dueText} />
        <InfoRow icon={Clock3} label={t.tasks.assigned} value={assigneesText} />
        <InfoRow
          icon={Check}
          label="Status"
          value={<Badge label={completed ? "Completed" : "Pending"} tone={completed ? "green" : "danger"} />}
        />
        {task.room && <InfoRow label={t.tasks.room} value={task.room.name} />}
        {scheduleLabel && <InfoRow icon={Repeat} label={t.tasks.schedule.title} value={scheduleLabel} />}
        {nextRunText && <InfoRow icon={Clock3} label={t.tasks.schedule.title} value={nextRunText} />}
        <InfoRow label={t.tasks.reminderLabel} value={reminderText} />
      </Card>

      <Button
        title={completed ? "Undo complete" : t.tasks.complete}
        onPress={handleToggleStatus}
        loading={submitting}
      />
    </Screen>
  );
}
