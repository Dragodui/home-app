import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Home,
  Plus,
  Receipt,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import BillCard from "@/components/budget/bill-card";
import BillDetailsModal from "@/components/budget/bill-details-modal";
import { BarChart, DonutChart } from "@/components/budget/budget-charts";
import {
  BILL_CATEGORY_ICON_OPTIONS,
  type BillRecurrenceType,
  type BudgetPeriod,
  type BudgetScope,
  buildBudgetTrends,
  getBillCategoryIcon,
  type SplitMode,
} from "@/components/budget/budget-utils";
import ReceiptCard from "@/components/budget/receipt-card";
import ReceiptScanner from "@/components/budget/receipt-scanner";
import RecurrenceFields from "@/components/budget/recurrence-fields";
import SplitPicker from "@/components/budget/split-picker";
import { BudgetSkeleton } from "@/components/skeletons";
import {
  ActionSheet,
  Button,
  Card,
  CategoryFormModal,
  ChipSelect,
  EmptyState,
  FabMenu,
  IconButton,
  InfoRow,
  Input,
  Modal,
  ResponsiveGrid,
  Section,
  SegmentedControl,
  type SheetAction,
  TabHeader,
  TabScreen,
  Text,
  useAlert,
} from "@/components/ui";
import { PICKER_COLORS } from "@/constants/colors";
import { billApi, billCategoryApi, imageApi, ocrApi } from "@/lib/api";
import { formatCurrencyAmount, getHomeCurrency } from "@/lib/currency";
import type { Bill, BillCategory, BillSplit, HomeMembership, OCRResult } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function BudgetScreen() {
  const { home, isAdmin } = useHome();
  const homeCurrency = getHomeCurrency(home);
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const { alert } = useAlert();
  const { width: windowWidth } = useResponsiveLayout();

  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [budgetScope, setBudgetScope] = useState<BudgetScope>("home");
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("month");
  const [periodCursor, setPeriodCursor] = useState(() => new Date());
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newBillPublic, setNewBillPublic] = useState(true);
  const [newBillDescription, setNewBillDescription] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBillIsRegular, setNewBillIsRegular] = useState(false);
  const [newBillRecurrenceType, setNewBillRecurrenceType] = useState<BillRecurrenceType>("monthly");
  const [newBillRecurrenceDay, setNewBillRecurrenceDay] = useState(new Date().getDate());
  const [creating, setCreating] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>(BILL_CATEGORY_ICON_OPTIONS[0].value);
  const [selectedColor, setSelectedColor] = useState(theme.accent.yellow);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [selectedCategoryForActions, setSelectedCategoryForActions] = useState<BillCategory | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BillCategory | null>(null);
  const [savingCategoryEdit, setSavingCategoryEdit] = useState(false);

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
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [manualAmounts, setManualAmounts] = useState<Record<number, string>>({});

  // Edit splits modal
  const [showEditSplitsModal, setShowEditSplitsModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editSplitUserIds, setEditSplitUserIds] = useState<number[]>([]);
  const [editSplitMode, setEditSplitMode] = useState<SplitMode>("equal");
  const [editManualAmounts, setEditManualAmounts] = useState<Record<number, string>>({});
  const [savingSplits, setSavingSplits] = useState(false);
  const [selectedBillForActions, setSelectedBillForActions] = useState<Bill | null>(null);
  const [showBillDetailsModal, setShowBillDetailsModal] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<Bill | null>(null);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editingBillId, setEditingBillId] = useState<number | null>(null);
  const [editBillDescription, setEditBillDescription] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillCategoryId, setEditBillCategoryId] = useState<number | null>(null);
  const [editBillPublic, setEditBillPublic] = useState(true);
  const [savingBillEdit, setSavingBillEdit] = useState(false);

  // Trend modal
  const [showTrendModal, setShowTrendModal] = useState(false);

  // Receipt image viewer
  const [showReceiptImageModal, setShowReceiptImageModal] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);

  const members: HomeMembership[] = home?.memberships ?? [];

  const scopeForPublic = (isPublic: boolean): BudgetScope => (isPublic ? "home" : "private");

  const loadData = useCallback(async () => {
    if (!home) {
      setAllBills([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      const [allBillsData, categoriesData] = await Promise.all([
        (budgetScope === "private" ? billApi.getPrivate(home.id) : billApi.getByHomeId(home.id)).catch(() => []),
        billCategoryApi.getAll(home.id, budgetScope).catch(() => []),
      ]);
      setAllBills(allBillsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [budgetScope, home]);

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
    const now = new Date();
    resetScanState();
    setNewBillAmount("");
    setNewBillDescription("");
    setSelectedCategoryId(null);
    setNewBillPublic(budgetScope === "home");
    setNewBillIsRegular(false);
    setNewBillRecurrenceType("monthly");
    setNewBillRecurrenceDay(now.getDate());
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
        public: budgetScope === "home",
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

  const openCategoryActions = (category: BillCategory) => {
    setSelectedCategoryForActions(category);
  };

  const openEditCategory = (category: BillCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name || "");
    setSelectedIcon(category.icon || "wallet");
    setSelectedColor(category.color || theme.accent.yellow);
    setShowEditCategoryModal(true);
  };

  const handleEditCategory = async () => {
    if (!home || !editingCategory || !newCategoryName.trim()) return;
    setSavingCategoryEdit(true);
    try {
      await billCategoryApi.update(home.id, editingCategory.id, {
        name: newCategoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      await loadData();
    } catch (error) {
      console.error("Error editing category:", error);
      alert(t.common.error, t.budget.failedToUpdateCategory);
    } finally {
      setSavingCategoryEdit(false);
    }
  };

  const buildSplits = (userIds: number[], mode: SplitMode, amounts: Record<number, string>, totalAmount: number) => {
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
      const splits = newBillPublic ? buildSplits(splitUserIds, splitMode, manualAmounts, totalAmount) : undefined;

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
        public: newBillPublic,
        isRegular: newBillIsRegular,
        recurrenceType: newBillIsRegular ? newBillRecurrenceType : undefined,
        recurrenceDay: newBillIsRegular && newBillRecurrenceType !== "daily" ? newBillRecurrenceDay : undefined,
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
      setNewBillPublic(budgetScope === "home");
      setNewBillIsRegular(false);
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

  const openBillActions = (bill: Bill) => {
    setSelectedBillForActions(bill);
  };

  const openBillDetails = (bill: Bill) => {
    setSelectedBillForDetails(bill);
    setShowBillDetailsModal(true);
  };

  const openEditBill = (bill: Bill) => {
    setEditingBillId(bill.id);
    setEditBillDescription(bill.description || "");
    setEditBillAmount(String(bill.totalAmount || ""));
    setEditBillCategoryId(bill.billCategoryId ?? null);
    setEditBillPublic(bill.public !== false);
    setBudgetScope(scopeForPublic(bill.public !== false));
    setShowEditBillModal(true);
  };

  const handleEditBill = async () => {
    if (!home || !editingBillId || !editBillAmount) return;
    const amount = parseFloat(editBillAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setSavingBillEdit(true);
    try {
      await billApi.update(home.id, editingBillId, {
        description: editBillDescription || undefined,
        totalAmount: amount,
        billCategoryId: editBillCategoryId || undefined,
        public: editBillPublic,
      });
      setShowEditBillModal(false);
      setEditingBillId(null);
      await loadData();
    } catch (error) {
      console.error("Error editing bill:", error);
      alert(t.common.error, t.budget.failedToUpdateBill);
    } finally {
      setSavingBillEdit(false);
    }
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
      setSelectedBillForDetails((current) =>
        current?.id === bill.id
          ? {
              ...current,
              splits: (current.splits ?? []).map((item) => (item.id === split.id ? { ...item, paid: true } : item)),
            }
          : current,
      );
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
  const formattedPeriodMonth = `${t.common.months[periodCursor.getMonth()] || t.common.months[new Date().getMonth()]} ${periodCursor.getFullYear()}`;
  const periodTitle =
    budgetPeriod === "month"
      ? t.budget.currentMonth
      : budgetPeriod === "year"
        ? String(periodCursor.getFullYear())
        : t.budget.allTime;

  const handleSelectScope = (scope: BudgetScope) => {
    setBudgetScope(scope);
    setFilterCategoryId(null);
    setExpandedReceiptId(null);
  };

  const viewReceipt = (url: string) => {
    setReceiptImageUrl(url);
    setShowReceiptImageModal(true);
  };

  const categoryActions: SheetAction[] = selectedCategoryForActions
    ? [
        { label: t.common.edit, onPress: () => openEditCategory(selectedCategoryForActions) },
        {
          label: t.common.delete,
          destructive: true,
          onPress: () => handleDeleteCategory(selectedCategoryForActions.id),
        },
      ]
    : [];

  const billActions: SheetAction[] =
    selectedBillForActions && canEditBill(selectedBillForActions)
      ? [
          { label: t.common.edit, onPress: () => openEditBill(selectedBillForActions) },
          { label: t.budget.editSplits, onPress: () => handleOpenEditSplits(selectedBillForActions) },
          { label: t.common.delete, destructive: true, onPress: () => handleDeleteBill(selectedBillForActions.id) },
        ]
      : [];

  const scopeOptions = [
    { value: "home" as const, label: "Home", icon: Home },
    { value: "private" as const, label: "Private", icon: Shield },
  ];

  if (isLoading) {
    return <BudgetSkeleton />;
  }

  const detailsBill = selectedBillForDetails;

  return (
    <TabScreen
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={
        <FabMenu
          tone="pink"
          items={[
            { icon: Wallet, label: t.budget.category, onPress: () => setShowCategoryModal(true) },
            { icon: Receipt, label: t.budget.addExpense, onPress: handleOpenCreateModal },
          ]}
        />
      }
    >
      <TabHeader title={t.budget.title} />

      <Card padding={6} borderRadius={24} className="mb-6">
        <SegmentedControl<BudgetScope>
          value={budgetScope}
          onChange={handleSelectScope}
          options={[
            { value: "home", label: "Home budget", icon: Home },
            { value: "private", label: "Private budget", icon: Shield },
          ]}
        />
      </Card>

      <Card size="sm" borderRadius={24} className="mb-6">
        <Text variant="overline" className="mb-3">
          {t.budget.period}
        </Text>
        <SegmentedControl<BudgetPeriod>
          value={budgetPeriod}
          onChange={setBudgetPeriod}
          className="mb-3"
          options={[
            { value: "month", label: t.budget.month },
            { value: "year", label: t.budget.year },
            { value: "all", label: t.budget.allTime },
          ]}
        />
        <View className="flex-row items-center justify-between">
          <IconButton
            icon={ChevronLeft}
            size="sm"
            disabled={!canNavigatePeriod}
            onPress={() => shiftPeriod(-1)}
            style={{ backgroundColor: theme.background }}
          />
          <Text variant="label" color="secondary">
            {budgetPeriod === "month"
              ? formattedPeriodMonth
              : budgetPeriod === "year"
                ? String(periodCursor.getFullYear())
                : t.budget.allTime}
          </Text>
          <IconButton
            icon={ChevronRight}
            size="sm"
            disabled={!canNavigatePeriod}
            onPress={() => shiftPeriod(1)}
            style={{ backgroundColor: theme.background }}
          />
        </View>
      </Card>

      {visibleBills.length === 0 && receiptBills.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={t.budget.noExpenses || "No Expenses"}
          description={t.budget.noExpensesHint || "You have no expenses recorded for this period."}
          action={<Button title={t.budget.newBill || "Add Expense"} onPress={handleOpenCreateModal} />}
        />
      ) : (
        <>
          {totalSpend > 0 && (
            <View className="items-center mb-4">
              <DonutChart data={chartData} total={totalSpend} totalLabel={t.common.total} />
            </View>
          )}

          {monthlyTrends.length > 0 && (
            <Button
              title={t.budget.monthlyTrend}
              icon={<TrendingUp size={18} color={theme.accent.purple} />}
              size="md"
              variant="secondary"
              className="mb-3"
              onPress={() => setShowTrendModal(true)}
            />
          )}

          <Button
            title={t.budget.currentMonth}
            size="md"
            variant="secondary"
            className="mb-6"
            onPress={() => {
              setBudgetPeriod("month");
              setPeriodCursor(new Date());
            }}
          />

          <Section compact title={t.budget.categories} className="mb-6">
            {categories.length === 0 ? (
              <Text variant="bodySmall" color="secondary" className="italic">
                {t.budget.noCategories}
              </Text>
            ) : (
              <ChipSelect<number | null>
                value={filterCategoryId}
                onChange={(id) => setFilterCategoryId(filterCategoryId === id ? null : id)}
                onLongPress={(id) => {
                  const category = categories.find((cat) => cat.id === id);
                  if (category) openCategoryActions(category);
                }}
                options={[
                  { value: null, label: t.common.all },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                    icon: getBillCategoryIcon(cat.icon),
                    dotColor: cat.color || theme.accent.yellow,
                  })),
                ]}
              />
            )}
          </Section>

          <Section title={t.budget.expenses}>
            <ResponsiveGrid>
              {visibleBills.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  title={getCategoryName(bill)}
                  uploaderName={bill.user?.name ?? getMemberName(bill.uploadedBy)}
                  categoryColor={getCategoryColor(bill.billCategoryId)}
                  currency={homeCurrency}
                  onPress={() => openBillDetails(bill)}
                  onLongPress={() => openBillActions(bill)}
                />
              ))}
            </ResponsiveGrid>
          </Section>

          {receiptBills.length > 0 && (
            <Section title={t.budget.receiptHistory}>
              <View className="gap-3">
                {receiptBills.map((bill) => (
                  <ReceiptCard
                    key={bill.id}
                    bill={bill}
                    fallbackTitle={getCategoryName(bill)}
                    currency={homeCurrency}
                    expanded={expandedReceiptId === bill.id}
                    onToggle={() => setExpandedReceiptId(expandedReceiptId === bill.id ? null : bill.id)}
                    onViewReceipt={viewReceipt}
                  />
                ))}
              </View>
            </Section>
          )}
        </>
      )}

      {/* Create Expense Modal */}
      <Modal visible={showCreateModal} onClose={handleCloseCreateModal} title={t.budget.addExpense}>
        <ReceiptScanner
          fileUri={selectedImageUri}
          fileType={selectedFileType}
          fileName={selectedFileName}
          scanning={scanning}
          ocrResult={ocrResult}
          language={selectedLanguage}
          currency={homeCurrency}
          onTakePhoto={handleTakePhoto}
          onPickFile={handlePickFile}
          onReset={resetScanState}
          onRetryWithLanguage={(language) => {
            setSelectedLanguage(language);
            setOcrResult(null);
          }}
        />

        <Section compact title={t.tabs.budget}>
          <SegmentedControl<BudgetScope>
            value={scopeForPublic(newBillPublic)}
            options={scopeOptions}
            onChange={(scope) => {
              const isPublic = scope === "home";
              setNewBillPublic(isPublic);
              setSelectedCategoryId(null);
              setBudgetScope(scope);
              if (!isPublic) {
                setSplitUserIds([]);
                setManualAmounts({});
              }
            }}
          />
        </Section>

        <Section compact title={t.budget.category}>
          <ChipSelect<number | null>
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
            options={categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
              icon: getBillCategoryIcon(cat.icon),
            }))}
            trailing={
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.budget.newCategory}
                className="w-10 h-10 rounded-full border border-dashed justify-center items-center"
                style={{ borderColor: theme.textSecondary }}
                onPress={() => setShowCategoryModal(true)}
              >
                <Plus size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            }
          />
        </Section>

        <Input
          label={t.budget.amount}
          placeholder={t.budget.amountPlaceholder}
          value={newBillAmount}
          onChangeText={setNewBillAmount}
          keyboardType="numeric"
        />
        <Input
          label={t.budget.description}
          placeholder={t.budget.descriptionPlaceholder}
          value={newBillDescription}
          onChangeText={setNewBillDescription}
        />

        <RecurrenceFields
          enabled={newBillIsRegular}
          onEnabledChange={setNewBillIsRegular}
          type={newBillRecurrenceType}
          onTypeChange={setNewBillRecurrenceType}
          day={newBillRecurrenceDay}
          onDayChange={setNewBillRecurrenceDay}
        />

        {newBillPublic && (
          <SplitPicker
            members={members}
            currency={homeCurrency}
            selectedIds={splitUserIds}
            onSelectedIdsChange={setSplitUserIds}
            mode={splitMode}
            onModeChange={setSplitMode}
            amounts={manualAmounts}
            onAmountsChange={setManualAmounts}
            totalAmount={parseFloat(newBillAmount) || 0}
          />
        )}

        <Button
          title={t.budget.addExpense}
          onPress={handleCreateBill}
          loading={creating}
          disabled={!newBillAmount || !selectedCategoryId}
          variant="pink"
          className="mt-4"
        />
      </Modal>

      {/* Edit Splits Modal */}
      <Modal
        visible={showEditSplitsModal}
        onClose={() => {
          setShowEditSplitsModal(false);
          setEditingBill(null);
        }}
        title={t.budget.editSplits}
      >
        {editingBill && (
          <>
            <Card size="sm" className="mb-4">
              <Text variant="subtitle">{getCategoryName(editingBill)}</Text>
              <Text variant="heading">{formatCurrencyAmount(editingBill.totalAmount, homeCurrency)}</Text>
            </Card>

            <SplitPicker
              members={members}
              currency={homeCurrency}
              selectedIds={editSplitUserIds}
              onSelectedIdsChange={setEditSplitUserIds}
              mode={editSplitMode}
              onModeChange={setEditSplitMode}
              amounts={editManualAmounts}
              onAmountsChange={setEditManualAmounts}
              totalAmount={editingBill.totalAmount}
            />

            <Button
              title={t.common.save}
              onPress={handleSaveEditSplits}
              loading={savingSplits}
              variant="pink"
              className="mt-4"
            />
          </>
        )}
      </Modal>

      <CategoryFormModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={t.budget.newCategory}
        namePlaceholder={t.budget.categoryNamePlaceholder}
        name={newCategoryName}
        onNameChange={setNewCategoryName}
        colors={PICKER_COLORS}
        color={selectedColor}
        onColorChange={setSelectedColor}
        iconOptions={BILL_CATEGORY_ICON_OPTIONS}
        icon={selectedIcon}
        onIconChange={setSelectedIcon}
        submitLabel={t.budget.newCategory}
        submitting={creatingCategory}
        onSubmit={handleCreateCategory}
      />

      <ActionSheet
        visible={!!selectedCategoryForActions}
        onClose={() => setSelectedCategoryForActions(null)}
        title={selectedCategoryForActions?.name || t.budget.category}
        cancelLabel={t.common.cancel}
        actions={categoryActions}
      />

      <BillDetailsModal
        visible={showBillDetailsModal}
        onClose={() => {
          setShowBillDetailsModal(false);
          setSelectedBillForDetails(null);
        }}
        bill={detailsBill}
        title={detailsBill ? getCategoryName(detailsBill) : "Expense details"}
        uploaderName={detailsBill ? (detailsBill.user?.name ?? getMemberName(detailsBill.uploadedBy)) : ""}
        categoryColor={getCategoryColor(detailsBill?.billCategoryId)}
        currency={homeCurrency}
        canEdit={!!detailsBill && canEditBill(detailsBill)}
        getMemberName={getMemberName}
        onViewReceipt={viewReceipt}
        onEditSplits={() => {
          if (!detailsBill) return;
          setShowBillDetailsModal(false);
          handleOpenEditSplits(detailsBill);
        }}
        onMarkSplitPaid={(split) => {
          if (detailsBill) handleMarkSplitPaid(detailsBill, split);
        }}
        onEdit={() => {
          if (!detailsBill) return;
          setShowBillDetailsModal(false);
          openEditBill(detailsBill);
        }}
        onDelete={() => {
          if (!detailsBill) return;
          setShowBillDetailsModal(false);
          handleDeleteBill(detailsBill.id);
        }}
      />

      <ActionSheet
        visible={!!selectedBillForActions}
        onClose={() => setSelectedBillForActions(null)}
        title={selectedBillForActions ? getCategoryName(selectedBillForActions) : t.budget.addExpense}
        cancelLabel={t.common.cancel}
        actions={billActions}
      />

      <CategoryFormModal
        visible={showEditCategoryModal}
        onClose={() => {
          setShowEditCategoryModal(false);
          setEditingCategory(null);
        }}
        title={t.budget.editCategory}
        namePlaceholder={t.budget.categoryNamePlaceholder}
        name={newCategoryName}
        onNameChange={setNewCategoryName}
        colors={PICKER_COLORS}
        color={selectedColor}
        onColorChange={setSelectedColor}
        iconOptions={BILL_CATEGORY_ICON_OPTIONS}
        icon={selectedIcon}
        onIconChange={setSelectedIcon}
        submitLabel={t.common.save}
        submitting={savingCategoryEdit}
        onSubmit={handleEditCategory}
      />

      <Modal
        visible={showEditBillModal}
        onClose={() => {
          setShowEditBillModal(false);
          setEditingBillId(null);
        }}
        title={t.budget.editExpense}
      >
        <Input
          placeholder={t.budget.descriptionPlaceholder}
          value={editBillDescription}
          onChangeText={setEditBillDescription}
        />
        <Input
          placeholder={t.budget.amountPlaceholder}
          value={editBillAmount}
          onChangeText={setEditBillAmount}
          keyboardType="numeric"
        />
        <SegmentedControl<BudgetScope>
          value={scopeForPublic(editBillPublic)}
          options={scopeOptions}
          className="mb-6"
          onChange={(scope) => {
            setEditBillPublic(scope === "home");
            setEditBillCategoryId(null);
            setBudgetScope(scope);
          }}
        />
        <ChipSelect<number | null>
          value={editBillCategoryId}
          onChange={setEditBillCategoryId}
          className="mb-6"
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />
        <Button
          title={t.common.save}
          icon={<Check size={20} color={theme.background} />}
          onPress={handleEditBill}
          disabled={!editBillAmount || savingBillEdit}
        />
      </Modal>

      {/* Monthly Trend Modal */}
      <Modal visible={showTrendModal} onClose={() => setShowTrendModal(false)} title={t.budget.monthlyTrend}>
        <Text variant="bodySmall" color="secondary" className="mb-4">
          {periodTitle}
        </Text>
        <View className="items-center mb-6">
          {/* The sheet has 24px side padding, so the chart must not exceed the window minus 48px. */}
          <BarChart data={monthlyTrends} width={Math.min(windowWidth - 48, 560)} height={220} />
        </View>
        <Card size="sm">
          {monthlyTrends.map((item, index) => (
            <InfoRow
              key={item.month}
              label={item.month}
              value={
                <Text
                  variant="label"
                  className="font-manrope-bold"
                  style={index === monthlyTrends.length - 1 ? { color: theme.accent.pink } : undefined}
                >
                  {formatCurrencyAmount(item.total, homeCurrency)}
                </Text>
              }
            />
          ))}
        </Card>
      </Modal>

      {/* Receipt Image Viewer Modal */}
      <Modal
        visible={showReceiptImageModal}
        onClose={() => {
          setShowReceiptImageModal(false);
          setReceiptImageUrl(null);
        }}
        title={t.budget.viewReceipt}
      >
        {receiptImageUrl && (
          <Image source={{ uri: receiptImageUrl }} style={{ width: "100%", height: 500 }} resizeMode="contain" />
        )}
      </Modal>
    </TabScreen>
  );
}
