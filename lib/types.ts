// User types
export interface User {
  id: number;
  email: string;
  emailVerified: boolean;
  name: string;
  avatar?: string;
  createdAt: string;
}

// Home/Household types
export interface Home {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: string;
  memberships?: HomeMembership[];
}

export interface HomeMembership {
  id: number;
  homeId: number;
  userId: number;
  role: "admin" | "member";
  joinedAt: string;
  createdAt: string;
  user?: User;
  home?: Home;
}

// Room types
export interface Room {
  id: number;
  homeId: number;
  name: string;
  createdAt: string;
  tasks?: Task[];
}

// Task types
export interface Task {
  id: number;
  homeId: number;
  roomId?: number;
  name: string;
  description: string;
  scheduleType: string;
  dueDate?: string;
  createdAt: string;
  room?: Room;
  assignments?: TaskAssignment[];
  schedule?: TaskSchedule;
}

export interface TaskSchedule {
  id: number;
  taskId: number;
  recurrenceType: "daily" | "weekly" | "monthly";
  rotationUserIds: string;
  currentRotationIndex: number;
  nextRunDate: string;
  isActive: boolean;
  createdAt: string;
  task?: Task;
}

export interface CreateScheduleForm {
  taskId: number;
  homeId: number;
  recurrenceType: "daily" | "weekly" | "monthly";
  userIds: number[];
}

export interface TaskAssignment {
  id: number;
  taskId: number;
  userId: number;
  status: "assigned" | "completed";
  assignedDate: string;
  completeDate?: string;
  createdAt: string;
  task?: Task;
  user?: User;
}

// Bill types
export interface BillSplit {
  id: number;
  billId: number;
  userId: number;
  amount: number;
  paid: boolean;
  user?: User;
}

export interface Bill {
  id: number;
  homeId: number;
  type: string;
  billCategoryId?: number;
  billCategory?: BillCategory;
  isPayed: boolean;
  paymentDate?: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  uploadedBy: number;
  description?: string;
  receiptImage?: string;
  ocrData?: Record<string, any>;
  createdAt: string;
  user?: User;
  splits?: BillSplit[];
}

// Shopping types
export interface ShoppingCategory {
  id: number;
  homeId: number;
  name: string;
  icon?: string;
  color: string;
  createdAt: string;
  items?: ShoppingItem[];
}

export interface ShoppingItem {
  id: number;
  categoryId: number;
  name: string;
  addedBy: number;
  isBought: boolean;
  image?: string;
  link?: string;
  boughtDate?: string;
  createdAt: string;
  user?: User;
}

export interface BillCategory {
  id: number;
  homeId: number;
  name: string;
  color: string;
  createdAt: string;
}

// Poll types
export interface Poll {
  id: number;
  homeId: number;
  question: string;
  type: "public" | "anonymous";
  status: "open" | "closed";
  allowRevote: boolean;
  endsAt?: string;
  createdAt: string;
  options?: PollOption[];
}

export interface PollOption {
  id: number;
  pollId: number;
  title: string;
  createdAt: string;
  votes?: Vote[];
  voteCount?: number;
}

export interface Vote {
  id: number;
  userId: number;
  optionId: number;
  user?: User;
}

// Notification types
export interface Notification {
  id: number;
  from?: number;
  to: number;
  description: string;
  read: boolean;
  createdAt: string;
  userFrom?: User;
}

export interface HomeNotification {
  id: number;
  from?: number;
  homeId: number;
  description: string;
  read: boolean;
  createdAt: string;
  userFrom?: User;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  name: string;
}

export interface CreateHomeForm {
  name: string;
}

export interface JoinHomeForm {
  code: string;
}

export interface CreateTaskForm {
  name: string;
  description: string;
  scheduleType: string;
  dueDate?: string;
  homeId: number;
  roomId?: number;
  assignUserIds?: number[];
}

export interface CreateBillForm {
  type: string;
  description?: string;
  receiptImage?: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  ocrData?: Record<string, any>;
  splits?: { userId: number; amount: number }[];
}

export interface CreatePollForm {
  question: string;
  type: "public" | "anonymous";
  options: { title: string }[];
  allowRevote: boolean;
  endsAt?: string;
}

export interface CreateCategoryForm {
  name: string;
  icon?: string;
  color?: string;
}

export interface CreateItemForm {
  categoryId: number;
  name: string;
  image?: string;
  link?: string;
}

// Smart Home Types
export interface SmartDevice {
  id: number;
  homeId: number;
  roomId?: number;
  entityId: string;
  name: string;
  type: string;
  icon?: string;
  createdAt: string;
  room?: Room;
}

export interface HomeAssistantConfig {
  id: number;
  homeId: number;
  url: string;
  isActive: boolean;
  createdAt: string;
}

export interface HAState {
  entityId: string;
  state: string;
  attributes: Record<string, any>;
  lastChanged: string;
  lastUpdated: string;
}

export interface ConnectHARequest {
  url: string;
  token: string;
}

export interface AddDeviceRequest {
  entityId: string;
  name: string;
  roomId?: number;
  icon?: string;
}

export interface UpdateDeviceRequest {
  name?: string;
  roomId?: number;
  icon?: string;
}

export interface ControlDeviceRequest {
  service: string;
  data?: Record<string, any>;
}

export interface OCRResult {
  vendor?: string;
  date?: string;
  total: number;
  items?: {
    name: string;
    quantity: number;
    price: number;
  }[];
  rawText?: string;
  confidence?: number;
}
