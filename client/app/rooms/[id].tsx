import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, Plus } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import AddDeviceModal from "@/components/smarthome/add-device-modal";
import DeviceRow from "@/components/smarthome/device-row";
import TaskFormModal, { type TaskFormValues } from "@/components/tasks/task-form-modal";
import {
  Badge,
  Button,
  Card,
  IconButton,
  ResponsiveGrid,
  Screen,
  ScreenHeader,
  Section,
  Spinner,
  StatCard,
  Text,
  useAlert,
} from "@/components/ui";
import { smarthomeApi, taskApi } from "@/lib/api";
import type { HAState, SmartDevice, Task } from "@/lib/types";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

const EMPTY_TASK_FORM: TaskFormValues = {
  name: "",
  description: "",
  date: null,
  reminderMinutes: "30",
  roomId: null,
  userIds: [],
};

export default function RoomDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { home, isAdmin } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deviceStates, setDeviceStates] = useState<Record<string, HAState>>({});
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loading, setLoading] = useState(true);

  // Add Device Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<HAState[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [addingDevice, setAddingDevice] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [creatingTask, setCreatingTask] = useState(false);

  const roomId = parseInt(id, 10);

  const fetchDashboardData = useCallback(async () => {
    if (!home) return;
    try {
      const [devicesResult, states, tasksResult] = await Promise.all([
        smarthomeApi.getDevicesByRoom(home.id, roomId).catch(() => []),
        smarthomeApi.getAllStates(home.id).catch(() => []),
        taskApi.getByHomeId(home.id).catch(() => []),
      ]);
      setDevices(devicesResult);
      const stateMap: Record<string, HAState> = {};
      states.forEach((s) => (stateMap[s.entityId] = s));
      setDeviceStates(stateMap);
      setTasks((tasksResult || []).filter((task) => task.roomId === roomId));
    } catch (error) {
      console.error("Failed to fetch room dashboard data:", error);
    } finally {
      setLoading(false);
      setLoadingTasks(false);
    }
  }, [home, roomId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDiscover = async () => {
    if (!home) return;
    setDiscovering(true);
    try {
      const results = await smarthomeApi.discover(home.id);
      setDiscoveredDevices(results);
    } catch (_error) {
      alert(t.common.error, t.smartHome.failedToDiscoverDevices);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddDevice = async () => {
    if (!home || !selectedEntity || !deviceName.trim()) return;

    setAddingDevice(true);
    try {
      await smarthomeApi.addDevice(home.id, {
        entityId: selectedEntity,
        name: deviceName.trim(),
        roomId: roomId,
      });
      setShowAddModal(false);
      setDeviceName("");
      setSelectedEntity(null);
      fetchDashboardData();
    } catch (err: any) {
      alert(t.common.error, err.response?.data?.error || t.smartHome.failedToAddDevice);
    } finally {
      setAddingDevice(false);
    }
  };

  const handleDeleteDevice = (deviceId: number, deviceName: string) => {
    if (!home) return;
    alert(t.smartHome.deleteDeviceTitle, interpolate(t.smartHome.deleteDeviceConfirm, { name: deviceName }), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await smarthomeApi.deleteDevice(home.id, deviceId);
            fetchDashboardData();
          } catch (_error) {
            alert(t.common.error, t.smartHome.failedToDeleteDevice);
          }
        },
      },
    ]);
  };

  const handleControl = async (device: SmartDevice, state: boolean) => {
    if (!home) return;
    const service = state ? "turn_on" : "turn_off";

    // Optimistic update
    const newState = { ...deviceStates[device.entityId], state: state ? "on" : "off" };
    setDeviceStates((prev) => ({ ...prev, [device.entityId]: newState }));

    try {
      await smarthomeApi.controlDevice(home.id, device.id, service);
    } catch (error) {
      console.error("Control failed", error);
      fetchDashboardData();
    }
  };

  const parseReminderMinutes = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 30;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 0) return 30;
    return parsed;
  };

  const handleCreateTask = async () => {
    if (!home || !taskForm.name.trim()) return;

    setCreatingTask(true);
    try {
      await taskApi.create(home.id, {
        name: taskForm.name.trim(),
        description: taskForm.description.trim(),
        scheduleType: "once",
        dueDate: taskForm.date ? taskForm.date.toISOString() : undefined,
        reminderMinutes: parseReminderMinutes(taskForm.reminderMinutes),
        homeId: home.id,
        roomId: roomId,
      });
      setShowTaskModal(false);
      setTaskForm(EMPTY_TASK_FORM);
      await fetchDashboardData();
    } catch (_error) {
      alert(t.common.error, t.tasks.couldNotCreate);
    } finally {
      setCreatingTask(false);
    }
  };

  const isTaskCompleted = (task: Task) => {
    if (task.assignments && task.assignments.length > 0) {
      return task.assignments.some((assignment) => assignment.status === "completed");
    }
    return false;
  };

  const formatTaskDueText = (task: Task) => {
    if (!task.dueDate) return t.tasks.noDueDate;
    const dueDate = new Date(task.dueDate);
    return `${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  };

  const taskStats = tasks.reduce(
    (acc, task) => {
      if (isTaskCompleted(task)) {
        acc.completed += 1;
      } else {
        acc.pending += 1;
      }
      return acc;
    },
    { pending: 0, completed: 0 },
  );

  const renderTask = (task: Task) => {
    const completed = isTaskCompleted(task);

    return (
      <Card
        key={task.id}
        size="sm"
        onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: String(task.id) } })}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text variant="subtitle" className={completed ? "line-through opacity-60" : undefined}>
              {task.name}
            </Text>
            {task.description ? (
              <Text
                variant="bodySmall"
                color="secondary"
                className={`mt-1 ${completed ? "line-through opacity-50" : ""}`}
                numberOfLines={2}
              >
                {task.description}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-1 mt-2">
              <Calendar size={12} color={theme.textSecondary} />
              <Text variant="caption" color="secondary" className="font-manrope-semibold">
                {formatTaskDueText(task)}
              </Text>
            </View>
          </View>
          {completed ? (
            <Badge label={t.common.done} tone="green" />
          ) : (
            <Badge label={t.tasks.schedule.active} tone="danger" />
          )}
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title={name}
        right={
          isAdmin ? (
            <IconButton
              icon={Plus}
              tone="yellow"
              solid
              onPress={() => {
                setShowAddModal(true);
                handleDiscover();
              }}
            />
          ) : undefined
        }
      />

      {loading || loadingTasks ? (
        <Spinner fill color={theme.accent.cyan} />
      ) : (
        <>
          <View className="flex-row gap-3 mb-5">
            <StatCard label={t.tasks.title} value={tasks.length} />
            <StatCard label={t.common.pending} value={taskStats.pending} valueColor={theme.accent.pink} />
            <StatCard label={t.smartHome.allDevices} value={devices.length} valueColor={theme.accent.cyan} />
          </View>

          <ResponsiveGrid>
            <Section
              title={t.rooms.roomTasks}
              titleVariant="heading"
              action={
                <View className="flex-row items-center gap-2">
                  <Button
                    title={t.tasks.title}
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push("/(tabs)/tasks")}
                  />
                  <Button title={t.tasks.newTask} size="sm" variant="yellow" onPress={() => setShowTaskModal(true)} />
                </View>
              }
            >
              {tasks.length === 0 ? (
                <Card size="sm">
                  <Text variant="bodySmall" color="secondary">
                    {t.tasks.noTasks}
                  </Text>
                </Card>
              ) : (
                <View className="gap-3">{tasks.map(renderTask)}</View>
              )}
            </Section>

            <Section title={t.smartHome.allDevices} titleVariant="heading">
              {devices.length === 0 ? (
                <Card size="sm">
                  <Text variant="bodySmall" color="secondary">
                    {t.smartHome.noDevicesInRoom}
                  </Text>
                </Card>
              ) : (
                <View className="gap-3">
                  {devices.map((device) => (
                    <DeviceRow
                      key={device.id}
                      device={device}
                      state={deviceStates[device.entityId]}
                      onToggle={(value) => handleControl(device, value)}
                      onDelete={isAdmin ? () => handleDeleteDevice(device.id, device.name) : undefined}
                    />
                  ))}
                </View>
              )}
            </Section>
          </ResponsiveGrid>
        </>
      )}

      <TaskFormModal
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={t.tasks.newTask}
        submitLabel={t.tasks.createTask}
        submitting={creatingTask}
        onSubmit={handleCreateTask}
        values={taskForm}
        onChange={(changes) => setTaskForm((form) => ({ ...form, ...changes }))}
        minimumDate={new Date()}
      />

      <AddDeviceModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        description={`Select a device to add to ${name}`}
        discovering={discovering}
        discoveredDevices={discoveredDevices}
        selectedEntity={selectedEntity}
        onSelectEntity={(entityId, suggestedName) => {
          setSelectedEntity(entityId);
          setDeviceName(suggestedName);
        }}
        deviceName={deviceName}
        onDeviceNameChange={setDeviceName}
        namePlaceholder={t.smartHome.roomDeviceNamePlaceholder}
        adding={addingDevice}
        onAdd={handleAddDevice}
      />
    </Screen>
  );
}
