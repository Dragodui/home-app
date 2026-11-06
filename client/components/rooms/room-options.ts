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
import { PICKER_COLORS } from "@/constants/colors";

export const DEFAULT_ROOM_COLOR: string = PICKER_COLORS[2];

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
