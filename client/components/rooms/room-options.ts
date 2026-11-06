import {
  Bath,
  BedDouble,
  Book,
  Car,
  ChefHat,
  Coffee,
  Dumbbell,
  Home as HomeIcon,
  Lightbulb,
  type LucideIcon,
  Sofa,
  TreePine,
  Tv,
  Utensils,
  Wifi,
  Wrench,
} from "lucide-react-native";

export const ROOM_COLOR_OPTIONS = [
  "#FF7476",
  "#FF9F7A",
  "#FBEB9E",
  "#A8E6CF",
  "#7DD3E8",
  "#D8D4FC",
  "#F5A3D3",
  "#22C55E",
  "#F472B6",
  "#C4B5FD",
  "#94A3B8",
  "#FDE68A",
  "#6EE7B7",
] as const;

export const DEFAULT_ROOM_COLOR: string = ROOM_COLOR_OPTIONS[2];

export const ROOM_ICON_OPTIONS = [
  { value: "home", icon: HomeIcon },
  { value: "utensils", icon: Utensils },
  { value: "lightbulb", icon: Lightbulb },
  { value: "coffee", icon: Coffee },
  { value: "wrench", icon: Wrench },
  { value: "car", icon: Car },
  { value: "book", icon: Book },
  { value: "bed", icon: BedDouble },
  { value: "bath", icon: Bath },
  { value: "sofa", icon: Sofa },
  { value: "tv", icon: Tv },
  { value: "wifi", icon: Wifi },
  { value: "gym", icon: Dumbbell },
  { value: "garden", icon: TreePine },
  { value: "chef", icon: ChefHat },
] as const;

export type RoomIconId = (typeof ROOM_ICON_OPTIONS)[number]["value"];

export function getRoomIcon(iconId: string | undefined): LucideIcon {
  return ROOM_ICON_OPTIONS.find((option) => option.value === iconId)?.icon ?? HomeIcon;
}
