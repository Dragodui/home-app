import {
  Book,
  Briefcase,
  Calendar,
  CheckCircle,
  Coffee,
  DollarSign,
  Edit2,
  FileText,
  Heart,
  Home,
  Lightbulb,
  Lock,
  type LucideIcon,
  Notebook,
  ShoppingBag,
  Smile,
  Star,
  Tag,
  User,
  Utensils,
  Wrench,
} from "lucide-react-native";

export const NOTE_ICON_OPTIONS: readonly { value: string; icon: LucideIcon }[] = [
  { value: "notebook", icon: Notebook },
  { value: "tag", icon: Tag },
  { value: "edit", icon: Edit2 },
  { value: "home", icon: Home },
  { value: "shopping", icon: ShoppingBag },
  { value: "finance", icon: DollarSign },
  { value: "task", icon: CheckCircle },
  { value: "calendar", icon: Calendar },
  { value: "lock", icon: Lock },
  { value: "idea", icon: Lightbulb },
  { value: "heart", icon: Heart },
  { value: "food", icon: Utensils },
  { value: "book", icon: Book },
  { value: "work", icon: Briefcase },
  { value: "coffee", icon: Coffee },
  { value: "star", icon: Star },
  { value: "tool", icon: Wrench },
  { value: "user", icon: User },
  { value: "smile", icon: Smile },
  { value: "document", icon: FileText },
];

export const NOTE_CATEGORY_COLORS = [
  "#D8D4FC", // Accent Purple (Lavender)
  "#FBEB9E", // Accent Yellow (Cream)
  "#FF7476", // Accent Pink (Coral)
  "#A8E6CF", // Accent Mint
  "#7DD3E8", // Accent Cyan
  "#60A5FA", // Blue
  "#22C55E", // Green
  "#FB923C", // Orange
  "#F472B6", // Pink
  "#A78BFA", // Violet
  "#38BDF8", // Sky Blue
  "#818CF8", // Indigo
  "#4ADE80", // Light Green
  "#FDE047", // Pastel Yellow
  "#FFC2D1", // Soft Rose
  "#B2F5EA", // Soft Teal
  "#C4F2FF", // Soft Sky
  "#FFD2D2", // Soft Red
] as const;

export function getNoteCategoryIcon(iconId: string | undefined): LucideIcon {
  return NOTE_ICON_OPTIONS.find((option) => option.value === iconId)?.icon ?? Tag;
}
