import { NativeModules, Platform } from "react-native";
import type { Task, TaskAssignment } from "./types";

export type TaskWidgetItem = {
  id: number;
  name: string;
  dueText?: string;
  roomName?: string;
};

export type TaskWidgetPayload = {
  homeName: string;
  userName: string;
  pendingCount: number;
  totalCount: number;
  items: TaskWidgetItem[];
  emptyMessage: string;
  updatedAt: string;
};

type TaskWidgetModule = {
  saveTaskWidgetData: (payload: string) => void;
};

const taskWidgetModule = NativeModules as typeof NativeModules & {
  TaskListWidgetModule?: TaskWidgetModule;
};

const getTaskTimestamp = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

const getTaskCompleted = (task: Task, assignments: TaskAssignment[], userId: number) => {
  const assigned = task.assignments?.find((assignment) => assignment.userId === userId) ?? assignments.find((assignment) => assignment.taskId === task.id && assignment.userId === userId);
  if (assigned) {
    return assigned.status === "completed";
  }

  if (task.assignments && task.assignments.length > 0) {
    return task.assignments.some((assignment) => assignment.status === "completed");
  }

  return false;
};

export function buildTaskWidgetPayload(args: {
  homeName?: string;
  userName?: string;
  tasks: Task[];
  assignments: TaskAssignment[];
  userId: number;
}): TaskWidgetPayload {
  const activeTasks = args.tasks.filter((task) => !getTaskCompleted(task, args.assignments, args.userId));

  const visibleTasks = activeTasks
    .filter((task) => {
      const assignedToUser = task.assignments?.some((assignment) => assignment.userId === args.userId);
      const assignedInList = args.assignments.some((assignment) => assignment.taskId === task.id && assignment.userId === args.userId);
      return assignedToUser || assignedInList;
    })
    .sort((left, right) => {
      const dueDiff = getTaskTimestamp(left.dueDate) - getTaskTimestamp(right.dueDate);
      if (dueDiff !== 0) return dueDiff;
      return getTaskTimestamp(left.createdAt) - getTaskTimestamp(right.createdAt);
    })
    .slice(0, 4);

  const totalCount = args.tasks.filter((task) => {
    const assignedToUser = task.assignments?.some((assignment) => assignment.userId === args.userId);
    const assignedInList = args.assignments.some((assignment) => assignment.taskId === task.id && assignment.userId === args.userId);
    return assignedToUser || assignedInList;
  }).length;

  const pendingCount = visibleTasks.length;

  return {
    homeName: args.homeName ?? "Home",
    userName: args.userName ?? "You",
    pendingCount,
    totalCount,
    items: visibleTasks.map((task) => ({
      id: task.id,
      name: task.name,
      dueText: task.dueDate
        ? new Date(task.dueDate).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
      roomName: task.room?.name,
    })),
    emptyMessage: "No assigned tasks",
    updatedAt: new Date().toISOString(),
  };
}

export async function syncTaskWidget(payload: TaskWidgetPayload | null) {
  if (Platform.OS !== "android") return;
  const module = taskWidgetModule.TaskListWidgetModule;
  if (!module) return;

  module.saveTaskWidgetData(JSON.stringify(payload ?? null));
}
