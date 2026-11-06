import {
  Car,
  Coffee,
  DollarSign,
  Gift,
  GraduationCap,
  Home,
  Lightbulb,
  type LucideIcon,
  PawPrint,
  Plane,
  Receipt,
  Shield,
  ShoppingBag,
  Smartphone,
  Utensils,
  Wallet,
  Wrench,
} from "lucide-react-native";
import type { Bill } from "@/lib/types";

export type BudgetPeriod = "month" | "year" | "all";
export type BudgetScope = "home" | "private";
export type BillRecurrenceType = "daily" | "weekly" | "monthly";
export type SplitMode = "equal" | "manual";

export const BILL_CATEGORY_ICON_OPTIONS: readonly { value: string; icon: LucideIcon }[] = [
  { value: "wallet", icon: Wallet },
  { value: "dollar-sign", icon: DollarSign },
  { value: "home", icon: Home },
  { value: "utensils", icon: Utensils },
  { value: "lightbulb", icon: Lightbulb },
  { value: "coffee", icon: Coffee },
  { value: "wrench", icon: Wrench },
  { value: "car", icon: Car },
  { value: "gift", icon: Gift },
  { value: "shopping", icon: ShoppingBag },
  { value: "phone", icon: Smartphone },
  { value: "travel", icon: Plane },
  { value: "health", icon: Receipt },
  { value: "education", icon: GraduationCap },
  { value: "pets", icon: PawPrint },
  { value: "insurance", icon: Shield },
];

export function getBillCategoryIcon(iconId: string | undefined): LucideIcon {
  return BILL_CATEGORY_ICON_OPTIONS.find((option) => option.value === iconId)?.icon ?? DollarSign;
}

export const WEEKLY_RECURRENCE_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

export const MONTHLY_RECURRENCE_DAYS = Array.from({ length: 31 }, (_, index) => ({
  value: index + 1,
  label: String(index + 1),
}));

export const OCR_LANGUAGES = [
  { value: "", label: "Auto" },
  { value: "eng", label: "English" },
  { value: "pol", label: "Polski" },
  { value: "ukr", label: "Українська" },
  { value: "bel", label: "Беларуская" },
];

export function buildBudgetTrends(bills: Bill[], period: BudgetPeriod, cursor: Date) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (period === "year") {
    return monthNames.map((month, index) => {
      const monthBills = bills.filter((bill) => {
        const billDate = new Date(bill.createdAt);
        return billDate.getFullYear() === cursor.getFullYear() && billDate.getMonth() === index;
      });

      return {
        month,
        total: monthBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      };
    });
  }

  if (period === "all") {
    const yearTotals = new Map<number, number>();

    for (const bill of bills) {
      const year = new Date(bill.createdAt).getFullYear();
      yearTotals.set(year, (yearTotals.get(year) || 0) + bill.totalAmount);
    }

    return [...yearTotals.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, total]) => ({
        month: String(year),
        total,
      }));
  }

  const endDate = cursor;
  const months: { month: string; total: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const monthBills = bills.filter((bill) => {
      const billDate = new Date(bill.createdAt);
      return billDate.getMonth() === date.getMonth() && billDate.getFullYear() === date.getFullYear();
    });

    months.push({
      month: monthNames[date.getMonth()],
      total: monthBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    });
  }

  return months;
}
