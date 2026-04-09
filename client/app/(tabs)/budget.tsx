import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coffee,
  DollarSign,
  Eye,
  File,
  FileText,
  Gift,
  Home,
  Lightbulb,
  Pencil,
  Plus,
  Receipt,
  Trash,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wrench,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { BudgetSkeleton } from "@/components/skeletons";
import { useAlert } from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { billApi, billCategoryApi, imageApi, ocrApi } from "@/lib/api";
import { formatCurrencyAmount, getHomeCurrency } from "@/lib/currency";
import type { Bill, BillCategory, BillSplit, HomeMembership, OCRResult } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

type BudgetPeriod = "month" | "year" | "all";

const BILL_CATEGORY_ICON_OPTIONS = [
  "wallet",
  "dollar-sign",
  "home",
  "utensils",
  "lightbulb",
  "coffee",
  "wrench",
  "car",
  "gift",
] as const;

const getBillCategoryIcon = (iconId: string | undefined, size: number, color: string) => {
  switch (iconId) {
    case "wallet":
      return <Wallet size={size} color={color} />;
    case "home":
      return <Home size={size} color={color} />;
    case "utensils":
      return <Utensils size={size} color={color} />;
    case "lightbulb":
      return <Lightbulb size={size} color={color} />;
    case "coffee":
      return <Coffee size={size} color={color} />;
    case "wrench":
      return <Wrench size={size} color={color} />;
    case "car":
      return <Car size={size} color={color} />;
    case "gift":
      return <Gift size={size} color={color} />;
    default:
      return <DollarSign size={size} color={color} />;
  }
};

function buildBudgetTrends(bills: Bill[], period: BudgetPeriod, cursor: Date) {
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

const DonutChart = ({
  data,
  size = 180,
  strokeWidth = 20,
  total,
  theme,
}: {
  data: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  total: number;
  theme: any;
}) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  return (
    <View className="justify-center items-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {total > 0 &&
          data.map((item, index) => {
            const percentage = item.value / total;
            const strokeLength = circumference * percentage;
            const angle = percentage * 360;

            const circle = (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={[strokeLength, circumference]}
                strokeDashoffset={0}
                rotation={currentAngle}
                origin={`${center}, ${center}`}
                strokeLinecap="round"
              />
            );

            currentAngle += angle;
            return circle;
          })}
      </Svg>
      <View className="absolute justify-center items-center">
        <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>
          {total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}
        </Text>
        <Text className="text-xs font-manrope" style={{ color: theme.textSecondary }}>
          Total
        </Text>
      </View>
    </View>
  );
};

const BarChart = ({
  data,
  width = 300,
  height = 240,
  theme,
}: {
  data: { month: string; total: number }[];
  width?: number;
  height?: number;
  theme: any;
}) => {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.min(32, (width - 40) / data.length - 8);
  const chartHeight = height - 40;
  const barSpacing = (width - 20) / data.length;

  return (
    <Svg width={width} height={height}>
      <Line x1={10} y1={chartHeight} x2={width - 10} y2={chartHeight} stroke={theme.border} strokeWidth={1} />
      {data.map((item, i) => {
        const barH = (item.total / maxVal) * (chartHeight - 20);
        const x = 10 + i * barSpacing + (barSpacing - barWidth) / 2;
        const y = chartHeight - barH;
        const isLast = i === data.length - 1;

        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 2)}
              rx={barWidth / 2}
              fill={isLast ? theme.accent.pink : theme.accent.purple}
              opacity={isLast ? 1 : 0.5}
            />
            <SvgText
              x={x + barWidth / 2}
              y={chartHeight + 16}
              fontSize={11}
              fill={theme.textSecondary}
              textAnchor="middle"
              fontWeight="600"
            >
              {item.month}
            </SvgText>
            {item.total > 0 && (
              <SvgText
                x={x + barWidth / 2}
                y={y - 6}
                fontSize={10}
                fill={theme.text}
                textAnchor="middle"
                fontWeight="700"
              >
                {item.total >= 1000
                  ? `${(item.total / 1000).toFixed(1)}k`
                  : item.total % 1 === 0
                    ? item.total.toFixed(0)
                    : item.total.toFixed(2)}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const { home, isAdmin } = useHome();
  const homeCurrency = getHomeCurrency(home);
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("month");
  const [periodCursor, setPeriodCursor] = useState(() => new Date());
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newBillDescription, setNewBillDescription] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [creating, setCreating] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<(typeof BILL_CATEGORY_ICON_OPTIONS)[number]>("wallet");
  const [selectedColor, setSelectedColor] = useState(theme.accent.yellow);
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Scan flow state
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<"image" | "pdf" | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  // Receipt history state
  const [expandedReceiptId, setExpandedReceiptId] = useState<number | null>(null);

  // Split state for create modal
  const [splitUserIds, setSplitUserIds] = useState<number[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "manual">("equal");
  const [manualAmounts, setManualAmounts] = useState<Record<number, string>>({});

  // Edit splits modal
  const [showEditSplitsModal, setShowEditSplitsModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editSplitUserIds, setEditSplitUserIds] = useState<number[]>([]);
  const [editSplitMode, setEditSplitMode] = useState<"equal" | "manual">("equal");
  const [editManualAmounts, setEditManualAmounts] = useState<Record<number, string>>({});
  const [savingSplits, setSavingSplits] = useState(false);

  // Expanded bill card
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);

  // Trend modal
  const [showTrendModal, setShowTrendModal] = useState(false);

  // Receipt image viewer
  const [showReceiptImageModal, setShowReceiptImageModal] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);

  const members: HomeMembership[] = home?.memberships ?? [];

  const COLOR_OPTIONS = [
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
  ];

  const LANGUAGES = [
    { code: "", label: "Auto" },
    { code: "eng", label: "English" },
    { code: "pol", label: "Polski" },
    { code: "ukr", label: "Українська" },
    { code: "bel", label: "Беларуская" },
  ];

  const loadData = useCallback(async () => {
    if (!home) {
      setAllBills([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      const [allBillsData, categoriesData] = await Promise.all([
        billApi.getByHomeId(home.id).catch(() => []),
        billCategoryApi.getAll(home.id).catch(() => []),
      ]);
      setAllBills(allBillsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeRefresh(["BILL", "BILL_CATEGORY"], loadData);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetScanState = () => {
    setSelectedImageUri(null);
    setSelectedFileType(null);
    setSelectedFileName(null);
    setOcrResult(null);
    setScanning(false);
  };

  const handleOpenCreateModal = () => {
    resetScanState();
    setNewBillAmount("");
    setNewBillDescription("");
    setSelectedCategoryId(null);
    setSplitUserIds([]);
    setSplitMode("equal");
    setManualAmounts({});
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    resetScanState();
    setShowCreateModal(false);
  };

  const handleCreateCategory = async () => {
    if (!home || !newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      await billCategoryApi.create(home.id, {
        name: newCategoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
      setNewCategoryName("");
      setSelectedIcon("wallet");
      setShowCategoryModal(false);
      await loadData();
    } catch (error) {
      console.error("Error creating category:", error);
      alert(t.common.error, t.budget.failedToCreate);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!home) return;
    alert(t.budget.deleteCategory, t.budget.deleteCategoryConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await billCategoryApi.delete(home.id, categoryId);
            await loadData();
          } catch (error) {
            console.error(error);
            alert(t.common.error, t.budget.failedToDelete);
          }
        },
      },
    ]);
  };

  const buildSplits = (
    userIds: number[],
    mode: "equal" | "manual",
    amounts: Record<number, string>,
    totalAmount: number,
  ) => {
    if (userIds.length === 0) return undefined;
    if (mode === "equal") {
      const perPerson = totalAmount / userIds.length;
      return userIds.map((uid) => ({ userId: uid, amount: Math.round(perPerson * 100) / 100 }));
    }
    return userIds.map((uid) => ({ userId: uid, amount: parseFloat(amounts[uid] || "0") }));
  };

  const handleCreateBill = async () => {
    if (!home || !newBillAmount || !selectedCategoryId) return;

    setCreating(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const category = categories.find((c) => c.id === selectedCategoryId);
      const totalAmount = parseFloat(newBillAmount);
      const splits = buildSplits(splitUserIds, splitMode, manualAmounts, totalAmount);

      // Upload receipt image if available
      let receiptImageUrl: string | undefined;
      if (selectedImageUri && selectedFileType === "image") {
        try {
          const formData = new FormData();
          formData.append("image", {
            uri: selectedImageUri,
            type: "image/jpeg",
            name: "receipt.jpg",
          } as any);
          const { url } = await imageApi.upload(formData);
          receiptImageUrl = url;
        } catch (e) {
          console.error("Failed to upload receipt image:", e);
        }
      }

      await billApi.create(home.id, {
        type: category?.name || "Expense",
        billCategoryId: selectedCategoryId,
        description: newBillDescription || undefined,
        receiptImage: receiptImageUrl,
        totalAmount: totalAmount,
        periodStart: now.toISOString(),
        periodEnd: endDate.toISOString(),
        ocrData: ocrResult || {},
        splits,
      });

      setNewBillAmount("");
      setSelectedCategoryId(null);
      resetScanState();
      setShowCreateModal(false);
      await loadData();
    } catch (error) {
      console.error("Error creating bill:", error);
      alert(t.common.error, t.budget.failedToCreate);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBill = async (billId: number) => {
    if (!home) return;
    alert(t.budget.deleteBill, t.budget.deleteBillConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await billApi.delete(home.id, billId);
            await loadData();
          } catch (error) {
            console.error(error);
            alert(t.common.error, t.budget.failedToDelete);
          }
        },
      },
    ]);
  };

  const handleOpenEditSplits = (bill: Bill) => {
    setEditingBill(bill);
    const existingSplits = bill.splits ?? [];
    const userIds = existingSplits.map((s) => s.userId);
    setEditSplitUserIds(userIds);

    // Detect if existing splits are equal
    if (existingSplits.length > 0) {
      const firstAmount = existingSplits[0].amount;
      const allEqual = existingSplits.every((s) => Math.abs(s.amount - firstAmount) < 0.01);
      setEditSplitMode(allEqual ? "equal" : "manual");
    } else {
      setEditSplitMode("equal");
    }

    const amounts: Record<number, string> = {};
    existingSplits.forEach((s) => {
      amounts[s.userId] = s.amount.toString();
    });
    setEditManualAmounts(amounts);
    setShowEditSplitsModal(true);
  };

  const handleSaveEditSplits = async () => {
    if (!home || !editingBill) return;
    setSavingSplits(true);
    try {
      const splits = buildSplits(editSplitUserIds, editSplitMode, editManualAmounts, editingBill.totalAmount) ?? [];
      await billApi.updateSplits(home.id, editingBill.id, splits);
      setShowEditSplitsModal(false);
      setEditingBill(null);
      await loadData();
    } catch (error) {
      console.error("Error updating splits:", error);
      alert(t.common.error, t.budget.failedToCreate);
    } finally {
      setSavingSplits(false);
    }
  };

  const handleMarkSplitPaid = async (bill: Bill, split: BillSplit) => {
    if (!home) return;
    try {
      await billApi.markSplitPaid(home.id, bill.id, split.id);
      await loadData();
    } catch (error) {
      console.error("Error marking split paid:", error);
    }
  };

  // Step 1a: Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
        setSelectedFileType("image");
        setSelectedFileName("receipt.jpg");
        setOcrResult(null);
      }
    } catch (error) {
      console.error("Camera error:", error);
    }
  };

  // Step 1b: Pick file from device
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isPdf = asset.mimeType === "application/pdf" || asset.name?.toLowerCase().endsWith(".pdf");
        setSelectedImageUri(asset.uri);
        setSelectedFileType(isPdf ? "pdf" : "image");
        setSelectedFileName(asset.name);
        setOcrResult(null);
      }
    } catch (error) {
      console.error("File picker error:", error);
    }
  };

  // Step 2: Upload + process with OCR
  const handleProcessReceipt = useCallback(async () => {
    if (!selectedImageUri) return;

    setScanning(true);
    try {
      let result: OCRResult;

      const fileName = selectedFileName || (selectedFileType === "pdf" ? "receipt.pdf" : "receipt.jpg");
      const ext = fileName.split(".").pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        bmp: "image/bmp",
      };
      const mimeType = mimeMap[ext || ""] || "image/jpeg";

      result = await ocrApi.process(selectedImageUri, fileName, mimeType, selectedLanguage);

      setOcrResult(result);

      if (result.total) {
        setNewBillAmount(result.total.toString());
      } else {
        alert("OCR", t.budget.noTotalDetected);
      }
    } catch (error) {
      console.error("Scan error:", error);
      alert(t.common.error, t.budget.scanFailed);
    } finally {
      setScanning(false);
    }
  }, [
    alert,
    selectedFileName,
    selectedFileType,
    selectedImageUri,
    selectedLanguage,
    t.budget.noTotalDetected,
    t.budget.scanFailed,
    t.common.error,
  ]);

  // Auto-process receipt when image is selected
  useEffect(() => {
    if (selectedImageUri && !ocrResult && !scanning) {
      handleProcessReceipt();
    }
  }, [selectedImageUri, ocrResult, scanning, handleProcessReceipt]);

  const getCategoryColor = (categoryId?: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || theme.accent.yellow;
  };

  const getCategoryName = (bill: Bill) => {
    if (bill.billCategory) return bill.billCategory.name;
    const category = categories.find((c) => c.id === bill.billCategoryId);
    return category?.name || bill.type;
  };

  const getMemberName = (userId: number) => {
    const m = members.find((m) => m.userId === userId);
    return m?.user?.name ?? `User #${userId}`;
  };

  const toggleSplitUser = (userId: number, ids: number[], setIds: (v: number[]) => void) => {
    if (ids.includes(userId)) {
      setIds(ids.filter((id) => id !== userId));
    } else {
      setIds([...ids, userId]);
    }
  };

  const canEditBill = (bill: Bill) => {
    return isAdmin || bill.uploadedBy === user?.id;
  };

  const periodBills = allBills.filter((bill) => {
    const billDate = new Date(bill.createdAt);
    if (budgetPeriod === "all") return true;
    if (budgetPeriod === "year") return billDate.getFullYear() === periodCursor.getFullYear();
    return billDate.getFullYear() === periodCursor.getFullYear() && billDate.getMonth() === periodCursor.getMonth();
  });

  const visibleBills =
    filterCategoryId === null ? periodBills : periodBills.filter((bill) => bill.billCategoryId === filterCategoryId);

  const totalSpend = visibleBills.reduce((sum, b) => sum + b.totalAmount, 0);
  const monthlyTrends = buildBudgetTrends(allBills, budgetPeriod, periodCursor);
  const chartData =
    filterCategoryId === null
      ? categories
          .map((cat) => {
            const catBills = periodBills.filter((b) => b.billCategoryId === cat.id);
            const total = catBills.reduce((sum, b) => sum + b.totalAmount, 0);
            return {
              value: total,
              color: cat.color || theme.accent.yellow,
              name: cat.name,
            };
          })
          .filter((d) => d.value > 0)
      : (() => {
          const activeCategory = categories.find((cat) => cat.id === filterCategoryId);
          return activeCategory && totalSpend > 0
            ? [
                {
                  value: totalSpend,
                  color: activeCategory.color || theme.accent.yellow,
                  name: activeCategory.name,
                },
              ]
            : [];
        })();

  const uncategorizedBills = filterCategoryId === null ? periodBills.filter((b) => !b.billCategoryId) : [];
  if (uncategorizedBills.length > 0) {
    const total = uncategorizedBills.reduce((sum, b) => sum + b.totalAmount, 0);
    chartData.push({
      value: total,
      color: theme.textSecondary,
      name: t.budget.uncategorized,
    });
  }

  // Bills that have OCR data with actual content
  const receiptBills = visibleBills.filter((b) => {
    if (!b.ocrData) return false;
    const data = b.ocrData as Record<string, any>;
    return data.vendor || data.total || (data.items && data.items.length > 0);
  });

  // Render split user picker (reused in create and edit modals)
  const renderSplitPicker = (
    selectedIds: number[],
    setSelectedIds: (v: number[]) => void,
    mode: "equal" | "manual",
    setMode: (v: "equal" | "manual") => void,
    amounts: Record<number, string>,
    setAmounts: (v: Record<number, string>) => void,
    totalAmount: number,
  ) => (
    <View className="mb-5">
      <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>
        {t.budget.splitBetween}
      </Text>

      {/* Member chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 8 }}>
        {members.map((m) => {
          const isSelected = selectedIds.includes(m.userId);
          return (
            <TouchableOpacity
              key={m.userId}
              className="px-3 py-2 rounded-xl border flex-row items-center gap-1.5"
              style={{
                backgroundColor: isSelected ? theme.accent.pinkLight : theme.surface,
                borderColor: isSelected ? theme.accent.pink : theme.border,
              }}
              onPress={() => toggleSplitUser(m.userId, selectedIds, setSelectedIds)}
            >
              {isSelected && <Check size={14} color={theme.accent.pink} />}
              <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                {m.user?.name ?? `User #${m.userId}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Split mode toggle */}
      {selectedIds.length > 0 && (
        <View>
          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              className="flex-1 py-2 rounded-xl items-center border"
              style={{
                backgroundColor: mode === "equal" ? theme.text : "transparent",
                borderColor: mode === "equal" ? theme.text : theme.border,
              }}
              onPress={() => setMode("equal")}
            >
              <Text
                className="text-sm font-manrope-semibold"
                style={{ color: mode === "equal" ? theme.background : theme.textSecondary }}
              >
                {t.budget.equalSplit}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2 rounded-xl items-center border"
              style={{
                backgroundColor: mode === "manual" ? theme.text : "transparent",
                borderColor: mode === "manual" ? theme.text : theme.border,
              }}
              onPress={() => setMode("manual")}
            >
              <Text
                className="text-sm font-manrope-semibold"
                style={{ color: mode === "manual" ? theme.background : theme.textSecondary }}
              >
                {t.budget.manualSplit}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "equal" && totalAmount > 0 && (
            <View className="p-3 rounded-xl" style={{ backgroundColor: theme.background }}>
              {selectedIds.map((uid) => (
                <View key={uid} className="flex-row justify-between py-1">
                  <Text className="text-sm" style={{ color: theme.text }}>
                    {getMemberName(uid)}
                  </Text>
                  <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                    {formatCurrencyAmount(totalAmount / selectedIds.length, homeCurrency)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {mode === "manual" && (
            <View className="gap-2">
              {selectedIds.map((uid, _index) => {
                const otherIds = selectedIds.filter((id) => id !== uid);
                const otherSum = otherIds.reduce((sum, id) => sum + (parseFloat(amounts[id] || "0") || 0), 0);
                const allOthersFilled =
                  otherIds.length > 0 && otherIds.every((id) => amounts[id] && parseFloat(amounts[id]) > 0);
                const isLastEmpty = !amounts[uid] && allOthersFilled && totalAmount > 0;
                const autoValue = isLastEmpty ? Math.max(0, totalAmount - otherSum).toFixed(2) : "";

                return (
                  <View key={uid} className="flex-row items-center gap-3">
                    <Text className="text-sm flex-1" style={{ color: theme.text }}>
                      {getMemberName(uid)}
                    </Text>
                    <Input
                      placeholder={autoValue || "0.00"}
                      value={amounts[uid] || ""}
                      onChangeText={(v) => {
                        const newAmounts = { ...amounts, [uid]: v };
                        // Auto-fill the last empty field
                        const remaining = selectedIds.filter((id) => id !== uid && !newAmounts[id]);
                        if (remaining.length === 1 && totalAmount > 0) {
                          const filledSum = selectedIds
                            .filter((id) => id !== remaining[0])
                            .reduce((sum, id) => sum + (parseFloat(newAmounts[id] || "0") || 0), 0);
                          const remainder = Math.max(0, totalAmount - filledSum);
                          if (remainder > 0) {
                            newAmounts[remaining[0]] = remainder.toFixed(2);
                          }
                        }
                        setAmounts(newAmounts);
                      }}
                      keyboardType="numeric"
                      style={{ width: 100 }}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const shiftPeriod = (direction: number) => {
    setPeriodCursor((current) => {
      const next = new Date(current);
      if (budgetPeriod === "year") {
        next.setFullYear(next.getFullYear() + direction);
      } else if (budgetPeriod === "month") {
        next.setMonth(next.getMonth() + direction);
      }
      return next;
    });
  };

  const canNavigatePeriod = budgetPeriod !== "all";
  const periodTitle =
    budgetPeriod === "month"
      ? t.budget.currentMonth
      : budgetPeriod === "year"
        ? String(periodCursor.getFullYear())
        : t.budget.allTime;

  if (isLoading) {
    return <BudgetSkeleton />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: insets.top + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
      >
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-manrope-bold" style={{ color: theme.text }}>
            {t.budget.title}
          </Text>
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              className="px-4 py-2 rounded-xl justify-center items-center"
              style={{ backgroundColor: theme.surface }}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text className="text-xs font-manrope-semibold" style={{ color: theme.text }}>
                + {t.budget.category}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-2 rounded-xl justify-center items-center"
              style={{ backgroundColor: theme.accent.pink }}
              onPress={handleOpenCreateModal}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {totalSpend > 0 && (
          <View className="items-center mb-4">
            <DonutChart data={chartData} total={totalSpend} theme={theme} />
          </View>
        )}

        {monthlyTrends.length > 0 && (
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 py-3 mb-6 rounded-2xl"
            style={{ backgroundColor: theme.surface }}
            onPress={() => setShowTrendModal(true)}
            activeOpacity={0.7}
          >
            <TrendingUp size={18} color={theme.accent.purple} />
            <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>
              {t.budget.monthlyTrend}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="flex-row items-center justify-center gap-2 py-3 mb-4 rounded-2xl"
          style={{ backgroundColor: theme.surface }}
          onPress={() => {
            setBudgetPeriod("month");
            setPeriodCursor(new Date());
          }}
          activeOpacity={0.7}
        >
          <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>
            {t.budget.currentMonth}
          </Text>
        </TouchableOpacity>

        <View className="mb-6 rounded-3xl p-4" style={{ backgroundColor: theme.surface }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-manrope-bold uppercase" style={{ color: theme.textSecondary }}>
              {t.budget.period}
            </Text>
          </View>

          <View className="flex-row gap-2 mb-3">
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-2xl items-center"
              style={{
                backgroundColor: budgetPeriod === "month" ? theme.text : theme.background,
              }}
              onPress={() => setBudgetPeriod("month")}
            >
              <Text
                className="text-sm font-manrope-semibold"
                style={{ color: budgetPeriod === "month" ? theme.background : theme.text }}
              >
                {t.budget.month}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-2xl items-center"
              style={{
                backgroundColor: budgetPeriod === "year" ? theme.text : theme.background,
              }}
              onPress={() => setBudgetPeriod("year")}
            >
              <Text
                className="text-sm font-manrope-semibold"
                style={{ color: budgetPeriod === "year" ? theme.background : theme.text }}
              >
                {t.budget.year}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2.5 rounded-2xl items-center"
              style={{
                backgroundColor: budgetPeriod === "all" ? theme.text : theme.background,
              }}
              onPress={() => setBudgetPeriod("all")}
            >
              <Text
                className="text-sm font-manrope-semibold"
                style={{ color: budgetPeriod === "all" ? theme.background : theme.text }}
              >
                {t.budget.allTime}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: canNavigatePeriod ? theme.background : theme.surface }}
              onPress={() => shiftPeriod(-1)}
              disabled={!canNavigatePeriod}
            >
              <ChevronLeft size={20} color={canNavigatePeriod ? theme.text : theme.textSecondary} />
            </TouchableOpacity>
            <Text className="text-sm font-manrope-semibold" style={{ color: theme.textSecondary }}>
              {budgetPeriod === "month"
                ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(periodCursor)
                : budgetPeriod === "year"
                  ? String(periodCursor.getFullYear())
                  : t.budget.allTime}
            </Text>
            <TouchableOpacity
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: canNavigatePeriod ? theme.background : theme.surface }}
              onPress={() => shiftPeriod(1)}
              disabled={!canNavigatePeriod}
            >
              <ChevronRight size={20} color={canNavigatePeriod ? theme.text : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-manrope-bold uppercase mb-3" style={{ color: theme.textSecondary }}>
            {t.budget.categories}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            <TouchableOpacity
              className="flex-row items-center px-3 py-2 rounded-2xl border gap-2"
              style={{
                backgroundColor: filterCategoryId === null ? theme.text : theme.surface,
                borderColor: filterCategoryId === null ? theme.text : theme.border,
              }}
              onPress={() => setFilterCategoryId(null)}
            >
              <Text
                className="font-manrope-semibold text-sm"
                style={{ color: filterCategoryId === null ? theme.background : theme.text }}
              >
                {t.common.all}
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                className="flex-row items-center px-3 py-2 rounded-2xl border gap-2"
                style={{
                  backgroundColor: filterCategoryId === cat.id ? theme.text : theme.surface,
                  borderColor: filterCategoryId === cat.id ? theme.text : theme.border,
                }}
                onPress={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)}
                onLongPress={() => handleDeleteCategory(cat.id)}
              >
                {getBillCategoryIcon(cat.icon, 14, filterCategoryId === cat.id ? theme.background : theme.text)}
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || theme.accent.yellow }} />
                <Text
                  className="font-manrope-semibold text-sm"
                  style={{ color: filterCategoryId === cat.id ? theme.background : theme.text }}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
            {categories.length === 0 && (
              <Text className="italic" style={{ color: theme.textSecondary }}>
                {t.budget.noCategories}
              </Text>
            )}
          </ScrollView>
        </View>

        {/* Bills list */}
        <View className="gap-3">
          {visibleBills.map((bill) => {
            const isExpanded = expandedBillId === bill.id;
            const splits = bill.splits ?? [];
            const userSplit = splits.find((s) => s.userId === user?.id);
            const uploaderName = bill.user?.name ?? getMemberName(bill.uploadedBy);

            return (
              <TouchableOpacity
                key={bill.id}
                className="p-4 rounded-2xl"
                style={{ backgroundColor: theme.surface }}
                onPress={() => setExpandedBillId(isExpanded ? null : bill.id)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-full justify-center items-center"
                    style={{ backgroundColor: getCategoryColor(bill.billCategoryId) }}
                  >
                    {getBillCategoryIcon(bill.billCategory?.icon, 20, "#1C1C1E")}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-manrope-semibold mb-0.5" style={{ color: theme.text }}>
                      {getCategoryName(bill)}
                    </Text>
                    <Text className="text-xs" style={{ color: theme.textSecondary }}>
                      {uploaderName} · {new Date(bill.createdAt).toLocaleDateString("pl-PL")}
                    </Text>
                    {bill.description ? (
                      <Text className="text-xs mt-0.5" style={{ color: theme.textSecondary }} numberOfLines={1}>
                        {bill.description}
                      </Text>
                    ) : null}
                    {bill.periodStart && bill.periodEnd && (
                      <Text className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>
                        {new Date(bill.periodStart).toLocaleDateString("pl-PL")} –{" "}
                        {new Date(bill.periodEnd).toLocaleDateString("pl-PL")}
                      </Text>
                    )}
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-manrope-bold" style={{ color: theme.text }}>
                      {formatCurrencyAmount(bill.totalAmount, homeCurrency)}
                    </Text>
                    {userSplit && (
                      <Text className="text-xs" style={{ color: userSplit.paid ? "#22C55E" : theme.accent.pink }}>
                        {t.budget.yourShare}: {formatCurrencyAmount(userSplit.amount, homeCurrency)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteBill(bill.id)} className="p-0.5">
                    <Trash size={18} color={theme.accent.pink || "#FF3B30"} />
                  </TouchableOpacity>
                </View>

                {/* Expanded: splits details */}
                {isExpanded && splits.length > 0 && (
                  <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-1.5">
                        <Users size={14} color={theme.textSecondary} />
                        <Text className="text-xs font-manrope-bold uppercase" style={{ color: theme.textSecondary }}>
                          {t.budget.splitBetween}
                        </Text>
                      </View>
                      {canEditBill(bill) && (
                        <TouchableOpacity
                          className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
                          style={{ backgroundColor: theme.background }}
                          onPress={() => handleOpenEditSplits(bill)}
                        >
                          <Pencil size={12} color={theme.textSecondary} />
                          <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                            {t.budget.editSplits}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {splits.map((split) => (
                      <View key={split.id} className="flex-row items-center justify-between py-1.5">
                        <View className="flex-row items-center gap-2 flex-1">
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: split.paid ? "#22C55E" : theme.accent.pink }}
                          />
                          <Text className="text-sm" style={{ color: theme.text }}>
                            {split.user?.name ?? getMemberName(split.userId)}
                          </Text>
                        </View>
                        <Text className="text-sm font-manrope-semibold mr-2" style={{ color: theme.text }}>
                          {formatCurrencyAmount(split.amount, homeCurrency)}
                        </Text>
                        {!split.paid && canEditBill(bill) && (
                          <TouchableOpacity
                            className="px-2 py-1 rounded-lg"
                            style={{ backgroundColor: "#22C55E20" }}
                            onPress={() => handleMarkSplitPaid(bill, split)}
                          >
                            <Text className="text-xs font-manrope-semibold" style={{ color: "#22C55E" }}>
                              {t.budget.markAsPaid}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {split.paid && (
                          <Text className="text-xs font-manrope-semibold" style={{ color: "#22C55E" }}>
                            {t.budget.paid}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Show split indicator when collapsed */}
                {!isExpanded && splits.length > 0 && (
                  <View className="flex-row items-center mt-2 gap-1">
                    <Users size={12} color={theme.textSecondary} />
                    <Text className="text-xs" style={{ color: theme.textSecondary }}>
                      {splits.length} {splits.length === 1 ? "split" : "splits"} · {splits.filter((s) => s.paid).length}{" "}
                      {t.budget.paid.toLowerCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {visibleBills.length === 0 && (
            <Text className="text-center mt-10" style={{ color: theme.textSecondary }}>
              {t.budget.noExpenses}
            </Text>
          )}
        </View>

        {/* Receipt History Section */}
        {receiptBills.length > 0 && (
          <View className="mt-8">
            <Text className="text-sm font-manrope-bold uppercase mb-3" style={{ color: theme.textSecondary }}>
              {t.budget.receiptHistory}
            </Text>
            <View className="gap-3">
              {receiptBills.map((bill) => {
                const data = bill.ocrData as Record<string, any>;
                const isExpanded = expandedReceiptId === bill.id;
                const items = data.items || [];

                return (
                  <TouchableOpacity
                    key={bill.id}
                    className="p-4 rounded-2xl"
                    style={{ backgroundColor: theme.surface }}
                    onPress={() => setExpandedReceiptId(isExpanded ? null : bill.id)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-10 h-10 rounded-full justify-center items-center"
                        style={{ backgroundColor: theme.accent.yellow }}
                      >
                        <Receipt size={20} color="#1C1C1E" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-manrope-semibold mb-0.5" style={{ color: theme.text }}>
                          {data.vendor || getCategoryName(bill)}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.textSecondary }}>
                          {data.date || new Date(bill.createdAt).toLocaleDateString("pl-PL")}
                          {items.length > 0 && ` \u2022 ${items.length} ${t.budget.items.toLowerCase()}`}
                        </Text>
                      </View>
                      <Text className="text-lg font-manrope-bold mr-2" style={{ color: theme.text }}>
                        {formatCurrencyAmount(bill.totalAmount, homeCurrency)}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={18} color={theme.textSecondary} />
                      ) : (
                        <ChevronDown size={18} color={theme.textSecondary} />
                      )}
                    </View>

                    {isExpanded && items.length > 0 && (
                      <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                        {items.map((item: any, idx: number) => (
                          <View key={idx} className="flex-row justify-between py-1.5">
                            <Text className="text-sm flex-1" style={{ color: theme.text }}>
                              {item.name}
                              {item.quantity > 1 && (
                                <Text style={{ color: theme.textSecondary }}> x{item.quantity}</Text>
                              )}
                            </Text>
                            <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                              {formatCurrencyAmount(item.price || 0, homeCurrency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {isExpanded && bill.receiptImage && (
                      <TouchableOpacity
                        className="flex-row items-center justify-center gap-2 mt-3 py-2.5 rounded-xl"
                        style={{ backgroundColor: theme.background }}
                        onPress={() => {
                          setReceiptImageUrl(bill.receiptImage!);
                          setShowReceiptImageModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Eye size={16} color={theme.accent.purple} />
                        <Text className="text-sm font-manrope-semibold" style={{ color: theme.accent.purple }}>
                          {t.budget.viewReceipt}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Expense Modal */}
      <Modal visible={showCreateModal} onClose={handleCloseCreateModal} title={t.budget.addExpense} height="full">
        <View className="pt-2.5">
          {/* Scan Receipt Section */}
          <View className="mb-6">
            <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>
              {t.budget.scanReceipt}
            </Text>

            {/* Step 1: Pick image or PDF */}
            {!selectedImageUri ? (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-6 rounded-xl justify-center items-center gap-2"
                  style={{
                    backgroundColor: theme.surface,
                    borderStyle: "dashed",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={handleTakePhoto}
                >
                  <Camera size={28} color={theme.textSecondary} />
                  <Text className="font-manrope-semibold text-center" style={{ color: theme.textSecondary }}>
                    {t.budget.takePhoto}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-6 rounded-xl justify-center items-center gap-2"
                  style={{
                    backgroundColor: theme.surface,
                    borderStyle: "dashed",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={handlePickFile}
                >
                  <File size={28} color={theme.textSecondary} />
                  <Text className="font-manrope-semibold text-center" style={{ color: theme.textSecondary }}>
                    {t.budget.uploadReceipt}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* File preview */}
                {selectedFileType === "pdf" ? (
                  <View
                    className="rounded-xl p-4 mb-3 flex-row items-center gap-3"
                    style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
                  >
                    <FileText size={32} color={theme.accent.pink} />
                    <View className="flex-1">
                      <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }} numberOfLines={1}>
                        {selectedFileName || "document.pdf"}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.textSecondary }}>
                        PDF
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    className="rounded-xl overflow-hidden mb-3"
                    style={{ borderWidth: 1, borderColor: theme.border }}
                  >
                    <Image
                      source={{ uri: selectedImageUri }}
                      style={{ width: "100%", height: 160 }}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <TouchableOpacity
                  className="mb-3"
                  onPress={() => {
                    resetScanState();
                  }}
                >
                  <Text className="text-sm font-manrope-semibold text-center" style={{ color: theme.accent.pink }}>
                    {t.budget.changePhoto}
                  </Text>
                </TouchableOpacity>

                {/* Auto-scanning indicator */}
                {!ocrResult && scanning && (
                  <Button
                    title={t.budget.processing}
                    onPress={() => {}}
                    loading={true}
                    disabled={true}
                    variant="primary"
                  />
                )}

                {/* Retry with different language (after result) */}
                {ocrResult && (
                  <View className="mb-2">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mb-3"
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                          key={lang.code}
                          onPress={() => {
                            setSelectedLanguage(lang.code);
                            setOcrResult(null);
                          }}
                          className="px-3 py-1.5 rounded-full border"
                          style={{
                            backgroundColor: selectedLanguage === lang.code ? theme.text : "transparent",
                            borderColor: selectedLanguage === lang.code ? theme.text : theme.border,
                          }}
                        >
                          <Text
                            style={{
                              color: selectedLanguage === lang.code ? theme.background : theme.textSecondary,
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            {lang.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Step 3: OCR Results preview */}
                {ocrResult && (
                  <View className="p-4 rounded-xl mb-2" style={{ backgroundColor: theme.background }}>
                    <Text className="text-xs font-manrope-bold uppercase mb-3" style={{ color: theme.textSecondary }}>
                      {t.budget.scanResults}
                    </Text>

                    {ocrResult.vendor && (
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>
                          {t.budget.vendor}
                        </Text>
                        <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                          {ocrResult.vendor}
                        </Text>
                      </View>
                    )}

                    {ocrResult.date && (
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>
                          {t.budget.date}
                        </Text>
                        <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                          {ocrResult.date}
                        </Text>
                      </View>
                    )}

                    {ocrResult.items && ocrResult.items.length > 0 && (
                      <View className="mt-1 pt-2" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                        <Text
                          className="text-xs font-manrope-bold uppercase mb-2"
                          style={{ color: theme.textSecondary }}
                        >
                          {t.budget.items} ({ocrResult.items.length})
                        </Text>
                        {ocrResult.items.map((item, idx) => (
                          <View key={idx} className="flex-row justify-between py-1">
                            <Text className="text-sm flex-1" style={{ color: theme.text }}>
                              {item.name}
                              {item.quantity > 1 && (
                                <Text style={{ color: theme.textSecondary }}> x{item.quantity}</Text>
                              )}
                            </Text>
                            <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                              {formatCurrencyAmount(item.price, homeCurrency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {ocrResult.total > 0 && (
                      <View
                        className="flex-row justify-between mt-2 pt-2"
                        style={{ borderTopWidth: 1, borderTopColor: theme.border }}
                      >
                        <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>
                          {t.common.total}
                        </Text>
                        <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>
                          {formatCurrencyAmount(ocrResult.total, homeCurrency)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Manual entry / Category & Amount */}
          <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>
            {t.budget.category}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View className="flex-row gap-2.5">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className="px-4 py-2.5 rounded-xl border"
                  style={[
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    selectedCategoryId === cat.id && {
                      borderColor: theme.accent.pink,
                      backgroundColor: theme.accent.pinkLight,
                    },
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <View className="flex-row items-center gap-2">
                    {getBillCategoryIcon(cat.icon, 14, theme.text)}
                    <Text style={{ color: theme.text }}>{cat.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                className="w-10 h-10 rounded-xl border border-dashed justify-center items-center"
                style={{ borderColor: theme.textSecondary }}
                onPress={() => setShowCategoryModal(true)}
              >
                <Plus size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <Input
            label={t.budget.amount}
            placeholder={t.budget.amountPlaceholder}
            value={newBillAmount}
            onChangeText={setNewBillAmount}
            keyboardType="numeric"
          />

          <View className="mt-4">
            <Input
              label={t.budget.description}
              placeholder={t.budget.descriptionPlaceholder}
              value={newBillDescription}
              onChangeText={setNewBillDescription}
            />
          </View>

          {/* Split Between section */}
          <View className="mt-5">
            {renderSplitPicker(
              splitUserIds,
              setSplitUserIds,
              splitMode,
              setSplitMode,
              manualAmounts,
              setManualAmounts,
              parseFloat(newBillAmount) || 0,
            )}
          </View>

          <Button
            title={t.budget.addExpense}
            onPress={handleCreateBill}
            loading={creating}
            disabled={!newBillAmount || !selectedCategoryId}
            variant="pink"
            style={{ marginTop: 20 }}
          />
        </View>
      </Modal>

      {/* Edit Splits Modal */}
      <Modal
        visible={showEditSplitsModal}
        onClose={() => {
          setShowEditSplitsModal(false);
          setEditingBill(null);
        }}
        title={t.budget.editSplits}
        height="full"
      >
        <View className="pt-2.5">
          {editingBill && (
            <>
              <View className="p-3 rounded-xl mb-4" style={{ backgroundColor: theme.background }}>
                <Text className="text-base font-manrope-semibold" style={{ color: theme.text }}>
                  {getCategoryName(editingBill)}
                </Text>
                <Text className="text-lg font-manrope-bold" style={{ color: theme.text }}>
                  {formatCurrencyAmount(editingBill.totalAmount, homeCurrency)}
                </Text>
              </View>

              {renderSplitPicker(
                editSplitUserIds,
                setEditSplitUserIds,
                editSplitMode,
                setEditSplitMode,
                editManualAmounts,
                setEditManualAmounts,
                editingBill.totalAmount,
              )}

              <Button
                title={t.common.save}
                onPress={handleSaveEditSplits}
                loading={savingSplits}
                variant="pink"
                style={{ marginTop: 20 }}
              />
            </>
          )}
        </View>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={t.budget.newCategory}
        height="full"
      >
        <View className="pt-2.5">
          <Input
            label={t.budget.categoryName}
            placeholder={t.budget.categoryNamePlaceholder}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />

          <Text className="text-xs font-manrope-bold uppercase mb-2 mt-5" style={{ color: theme.textSecondary }}>
            Icon
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            {BILL_CATEGORY_ICON_OPTIONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                className="w-10 h-10 rounded-full justify-center items-center border"
                style={{
                  backgroundColor: selectedIcon === icon ? theme.accent.purple : theme.surface,
                  borderColor: selectedIcon === icon ? theme.text : theme.border,
                }}
                onPress={() => setSelectedIcon(icon)}
              >
                {getBillCategoryIcon(icon, 20, selectedIcon === icon ? "#1C1C1E" : theme.text)}
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-xs font-manrope-bold uppercase mb-2 mt-5" style={{ color: theme.textSecondary }}>
            {t.budget.color}
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                className="w-8 h-8 rounded-full"
                style={[
                  { backgroundColor: color },
                  selectedColor === color && { borderWidth: 2, borderColor: theme.text },
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          <Button
            title={t.budget.createCategory}
            onPress={handleCreateCategory}
            loading={creatingCategory}
            disabled={!newCategoryName.trim()}
            variant="yellow"
            style={{ marginTop: 20 }}
          />
        </View>
      </Modal>

      {/* Monthly Trend Modal */}
      <Modal
        visible={showTrendModal}
        onClose={() => setShowTrendModal(false)}
        title={t.budget.monthlyTrend}
        height="full"
      >
        <View className="pt-2.5">
          <Text className="text-sm font-manrope mb-4" style={{ color: theme.textSecondary }}>
            {periodTitle}
          </Text>
          <View className="items-center mb-6">
            <BarChart data={monthlyTrends} width={320} height={220} theme={theme} />
          </View>
          <View className="gap-2">
            {monthlyTrends.map((item, idx) => (
              <View
                key={idx}
                className="flex-row justify-between py-2 px-3 rounded-xl"
                style={{ backgroundColor: theme.background }}
              >
                <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                  {item.month}
                </Text>
                <Text
                  className="text-sm font-manrope-bold"
                  style={{ color: idx === monthlyTrends.length - 1 ? theme.accent.pink : theme.text }}
                >
                  {formatCurrencyAmount(item.total, homeCurrency)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* Receipt Image Viewer Modal */}
      <Modal
        visible={showReceiptImageModal}
        onClose={() => {
          setShowReceiptImageModal(false);
          setReceiptImageUrl(null);
        }}
        title={t.budget.viewReceipt}
        height="full"
      >
        {receiptImageUrl && (
          <View className="flex-1 items-center justify-center pt-4">
            <Image source={{ uri: receiptImageUrl }} style={{ width: "100%", height: 500 }} resizeMode="contain" />
          </View>
        )}
      </Modal>
    </View>
  );
}
