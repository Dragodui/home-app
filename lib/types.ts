// User types
export interface User {
  id: number;
  email: string;
  email_verified: boolean;
  name: string;
  avatar?: string;
  created_at: string;
}

// Home/Household types
export interface Home {
  id: number;
  name: string;
  invite_code: string;
  created_at: string;
  memberships?: HomeMembership[];
}

export interface HomeMembership {
  id: number;
  home_id: number;
  user_id: number;
  role: "admin" | "member";
  joined_at: string;
  created_at: string;
  user?: User;
  home?: Home;
}

// Room types
export interface Room {
  id: number;
  home_id: number;
  name: string;
  created_at: string;
  tasks?: Task[];
}

// Task types
export interface Task {
  id: number;
  home_id: number;
  room_id?: number;
  name: string;
  description: string;
  schedule_type: string;
  due_date?: string;
  created_at: string;
  room?: Room;
  assignments?: TaskAssignment[];
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: number;
  status: "assigned" | "completed";
  assigned_date: string;
  complete_date?: string;
  created_at: string;
  task?: Task;
  user?: User;
}

// Bill types
export interface BillSplit {
  id: number;
  bill_id: number;
  user_id: number;
  amount: number;
  paid: boolean;
  user?: User;
}

export interface Bill {
  id: number;
  home_id: number;
  type: string;
  bill_category_id?: number;
  bill_category?: BillCategory;
  is_payed: boolean;
  payment_date?: string;
  total_amount: number;
  period_start: string;
  period_end: string;
  uploaded_by: number;
  description?: string;
  ocr_data?: Record<string, any>;
  created_at: string;
  user?: User;
  splits?: BillSplit[];
}

// Shopping types
export interface ShoppingCategory {
  id: number;
  home_id: number;
  name: string;
  icon?: string;
  color: string;
  created_at: string;
  items?: ShoppingItem[];
}

export interface ShoppingItem {
  id: number;
  category_id: number;
  name: string;
  added_by: number;
  is_bought: boolean;
  image?: string;
  link?: string;
  bought_date?: string;
  created_at: string;
  user?: User;
}

export interface BillCategory {
  id: number;
  home_id: number;
  name: string;
  color: string;
  created_at: string;
}

// Poll types
export interface Poll {
  id: number;
  home_id: number;
  question: string;
  type: "public" | "anonymous";
  status: "open" | "closed";
  allow_revote: boolean;
  ends_at?: string;
  created_at: string;
  options?: PollOption[];
}

export interface PollOption {
  id: number;
  poll_id: number;
  title: string;
  created_at: string;
  votes?: Vote[];
  vote_count?: number;
}

export interface Vote {
  id: number;
  user_id: number;
  option_id: number;
  user?: User;
}

// Notification types
export interface Notification {
  id: number;
  from?: number;
  to: number;
  description: string;
  read: boolean;
  created_at: string;
  user_from?: User;
}

export interface HomeNotification {
  id: number;
  from?: number;
  home_id: number;
  description: string;
  read: boolean;
  created_at: string;
  user_from?: User;
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
  schedule_type: string;
  due_date?: string;
  home_id: number;
  room_id?: number;
  assign_user_ids?: number[];
}

export interface CreateBillForm {
  type: string;
  description?: string;
  total_amount: number;
  period_start: string;
  period_end: string;
  ocr_data?: Record<string, any>;
  splits?: { user_id: number; amount: number }[];
}

export interface CreatePollForm {
  question: string;
  type: "public" | "anonymous";
  options: { title: string }[];
  allow_revote: boolean;
  ends_at?: string;
}

export interface CreateCategoryForm {
  name: string;
  icon?: string;
  color?: string;
}

export interface CreateItemForm {
  category_id: number;
  name: string;
  image?: string;
  link?: string;
}

// Smart Home Types
export interface SmartDevice {
  id: number;
  home_id: number;
  room_id?: number;
  entity_id: string;
  name: string;
  type: string;
  icon?: string;
  created_at: string;
  room?: Room;
}

export interface HomeAssistantConfig {
  id: number;
  home_id: number;
  url: string;
  is_active: boolean;
  created_at: string;
}

export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface ConnectHARequest {
  url: string;
  token: string;
}

export interface AddDeviceRequest {
  entity_id: string;
  name: string;
  room_id?: number;
  icon?: string;
}

export interface UpdateDeviceRequest {
  name?: string;
  room_id?: number;
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
  raw_text?: string;
  confidence?: number;
}
