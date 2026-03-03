import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Plus, Calendar, Trash } from "lucide-react-native";
import DatePicker from "@/components/ui/date-picker";

import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useTheme } from "@/stores/themeStore";
import { useI18n, interpolate } from "@/stores/i18nStore";
import { taskApi } from "@/lib/api";
import { Task, TaskAssignment } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAlert } from "@/components/ui/alert";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { userColors } from "@/constants/colors";
import { TasksSkeleton } from "@/components/skeletons";

type FilterType = "All" | "My" | "By Room";

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { home, rooms } = useHome();
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
      let assignmentId = task.assignments?.find((a) => a.user_id === user.id)?.id;
      if (!assignmentId) {
        assignmentId = assignments.find((a) => a.task_id === task.id && a.user_id === user.id)?.id;
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
        schedule_type: "once",
        due_date: selectedDate ? selectedDate.toISOString() : undefined,
        home_id: home.id,
        room_id: selectedRoomId || undefined,
        assign_user_ids: selectedUserIds.length > 0 ? selectedUserIds : undefined,
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

  const getFilteredTasks = () => {
    if (activeFilter === "My") {
      const myTaskIds = assignments.map((a) => a.task_id);
      return tasks.filter((t) => myTaskIds.includes(t.id));
    }
    return tasks;
  };

  const isTaskCompleted = (task: Task) => {
    if (task.assignments && task.assignments.length > 0) {
      const userAssignment = task.assignments.find((a) => a.user_id === user?.id);
      if (userAssignment) return userAssignment.status === "completed";
      return task.assignments.some((a) => a.status === "completed");
    }
    const assignment = assignments.find((a) => a.task_id === task.id);
    return assignment?.status === "completed";
  };

  const getTaskAssignee = (task: Task) => {
    if (task.assignments && task.assignments.length > 0) {
      return task.assignments[0].user?.name || t.tasks.assigned;
    }
    return t.tasks.unassigned;
  };

  const getTaskDueText = (task: Task) => {
    if (task.due_date) {
      const date = new Date(task.due_date);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return t.tasks.noDueDate;
  };

  const getTaskCompletedDate = (task: Task) => {
    let assignment = task.assignments?.find((a) => a.user_id === user?.id);
    if (!assignment) {
      assignment = assignments.find((a) => a.task_id === task.id && a.user_id === user?.id);
    }
    if (!assignment && task.assignments) {
      assignment = task.assignments.find((a) => a.status === "completed");
    }

    if (assignment && assignment.complete_date) {
      const date = new Date(assignment.complete_date);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "";
  };

  const getMyTasksCount = () => {
    const myTaskIds = assignments.map((a) => a.task_id);
    return tasks.filter((t) => myTaskIds.includes(t.id)).length;
  };

  const renderTaskItem = (task: Task, index: number) => {
    const completed = isTaskCompleted(task);
    const colorIndex = index % userColors.length;
    const completedDate = completed ? getTaskCompletedDate(task) : "";

    return (
      <View
        key={task.id}
        className="rounded-24 p-5"
        style={{ backgroundColor: theme.surface }}
      >
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
              <Text
                className={`text-lg font-manrope-bold mb-2 ${completed ? "line-through opacity-50" : ""}`}
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                {task.name}
              </Text>
              <View className="flex-row items-center flex-wrap gap-2">
                <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: userColors[colorIndex] }}
                />
                <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                  {getTaskAssignee(task)}
                </Text>
                <Text className="text-[10px]" style={{ color: theme.textSecondary }}>•</Text>
                <View className="flex-row items-center gap-1">
                  <Calendar size={12} color={theme.textSecondary} />
                  <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                    {getTaskDueText(task)}
                  </Text>
                </View>
                {completed && completedDate && (
                  <>
                    <Text className="text-[10px]" style={{ color: theme.textSecondary }}>•</Text>
                    <Text className="text-xs font-manrope-semibold" style={{ color: theme.status.success }}>
                      Done: {completedDate}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>

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
          {([
            { key: "All" as FilterType, label: t.tasks.filters.all },
            { key: "My" as FilterType, label: t.tasks.filters.my },
            { key: "By Room" as FilterType, label: t.tasks.filters.byRoom },
          ]).map((filter) => (
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
        {tasks.length === 0 ? (
          <View className="flex-1 justify-center items-center py-15">
            <Text className="text-xl font-manrope-bold mb-2" style={{ color: theme.textSecondary }}>
              {t.tasks.noTasks}
            </Text>
            <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
              {t.tasks.noTasksHint}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {getFilteredTasks().map((task, index) => renderTaskItem(task, index))}
          </View>
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
                    style={[
                      { backgroundColor: theme.surface },
                      !selectedRoomId && { backgroundColor: theme.text },
                    ]}
                    onPress={() => setSelectedRoomId(null)}
                  >
                    <Text
                      className="text-sm font-manrope-semibold"
                      style={[
                        { color: theme.textSecondary },
                        !selectedRoomId && { color: theme.background },
                      ]}
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
                    const isSelected = selectedUserIds.includes(membership.user_id);
                    return (
                      <TouchableOpacity
                        key={membership.user_id}
                        className="px-4.5 py-3 rounded-[12px]"
                        style={[
                          { backgroundColor: theme.surface },
                          isSelected && { backgroundColor: theme.text },
                        ]}
                        onPress={() =>
                          setSelectedUserIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== membership.user_id)
                              : [...prev, membership.user_id]
                          )
                        }
                      >
                        <Text
                          className="text-sm font-manrope-semibold"
                          style={[
                            { color: theme.textSecondary },
                            isSelected && { color: theme.background },
                          ]}
                        >
                          {membership.user?.name || `User ${membership.user_id}`}
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
    </View>
  );
}
