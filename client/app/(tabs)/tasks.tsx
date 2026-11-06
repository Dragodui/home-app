import { useRouter } from "expo-router";
import { CheckCircle, Plus } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { TasksSkeleton } from "@/components/skeletons";
import TaskCard from "@/components/tasks/task-card";
import TaskFormModal, { type TaskFormValues } from "@/components/tasks/task-form-modal";
import TaskScheduleModal, { type RecurrenceType } from "@/components/tasks/task-schedule-modal";
import {
  ActionSheet,
  Button,
  ChipSelect,
  EmptyState,
  Fab,
  ResponsiveGrid,
  type SheetAction,
  TabHeader,
  TabScreen,
  Text,
  useAlert,
} from "@/components/ui";
import { userColors } from "@/constants/colors";
import { taskApi, taskScheduleApi } from "@/lib/api";
import type { Task, TaskAssignment } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";

type FilterType = "All" | "My" | "By Room" | "Completed";

const EMPTY_TASK_FORM: TaskFormValues = {
  name: "",
  description: "",
  date: null,
  reminderMinutes: "30",
  roomId: null,
  userIds: [],
};

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { home, rooms, isAdmin } = useHome();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [creating, setCreating] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTaskId, setScheduleTaskId] = useState<number | null>(null);
  const [scheduleRecurrence, setScheduleRecurrence] = useState<RecurrenceType>("daily");
  const [scheduleUserIds, setScheduleUserIds] = useState<number[]>([]);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [selectedTaskForActions, setSelectedTaskForActions] = useState<Task | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [editTaskOriginalAssignments, setEditTaskOriginalAssignments] = useState<TaskAssignment[]>([]);
  const [savingEditTask, setSavingEditTask] = useState(false);

  const parseReminderMinutes = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 30;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 0) return 30;
    return parsed;
  };

  const loadTasks = useCallback(async () => {
    if (!home || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const [tasksData, assignmentsData] = await Promise.all([
        taskApi.getByHomeId(home.id),
        taskApi.getUserAssignments(home.id, user.id).catch(() => []),
      ]);

      setTasks(tasksData || []);
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home, user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useRealtimeRefresh(["TASK"], loadTasks);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleDelete = (taskId: number) => {
    if (!home) return;

    alert(t.tasks.deleteTask, t.tasks.deleteTaskConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await taskApi.delete(home.id, taskId);
            await loadTasks();
          } catch (error) {
            console.error(error);
            alert(t.common.error, t.tasks.failedToDelete);
          }
        },
      },
    ]);
  };

  const handleToggleTask = async (task: Task) => {
    if (!home || !user) return;

    const completed = isTaskCompleted(task);

    if (completed) {
      let assignmentId = task.assignments?.find((a) => a.userId === user.id)?.id;
      if (!assignmentId) {
        assignmentId = assignments.find((a) => a.taskId === task.id && a.userId === user.id)?.id;
      }

      if (assignmentId) {
        try {
          await taskApi.markUncompleted(home.id, task.id, assignmentId);
          await loadTasks();
        } catch (error) {
          console.error("Error uncompleting task:", error);
          alert(t.common.error, t.tasks.failedToUncomplete);
        }
      }
    } else {
      alert(t.tasks.completeTask, t.tasks.completeTaskConfirm, [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.tasks.complete,
          onPress: async () => {
            try {
              await taskApi.completeTask(home.id, task.id);
              await loadTasks();
            } catch (error) {
              console.error("Error completing task:", error);
              alert(t.common.error, t.tasks.failedToComplete);
            }
          },
        },
      ]);
    }
  };

  const handleCreateTask = async () => {
    if (!home || !createForm.name.trim()) return;

    setCreating(true);
    try {
      await taskApi.create(home.id, {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        scheduleType: "once",
        dueDate: createForm.date ? createForm.date.toISOString() : undefined,
        reminderMinutes: parseReminderMinutes(createForm.reminderMinutes),
        homeId: home.id,
        roomId: createForm.roomId || undefined,
        assignUserIds: createForm.userIds.length > 0 ? createForm.userIds : undefined,
      });

      setCreateForm(EMPTY_TASK_FORM);
      setShowCreateModal(false);
      await loadTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      alert(t.common.error, t.tasks.couldNotCreate);
    } finally {
      setCreating(false);
    }
  };

  // Schedule handlers
  const handleOpenScheduleModal = (taskId: number) => {
    setScheduleTaskId(taskId);
    setScheduleRecurrence("daily");
    setScheduleUserIds([]);
    setShowScheduleModal(true);
  };

  const openTaskActions = (task: Task) => {
    setSelectedTaskForActions(task);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTaskId(task.id);
    const activeAssignments = (task.assignments || []).filter((a) => a.status !== "completed");
    setEditTaskOriginalAssignments(activeAssignments);
    setEditForm({
      name: task.name || "",
      description: task.description || "",
      roomId: task.roomId ?? null,
      date: task.dueDate ? new Date(task.dueDate) : null,
      reminderMinutes: String(task.reminderMinutes ?? 30),
      userIds: activeAssignments.map((a) => a.userId),
    });
    setShowEditTaskModal(true);
  };

  const handleSaveTaskEdit = async () => {
    if (!home || !editingTaskId || !editForm.name.trim()) return;
    setSavingEditTask(true);
    try {
      await taskApi.update(home.id, editingTaskId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        roomId: editForm.roomId || undefined,
        dueDate: editForm.date ? editForm.date.toISOString() : undefined,
        reminderMinutes: parseReminderMinutes(editForm.reminderMinutes),
      });

      const originalUserIds = editTaskOriginalAssignments.map((a) => a.userId);
      const userIdsToAssign = editForm.userIds.filter((id) => !originalUserIds.includes(id));
      const assignmentsToRemove = editTaskOriginalAssignments.filter((a) => !editForm.userIds.includes(a.userId));
      const assignDate = (editForm.date ?? new Date()).toISOString();

      await Promise.all([
        ...userIdsToAssign.map((userId) => taskApi.assignUser(home.id, editingTaskId, userId, assignDate)),
        ...assignmentsToRemove.map((a) => taskApi.deleteAssignment(home.id, editingTaskId, a.id)),
      ]);

      setShowEditTaskModal(false);
      setEditingTaskId(null);
      await loadTasks();
    } catch (error) {
      console.error("Error editing task:", error);
      alert(t.common.error, t.tasks.failedToUpdate);
    } finally {
      setSavingEditTask(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!home || !scheduleTaskId || scheduleUserIds.length === 0) return;

    setCreatingSchedule(true);
    try {
      await taskScheduleApi.create(home.id, {
        taskId: scheduleTaskId,
        homeId: home.id,
        recurrenceType: scheduleRecurrence,
        userIds: scheduleUserIds,
      });

      setShowScheduleModal(false);
      setScheduleTaskId(null);
      setScheduleUserIds([]);
      await loadTasks();
    } catch (error) {
      console.error("Error creating schedule:", error);
      alert(t.common.error, t.tasks.schedule.failedToCreate);
    } finally {
      setCreatingSchedule(false);
    }
  };

  const handleDeleteSchedule = (task: Task) => {
    if (!home || !task.schedule) return;

    alert(t.tasks.schedule.deleteSchedule, t.tasks.schedule.deleteScheduleConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await taskScheduleApi.delete(home.id, task.schedule!.id);
            await loadTasks();
          } catch (error) {
            console.error(error);
            alert(t.common.error, t.tasks.schedule.failedToDelete);
          }
        },
      },
    ]);
  };

  const getRecurrenceLabel = (type: string) => {
    switch (type) {
      case "daily":
        return t.tasks.schedule.daily;
      case "weekly":
        return t.tasks.schedule.weekly;
      case "monthly":
        return t.tasks.schedule.monthly;
      default:
        return type;
    }
  };

  const getFilteredTasks = () => {
    const completedTasks = tasks.filter((task) => isTaskCompleted(task));
    const activeTasks = tasks.filter((task) => !isTaskCompleted(task));

    if (activeFilter === "Completed") {
      return completedTasks;
    }

    if (activeFilter === "My") {
      const myTaskIds = assignments.map((a) => a.taskId);
      return activeTasks.filter((task) => myTaskIds.includes(task.id));
    }

    return activeTasks;
  };

  // For a recurring task, assignments pile up across rotation cycles - the
  // most recent one (by assignedDate, falling back to id) is the one that
  // reflects the current cycle, not whichever happens to be first in the array.
  const getLatestAssignment = (assignmentsList: TaskAssignment[], userId?: number) => {
    const pool = userId != null ? assignmentsList.filter((a) => a.userId === userId) : assignmentsList;
    if (pool.length === 0) return undefined;
    return pool.reduce((latest, current) => {
      const latestTime = new Date(latest.assignedDate).getTime() || latest.id;
      const currentTime = new Date(current.assignedDate).getTime() || current.id;
      return currentTime >= latestTime ? current : latest;
    });
  };

  const isTaskCompleted = (task: Task) => {
    if (task.assignments && task.assignments.length > 0) {
      const userAssignment = getLatestAssignment(task.assignments, user?.id);
      if (userAssignment) return userAssignment.status === "completed";
      return getLatestAssignment(task.assignments)?.status === "completed";
    }
    const assignment = assignments.find((a) => a.taskId === task.id);
    return assignment?.status === "completed";
  };

  const getTaskAssignee = (task: Task) => {
    if (task.assignments && task.assignments.length > 0) {
      if (task.schedule) {
        // Recurring task: only the current cycle's assignee is relevant.
        const current = getLatestAssignment(task.assignments);
        return current?.user?.name || t.tasks.assigned;
      }
      const firstName = task.assignments[0].user?.name || t.tasks.assigned;
      if (task.assignments.length > 1) {
        return `${firstName} +${task.assignments.length - 1}`;
      }
      return firstName;
    }
    return t.tasks.unassigned;
  };

  const getTaskDueText = (task: Task) => {
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    }
    return t.tasks.noDueDate;
  };

  const getReminderText = (task: Task) => {
    if (!task.dueDate) return null;
    if (task.reminderMinutes === 0) return t.tasks.reminderAtDue;
    return `${task.reminderMinutes} ${t.tasks.reminderMinutesSuffix}`;
  };

  const getTaskCompletedDate = (task: Task) => {
    let assignment = task.assignments ? getLatestAssignment(task.assignments, user?.id) : undefined;
    if (!assignment) {
      assignment = assignments.find((a) => a.taskId === task.id && a.userId === user?.id);
    }
    if (!assignment && task.assignments) {
      assignment = getLatestAssignment(task.assignments.filter((a) => a.status === "completed"));
    }

    if (assignment?.completeDate) {
      const date = new Date(assignment.completeDate);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    }
    return "";
  };

  const getMyTasksCount = () => {
    const myTaskIds = assignments.map((a) => a.taskId);
    return tasks.filter((t) => myTaskIds.includes(t.id)).length;
  };

  const filteredTasks = getFilteredTasks();
  const selectedTask = selectedTaskForActions;
  const taskActions: SheetAction[] = selectedTask
    ? [
        {
          label: t.common.open,
          onPress: () => router.push({ pathname: "/tasks/[id]", params: { id: String(selectedTask.id) } }),
        },
        { label: t.common.edit, onPress: () => openEditTaskModal(selectedTask) },
        ...(isAdmin && !selectedTask.schedule
          ? [{ label: t.tasks.schedule.create, onPress: () => handleOpenScheduleModal(selectedTask.id) }]
          : []),
        ...(isAdmin && selectedTask.schedule
          ? [{ label: t.tasks.schedule.deleteAction, onPress: () => handleDeleteSchedule(selectedTask) }]
          : []),
        { label: t.common.delete, destructive: true, onPress: () => handleDelete(selectedTask.id) },
      ]
    : [];

  if (isLoading) {
    return <TasksSkeleton />;
  }

  return (
    <TabScreen
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={
        <Fab
          icon={Plus}
          tone="purple"
          aboveTabBar
          onPress={() => setShowCreateModal(true)}
          accessibilityLabel={t.tasks.newTask}
        />
      }
    >
      <TabHeader title={t.tasks.title}>
        <Text variant="body" color="secondary" className="mt-1">
          {interpolate(t.tasks.assignedToYou, { count: getMyTasksCount() })}
        </Text>
      </TabHeader>

      <ChipSelect<FilterType>
        value={activeFilter}
        onChange={setActiveFilter}
        className="mb-6"
        options={[
          { value: "All", label: t.tasks.filters.all },
          { value: "My", label: t.tasks.filters.my },
          { value: "By Room", label: t.tasks.filters.byRoom },
          { value: "Completed", label: t.tasks.filters.completed },
        ]}
      />

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={t.tasks.noTasks}
          description={t.tasks.noTasksHint}
          action={<Button title={t.tasks.newTask || "Create Task"} onPress={() => setShowCreateModal(true)} />}
        />
      ) : (
        <ResponsiveGrid>
          {filteredTasks.map((task, index) => {
            const completed = isTaskCompleted(task);

            return (
              <TaskCard
                key={task.id}
                task={task}
                completed={completed}
                assigneeLabel={getTaskAssignee(task)}
                assigneeColor={userColors[index % userColors.length]}
                dueText={getTaskDueText(task)}
                reminderText={getReminderText(task)}
                completedDate={completed ? getTaskCompletedDate(task) : ""}
                recurrenceLabel={task.schedule ? getRecurrenceLabel(task.schedule.recurrenceType) : undefined}
                onToggle={() => handleToggleTask(task)}
                onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: String(task.id) } })}
                onLongPress={() => openTaskActions(task)}
              />
            );
          })}
        </ResponsiveGrid>
      )}

      <TaskFormModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t.tasks.newTask}
        submitLabel={t.tasks.createTask}
        submitting={creating}
        onSubmit={handleCreateTask}
        values={createForm}
        onChange={(changes) => setCreateForm((form) => ({ ...form, ...changes }))}
        rooms={rooms}
        memberships={home?.memberships}
        minimumDate={new Date()}
      />

      <ActionSheet
        visible={!!selectedTaskForActions}
        onClose={() => setSelectedTaskForActions(null)}
        title={selectedTaskForActions?.name || "Task actions"}
        cancelLabel={t.common.cancel}
        actions={taskActions}
      />

      <TaskFormModal
        visible={showEditTaskModal}
        onClose={() => {
          setShowEditTaskModal(false);
          setEditingTaskId(null);
        }}
        title={t.tasks.editTask}
        submitLabel={t.common.save}
        submitting={savingEditTask}
        onSubmit={handleSaveTaskEdit}
        values={editForm}
        onChange={(changes) => setEditForm((form) => ({ ...form, ...changes }))}
        rooms={rooms}
        noRoomLabel={t.tasks.noRoom}
        memberships={home?.memberships}
      />

      <TaskScheduleModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        recurrence={scheduleRecurrence}
        onRecurrenceChange={setScheduleRecurrence}
        memberships={home?.memberships}
        userIds={scheduleUserIds}
        onUserIdsChange={setScheduleUserIds}
        submitting={creatingSchedule}
        onSubmit={handleCreateSchedule}
      />
    </TabScreen>
  );
}
