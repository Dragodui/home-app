import { useRouter } from "expo-router";
import { ArrowRight, Calendar, Check, Plus, Repeat, Trash, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TasksSkeleton } from "@/components/skeletons";
import { useAlert } from "@/components/ui/alert";
import Button from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { userColors } from "@/constants/colors";
import { taskApi, taskScheduleApi } from "@/lib/api";
import type { Task, TaskAssignment } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

type FilterType = "All" | "My" | "By Room";
type RecurrenceType = "daily" | "weekly" | "monthly";

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { home, rooms, isAdmin } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTaskId, setScheduleTaskId] = useState<number | null>(null);
  const [scheduleRecurrence, setScheduleRecurrence] = useState<RecurrenceType>("daily");
  const [scheduleUserIds, setScheduleUserIds] = useState<number[]>([]);
  const [creatingSchedule, setCreatingSchedule] = useState(false);

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

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirmDate = (date: Date) => {
    setSelectedDate(date);
    hideDatePicker();
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
    if (!home || !newTaskName.trim()) return;

    setCreating(true);
    try {
      await taskApi.create(home.id, {
        name: newTaskName.trim(),
        description: newTaskDescription.trim(),
        scheduleType: "once",
        dueDate: selectedDate ? selectedDate.toISOString() : undefined,
        homeId: home.id,
        roomId: selectedRoomId || undefined,
        assignUserIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      });

      setNewTaskName("");
      setNewTaskDescription("");
      setSelectedDate(null);
      setSelectedRoomId(null);
      setSelectedUserIds([]);
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

  const handleCreateSchedule = async () => {
    if (!home || !scheduleTaskId || scheduleUserIds.length < 2) return;

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
    if (activeFilter === "My") {
      const myTaskIds = assignments.map((a) => a.taskId);
      return tasks.filter((t) => myTaskIds.includes(t.id));
    }
    return tasks;
  };

  const isTaskCompleted = (task: Task) => {
    if (task.assignments && task.assignments.length > 0) {
      const userAssignment = task.assignments.find((a) => a.userId === user?.id);
      if (userAssignment) return userAssignment.status === "completed";
      return task.assignments.some((a) => a.status === "completed");
    }
    const assignment = assignments.find((a) => a.taskId === task.id);
    return assignment?.status === "completed";
  };

  const getTaskAssignee = (task: Task) => {
    if (task.assignments && task.assignments.length > 0) {
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
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return t.tasks.noDueDate;
  };

  const getTaskCompletedDate = (task: Task) => {
    let assignment = task.assignments?.find((a) => a.userId === user?.id);
    if (!assignment) {
      assignment = assignments.find((a) => a.taskId === task.id && a.userId === user?.id);
    }
    if (!assignment && task.assignments) {
      assignment = task.assignments.find((a) => a.status === "completed");
    }

    if (assignment?.completeDate) {
      const date = new Date(assignment.completeDate);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return "";
  };

  const getMyTasksCount = () => {
    const myTaskIds = assignments.map((a) => a.taskId);
    return tasks.filter((t) => myTaskIds.includes(t.id)).length;
  };

  const renderTaskItem = (task: Task, index: number) => {
    const completed = isTaskCompleted(task);
    const colorIndex = index % userColors.length;
    const completedDate = completed ? getTaskCompletedDate(task) : "";
    const hasSchedule = !!task.schedule;
    return (
      <View key={task.id} className="rounded-24 p-5" style={{ backgroundColor: theme.surface }}>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            className="flex-1 flex-row items-center gap-4"
            onPress={() => handleToggleTask(task)}
            activeOpacity={0.7}
          >
            <View
              className="w-8 h-8 rounded-16 border-2 justify-center items-center"
              style={[
                { borderColor: theme.textSecondary },
                completed && { backgroundColor: theme.accent.pink, borderColor: theme.accent.pink },
              ]}
            >
              {completed && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-2">
                <Text
                  className={`text-lg font-manrope-bold flex-1 ${completed ? "line-through opacity-50" : ""}`}
                  style={{ color: theme.text }}
                  numberOfLines={1}
                >
                  {task.name}
                </Text>
                {hasSchedule && (
                  <View
                    className="px-2 py-0.5 rounded-full flex-row items-center gap-1"
                    style={{ backgroundColor: `${theme.accent.purple}20` }}
                  >
                    <Repeat size={10} color={theme.accent.purple} />
                    <Text className="text-[10px] font-manrope-bold" style={{ color: theme.accent.purple }}>
                      {getRecurrenceLabel(task.schedule!.recurrenceType)}
                    </Text>
                  </View>
                )}
              </View>
              {task.description ? (
                <Text
                  className={`text-sm font-manrope mb-1 ${completed ? "line-through opacity-50" : ""}`}
                  style={{ color: theme.textSecondary }}
                  numberOfLines={2}
                >
                  {task.description}
                </Text>
              ) : null}
              <View className="flex-row items-center flex-wrap gap-2">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: userColors[colorIndex] }} />
                <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                  {getTaskAssignee(task)}
                </Text>
                {task.room && (
                  <>
                    <Text className="text-[10px]" style={{ color: theme.textSecondary }}>
                      •
                    </Text>
                    <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                      {task.room.name}
                    </Text>
                  </>
                )}
                <Text className="text-[10px]" style={{ color: theme.textSecondary }}>
                  •
                </Text>
                <View className="flex-row items-center gap-1">
                  <Calendar size={12} color={theme.textSecondary} />
                  <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                    {getTaskDueText(task)}
                  </Text>
                </View>
                {completed && completedDate && (
                  <>
                    <Text className="text-[10px]" style={{ color: theme.textSecondary }}>
                      •
                    </Text>
                    <Text className="text-xs font-manrope-semibold" style={{ color: theme.status.success }}>
                      Done: {completedDate}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: String(task.id) } })}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              className="p-1"
              activeOpacity={0.6}
            >
              <ArrowRight size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            {isAdmin && !hasSchedule && (
              <TouchableOpacity
                onPress={() => handleOpenScheduleModal(task.id)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                className="p-1"
                activeOpacity={0.6}
              >
                <Repeat size={20} color={theme.accent.purple} />
              </TouchableOpacity>
            )}
            {isAdmin && hasSchedule && (
              <TouchableOpacity
                onPress={() => handleDeleteSchedule(task)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                className="p-1"
                activeOpacity={0.6}
              >
                <Repeat size={20} color={theme.status.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleDelete(task.id)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              className="p-1"
              activeOpacity={0.6}
            >
              <Trash size={20} color={theme.accent.pink} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <TasksSkeleton />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: insets.top + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-4xl font-manrope-bold mb-1" style={{ color: theme.text }}>
              {t.tasks.title}
            </Text>
            <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
              {interpolate(t.tasks.assignedToYou, { count: getMyTasksCount() })}
            </Text>
          </View>
          <TouchableOpacity
            className="w-14 h-14 rounded-[18px] justify-center items-center"
            style={{ backgroundColor: theme.accent.purple }}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={28} color="#1C1C1E" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View className="flex-row gap-2.5 mb-6">
          {[
            { key: "All" as FilterType, label: t.tasks.filters.all },
            { key: "My" as FilterType, label: t.tasks.filters.my },
            { key: "By Room" as FilterType, label: t.tasks.filters.byRoom },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              className={`px-5 py-3 rounded-[12px] border ${
                activeFilter === filter.key ? "bg-primary border-primary" : ""
              }`}
              style={[
                { backgroundColor: theme.surface, borderColor: theme.border },
                activeFilter === filter.key && { backgroundColor: "#1C1C1E", borderColor: "#1C1C1E" },
              ]}
              onPress={() => setActiveFilter(filter.key)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-sm font-manrope-semibold ${activeFilter === filter.key ? "text-white" : ""}`}
                style={activeFilter !== filter.key ? { color: theme.textSecondary } : undefined}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tasks List */}
        {getFilteredTasks().length === 0 ? (
          <View className="flex-1 justify-center items-center py-15">
            <Text className="text-xl font-manrope-bold mb-2" style={{ color: theme.textSecondary }}>
              {t.tasks.noTasks}
            </Text>
            <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
              {t.tasks.noTasksHint}
            </Text>
          </View>
        ) : (
          <View className="gap-3">{getFilteredTasks().map((task, index) => renderTaskItem(task, index))}</View>
        )}
      </ScrollView>

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} onClose={() => setShowCreateModal(false)} title={t.tasks.newTask} height="full">
        <View className="flex-1">
          <Input
            label={t.tasks.taskName}
            placeholder={t.tasks.taskNamePlaceholder}
            value={newTaskName}
            onChangeText={setNewTaskName}
          />

          <Input
            label={t.tasks.description}
            placeholder={t.tasks.descriptionPlaceholder}
            value={newTaskDescription}
            onChangeText={setNewTaskDescription}
            multiline
            numberOfLines={3}
          />

          <View className="mb-6">
            <Text
              className="text-xs font-manrope-bold uppercase tracking-wide mb-3 ml-1"
              style={{ color: theme.textSecondary }}
            >
              {t.tasks.dueDate}
            </Text>

            <TouchableOpacity
              onPress={showDatePicker}
              className="rounded-[12px] p-4 h-14 justify-center"
              style={{ backgroundColor: theme.surface }}
            >
              <Text
                className="text-base font-manrope-semibold"
                style={{ color: selectedDate ? theme.text : theme.textSecondary }}
              >
                {selectedDate
                  ? selectedDate.toLocaleString([], {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : t.tasks.selectDateTime}
              </Text>
            </TouchableOpacity>

            <DatePicker
              visible={isDatePickerVisible}
              onClose={hideDatePicker}
              onConfirm={handleConfirmDate}
              value={selectedDate ?? undefined}
              mode="datetime"
              minimumDate={new Date()}
              title={t.tasks.selectDateTime}
            />
          </View>

          {rooms.length > 0 && (
            <View className="mb-6">
              <Text
                className="text-xs font-manrope-bold uppercase tracking-wide mb-3 ml-1"
                style={{ color: theme.textSecondary }}
              >
                {t.tasks.room}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    className="px-4.5 py-3 rounded-[12px]"
                    style={[{ backgroundColor: theme.surface }, !selectedRoomId && { backgroundColor: theme.text }]}
                    onPress={() => setSelectedRoomId(null)}
                  >
                    <Text
                      className="text-sm font-manrope-semibold"
                      style={[{ color: theme.textSecondary }, !selectedRoomId && { color: theme.background }]}
                    >
                      {t.common.none}
                    </Text>
                  </TouchableOpacity>
                  {rooms.map((room) => (
                    <TouchableOpacity
                      key={room.id}
                      className="px-4.5 py-3 rounded-[12px]"
                      style={[
                        { backgroundColor: theme.surface },
                        selectedRoomId === room.id && { backgroundColor: theme.text },
                      ]}
                      onPress={() => setSelectedRoomId(room.id)}
                    >
                      <Text
                        className="text-sm font-manrope-semibold"
                        style={[
                          { color: theme.textSecondary },
                          selectedRoomId === room.id && { color: theme.background },
                        ]}
                      >
                        {room.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {home?.memberships && home.memberships.length > 0 && (
            <View className="mb-6">
              <Text
                className="text-xs font-manrope-bold uppercase tracking-wide mb-3 ml-1"
                style={{ color: theme.textSecondary }}
              >
                {t.tasks.assignTo}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2.5">
                  {home.memberships.map((membership) => {
                    const isSelected = selectedUserIds.includes(membership.userId);
                    return (
                      <TouchableOpacity
                        key={membership.userId}
                        className="px-4.5 py-3 rounded-[12px]"
                        style={[{ backgroundColor: theme.surface }, isSelected && { backgroundColor: theme.text }]}
                        onPress={() =>
                          setSelectedUserIds((prev) =>
                            isSelected ? prev.filter((id) => id !== membership.userId) : [...prev, membership.userId],
                          )
                        }
                      >
                        <Text
                          className="text-sm font-manrope-semibold"
                          style={[{ color: theme.textSecondary }, isSelected && { color: theme.background }]}
                        >
                          {membership.user?.name || `User ${membership.userId}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          <Button
            title={t.tasks.createTask}
            onPress={handleCreateTask}
            loading={creating}
            disabled={!newTaskName.trim() || creating}
            variant="yellow"
            style={{ marginTop: "auto" }}
          />
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={t.tasks.schedule.create}
        height="full"
      >
        <View className="flex-1">
          {/* Recurrence Type */}
          <View className="mb-6">
            <Text
              className="text-xs font-manrope-bold uppercase tracking-wide mb-3 ml-1"
              style={{ color: theme.textSecondary }}
            >
              {t.tasks.schedule.recurrence}
            </Text>
            <View className="flex-row gap-2.5">
              {(["daily", "weekly", "monthly"] as RecurrenceType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  className="flex-1 py-3 rounded-[12px] items-center"
                  style={[
                    { backgroundColor: theme.surface },
                    scheduleRecurrence === type && { backgroundColor: theme.accent.purple },
                  ]}
                  onPress={() => setScheduleRecurrence(type)}
                >
                  <Text
                    className="text-sm font-manrope-bold"
                    style={[{ color: theme.textSecondary }, scheduleRecurrence === type && { color: "#1C1C1E" }]}
                  >
                    {getRecurrenceLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rotation Users */}
          {home?.memberships && home.memberships.length > 0 && (
            <View className="mb-6">
              <Text
                className="text-xs font-manrope-bold uppercase tracking-wide mb-3 ml-1"
                style={{ color: theme.textSecondary }}
              >
                {t.tasks.schedule.rotationUsers}
              </Text>
              <Text className="text-xs font-manrope mb-3 ml-1" style={{ color: theme.textMuted }}>
                {t.tasks.schedule.rotationHint}
              </Text>
              <View className="gap-2">
                {home.memberships.map((membership, _idx) => {
                  const isSelected = scheduleUserIds.includes(membership.userId);
                  const orderIndex = scheduleUserIds.indexOf(membership.userId);
                  return (
                    <TouchableOpacity
                      key={membership.userId}
                      className="flex-row items-center px-4 py-3 rounded-[12px]"
                      style={[
                        { backgroundColor: theme.surface },
                        isSelected && {
                          backgroundColor: `${theme.accent.purple}15`,
                          borderWidth: 1,
                          borderColor: theme.accent.purple,
                        },
                      ]}
                      onPress={() =>
                        setScheduleUserIds((prev) =>
                          isSelected ? prev.filter((id) => id !== membership.userId) : [...prev, membership.userId],
                        )
                      }
                    >
                      {isSelected && (
                        <View
                          className="w-6 h-6 rounded-full justify-center items-center mr-3"
                          style={{ backgroundColor: theme.accent.purple }}
                        >
                          <Text className="text-xs font-manrope-bold" style={{ color: "#1C1C1E" }}>
                            {orderIndex + 1}
                          </Text>
                        </View>
                      )}
                      <Text
                        className="text-sm font-manrope-semibold flex-1"
                        style={{ color: isSelected ? theme.text : theme.textSecondary }}
                      >
                        {membership.user?.name || `User ${membership.userId}`}
                      </Text>
                      {isSelected && <X size={16} color={theme.textSecondary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {scheduleUserIds.length > 0 && scheduleUserIds.length < 2 && (
                <Text className="text-xs font-manrope mt-2 ml-1" style={{ color: theme.status.error }}>
                  {t.tasks.schedule.selectUsers}
                </Text>
              )}
            </View>
          )}

          <Button
            title={t.tasks.schedule.create}
            onPress={handleCreateSchedule}
            loading={creatingSchedule}
            disabled={scheduleUserIds.length < 2 || creatingSchedule}
            variant="purple"
            style={{ marginTop: "auto" }}
          />
        </View>
      </Modal>
    </View>
  );
}
