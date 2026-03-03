import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DollarSign, Plus, Trash, ScanLine, Camera, ChevronDown, ChevronUp, Receipt, Check, Pencil, Users } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { useHome } from "@/stores/homeStore";
import { useTheme } from "@/stores/themeStore";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";
import { billApi, billCategoryApi, imageApi, ocrApi } from "@/lib/api";
import { Bill, BillCategory, BillSplit, OCRResult, HomeMembership } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useAlert } from "@/components/ui/alert";
import { BudgetSkeleton } from "@/components/skeletons";

const DonutChart = ({ data, size = 180, strokeWidth = 20, total, theme }: { data: { value: number; color: string }[]; size?: number; strokeWidth?: number; total: number; theme: any }) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  return (
    <View className="justify-center items-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {data.map((item, index) => {
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
        <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>{total.toFixed(0)}</Text>
        <Text className="text-xs font-manrope" style={{ color: theme.textSecondary }}>Total</Text>
      </View>
    </View>
  );
};

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const { home, isAdmin } = useHome();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newBillDescription, setNewBillDescription] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [creating, setCreating] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(theme.accent.yellow);
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Scan flow state
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
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

  const members: HomeMembership[] = home?.memberships ?? [];

  const COLOR_OPTIONS = [
    "#FF7476", "#FF9F7A", "#FBEB9E", "#A8E6CF", "#7DD3E8", "#D8D4FC", "#F5A3D3",
    "#22C55E", "#F472B6", "#C4B5FD", "#94A3B8", "#FDE68A", "#6EE7B7",
  ];

  const LANGUAGES = [
    { code: "eng", label: "English" },
    { code: "pol", label: "Polski" },
    { code: "ukr", label: "Українська" },
    { code: "bel", label: "Беларуская" },
  ];

  const loadData = useCallback(async () => {
    if (!home) {
      setIsLoading(false);
      return;
    }

    try {
      const [billsData, categoriesData] = await Promise.all([
        billApi.getByHomeId(home.id, filterCategoryId ?? undefined).catch(() => []),
        billCategoryApi.getAll(home.id).catch(() => []),
      ]);
      setBills(billsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home, filterCategoryId]);

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
        color: selectedColor,
      });
      setNewCategoryName("");
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
    alert(
      t.budget.deleteCategory,
      t.budget.deleteCategoryConfirm,
      [
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
      ]
    );
  };

  const buildSplits = (userIds: number[], mode: "equal" | "manual", amounts: Record<number, string>, totalAmount: number) => {
    if (userIds.length === 0) return undefined;
    if (mode === "equal") {
      const perPerson = totalAmount / userIds.length;
      return userIds.map(uid => ({ user_id: uid, amount: Math.round(perPerson * 100) / 100 }));
    }
    return userIds.map(uid => ({ user_id: uid, amount: parseFloat(amounts[uid] || "0") }));
  };

  const handleCreateBill = async () => {
    if (!home || !newBillAmount || !selectedCategoryId) return;

    setCreating(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      const category = categories.find(c => c.id === selectedCategoryId);
      const totalAmount = parseFloat(newBillAmount);
      const splits = buildSplits(splitUserIds, splitMode, manualAmounts, totalAmount);

      await billApi.create(home.id, {
        type: category?.name || "Expense",
        bill_category_id: selectedCategoryId,
        description: newBillDescription || undefined,
        total_amount: totalAmount,
        period_start: now.toISOString(),
        period_end: endDate.toISOString(),
        ocr_data: ocrResult || {},
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
    const userIds = existingSplits.map(s => s.user_id);
    setEditSplitUserIds(userIds);

    // Detect if existing splits are equal
    if (existingSplits.length > 0) {
      const firstAmount = existingSplits[0].amount;
      const allEqual = existingSplits.every(s => Math.abs(s.amount - firstAmount) < 0.01);
      setEditSplitMode(allEqual ? "equal" : "manual");
    } else {
      setEditSplitMode("equal");
    }

    const amounts: Record<number, string> = {};
    existingSplits.forEach(s => { amounts[s.user_id] = s.amount.toString(); });
    setEditManualAmounts(amounts);
    setShowEditSplitsModal(true);
  };

  const handleSaveEditSplits = async () => {
    if (!home || !editingBill) return;
    setSavingSplits(true);
    try {
      const splits = buildSplits(editSplitUserIds, editSplitMode, editManualAmounts, editingBill.total_amount) ?? [];
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

  // Step 1: Pick image from gallery
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setSelectedImageUri(result.assets[0].uri);
        setOcrResult(null);
      }
    } catch (error) {
      console.error("Image picker error:", error);
    }
  };

  // Step 2: Upload + process with OCR
  const handleProcessReceipt = async () => {
    if (!selectedImageUri) return;

    setScanning(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append("image", {
        uri: selectedImageUri,
        name: "receipt.jpg",
        type: "image/jpeg",
      });

      const uploadRes = await imageApi.upload(formData);
      const result = await ocrApi.process(uploadRes.url, selectedLanguage);

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
  };

  const getCategoryColor = (categoryId?: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || theme.accent.yellow;
  };

  const getCategoryName = (bill: Bill) => {
    if (bill.bill_category) return bill.bill_category.name;
    const category = categories.find(c => c.id === bill.bill_category_id);
    return category?.name || bill.type;
  };

  const getMemberName = (userId: number) => {
    const m = members.find(m => m.user_id === userId);
    return m?.user?.name ?? `User #${userId}`;
  };

  const toggleSplitUser = (userId: number, ids: number[], setIds: (v: number[]) => void) => {
    if (ids.includes(userId)) {
      setIds(ids.filter(id => id !== userId));
    } else {
      setIds([...ids, userId]);
    }
  };

  const canEditBill = (bill: Bill) => {
    return isAdmin || bill.uploaded_by === user?.id;
  };

  const chartData = categories.map(cat => {
    const catBills = bills.filter(b => b.bill_category_id === cat.id);
    const total = catBills.reduce((sum, b) => sum + b.total_amount, 0);
    return {
      value: total,
      color: cat.color || theme.accent.yellow,
      name: cat.name
    };
  }).filter(d => d.value > 0);

  const uncategorizedBills = bills.filter(b => !b.bill_category_id);
  if (uncategorizedBills.length > 0) {
    const total = uncategorizedBills.reduce((sum, b) => sum + b.total_amount, 0);
    chartData.push({
      value: total,
      color: theme.textSecondary,
      name: t.budget.uncategorized
    });
  }

  const totalSpend = bills.reduce((sum, b) => sum + b.total_amount, 0);

  // Bills that have OCR data with actual content
  const receiptBills = bills.filter(b => {
    if (!b.ocr_data) return false;
    const data = b.ocr_data as Record<string, any>;
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
        {members.map(m => {
          const isSelected = selectedIds.includes(m.user_id);
          return (
            <TouchableOpacity
              key={m.user_id}
              className="px-3 py-2 rounded-xl border flex-row items-center gap-1.5"
              style={{
                backgroundColor: isSelected ? theme.accent.pinkLight : theme.surface,
                borderColor: isSelected ? theme.accent.pink : theme.border,
              }}
              onPress={() => toggleSplitUser(m.user_id, selectedIds, setSelectedIds)}
            >
              {isSelected && <Check size={14} color={theme.accent.pink} />}
              <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                {m.user?.name ?? `User #${m.user_id}`}
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
              <Text className="text-sm font-manrope-semibold" style={{ color: mode === "equal" ? theme.background : theme.textSecondary }}>
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
              <Text className="text-sm font-manrope-semibold" style={{ color: mode === "manual" ? theme.background : theme.textSecondary }}>
                {t.budget.manualSplit}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "equal" && totalAmount > 0 && (
            <View className="p-3 rounded-xl" style={{ backgroundColor: theme.background }}>
              {selectedIds.map(uid => (
                <View key={uid} className="flex-row justify-between py-1">
                  <Text className="text-sm" style={{ color: theme.text }}>{getMemberName(uid)}</Text>
                  <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>
                    {(totalAmount / selectedIds.length).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {mode === "manual" && (
            <View className="gap-2">
              {selectedIds.map(uid => (
                <View key={uid} className="flex-row items-center gap-3">
                  <Text className="text-sm flex-1" style={{ color: theme.text }}>{getMemberName(uid)}</Text>
                  <Input
                    placeholder="0.00"
                    value={amounts[uid] || ""}
                    onChangeText={(v) => setAmounts({ ...amounts, [uid]: v })}
                    keyboardType="numeric"
                    style={{ width: 100 }}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

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
          <Text className="text-3xl font-manrope-bold" style={{ color: theme.text }}>{t.budget.title}</Text>
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              className="px-4 py-2 rounded-xl justify-center items-center"
              style={{ backgroundColor: theme.surface }}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text className="text-xs font-manrope-semibold" style={{ color: theme.text }}>+ {t.budget.category}</Text>
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
          <View className="items-center mb-8">
            <DonutChart data={chartData} total={totalSpend} theme={theme} />
          </View>
        )}

        <View className="mb-6">
          <Text className="text-sm font-manrope-bold uppercase mb-3" style={{ color: theme.textSecondary }}>{t.budget.categories}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            <TouchableOpacity
              className="flex-row items-center px-3 py-2 rounded-2xl border gap-2"
              style={{
                backgroundColor: filterCategoryId === null ? theme.text : theme.surface,
                borderColor: filterCategoryId === null ? theme.text : theme.border,
              }}
              onPress={() => setFilterCategoryId(null)}
            >
              <Text className="font-manrope-semibold text-sm" style={{ color: filterCategoryId === null ? theme.background : theme.text }}>
                {t.common.all}
              </Text>
            </TouchableOpacity>
            {categories.map(cat => (
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
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || theme.accent.yellow }} />
                <Text className="font-manrope-semibold text-sm" style={{ color: filterCategoryId === cat.id ? theme.background : theme.text }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
            {categories.length === 0 && (
              <Text className="italic" style={{ color: theme.textSecondary }}>{t.budget.noCategories}</Text>
            )}
          </ScrollView>
        </View>

        {/* Bills list */}
        <View className="gap-3">
          {bills.map((bill) => {
            const isExpanded = expandedBillId === bill.id;
            const splits = bill.splits ?? [];
            const userSplit = splits.find(s => s.user_id === user?.id);
            const uploaderName = bill.user?.name ?? getMemberName(bill.uploaded_by);

            return (
              <TouchableOpacity
                key={bill.id}
                className="p-4 rounded-2xl"
                style={{ backgroundColor: theme.surface }}
                onPress={() => setExpandedBillId(isExpanded ? null : bill.id)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: getCategoryColor(bill.bill_category_id) }}>
                    <DollarSign size={20} color="#1C1C1E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-manrope-semibold mb-0.5" style={{ color: theme.text }}>{getCategoryName(bill)}</Text>
                    <Text className="text-xs" style={{ color: theme.textSecondary }}>
                      {uploaderName} · {new Date(bill.created_at).toLocaleDateString("pl-PL")}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-manrope-bold" style={{ color: theme.text }}>
                      {bill.total_amount.toFixed(2)}
                    </Text>
                    {userSplit && (
                      <Text className="text-xs" style={{ color: userSplit.paid ? "#22C55E" : theme.accent.pink }}>
                        {t.budget.yourShare}: {userSplit.amount.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteBill(bill.id)}
                    className="p-0.5"
                  >
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
                    {splits.map(split => (
                      <View key={split.id} className="flex-row items-center justify-between py-1.5">
                        <View className="flex-row items-center gap-2 flex-1">
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: split.paid ? "#22C55E" : theme.accent.pink }}
                          />
                          <Text className="text-sm" style={{ color: theme.text }}>
                            {split.user?.name ?? getMemberName(split.user_id)}
                          </Text>
                        </View>
                        <Text className="text-sm font-manrope-semibold mr-2" style={{ color: theme.text }}>
                          {split.amount.toFixed(2)}
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
                      {splits.length} {splits.length === 1 ? "split" : "splits"} · {splits.filter(s => s.paid).length} {t.budget.paid.toLowerCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {bills.length === 0 && (
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
                const data = bill.ocr_data as Record<string, any>;
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
                      <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: theme.accent.yellow }}>
                        <Receipt size={20} color="#1C1C1E" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-manrope-semibold mb-0.5" style={{ color: theme.text }}>
                          {data.vendor || getCategoryName(bill)}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.textSecondary }}>
                          {data.date || new Date(bill.created_at).toLocaleDateString("pl-PL")}
                          {items.length > 0 && ` \u2022 ${items.length} ${t.budget.items.toLowerCase()}`}
                        </Text>
                      </View>
                      <Text className="text-lg font-manrope-bold mr-2" style={{ color: theme.text }}>
                        {bill.total_amount.toFixed(2)}
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
                              {item.price?.toFixed(2)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Expense Modal */}
      <Modal
        visible={showCreateModal}
        onClose={handleCloseCreateModal}
        title={t.budget.addExpense}
        height="full"
      >
        <View className="pt-2.5">
          {/* Scan Receipt Section */}
          <View className="mb-6">
            <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>
              {t.budget.scanReceipt}
            </Text>

            {/* Step 1: Pick image */}
            {!selectedImageUri ? (
              <TouchableOpacity
                className="w-full py-6 rounded-xl justify-center items-center gap-2"
                style={{ backgroundColor: theme.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border }}
                onPress={handlePickImage}
              >
                <Camera size={28} color={theme.textSecondary} />
                <Text className="font-manrope-semibold" style={{ color: theme.textSecondary }}>
                  {t.budget.uploadReceipt}
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                {/* Image preview */}
                <View className="rounded-xl overflow-hidden mb-3" style={{ borderWidth: 1, borderColor: theme.border }}>
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={{ width: '100%', height: 160 }}
                    resizeMode="cover"
                  />
                </View>

                <TouchableOpacity
                  className="mb-3"
                  onPress={handlePickImage}
                >
                  <Text className="text-sm font-manrope-semibold text-center" style={{ color: theme.accent.pink }}>
                    {t.budget.changePhoto}
                  </Text>
                </TouchableOpacity>

                {/* Step 2: Language selector + Process button (only if no result yet) */}
                {!ocrResult && (
                  <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 8 }}>
                      {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                          key={lang.code}
                          onPress={() => setSelectedLanguage(lang.code)}
                          className="px-3 py-1.5 rounded-full border"
                          style={{
                            backgroundColor: selectedLanguage === lang.code ? theme.text : 'transparent',
                            borderColor: selectedLanguage === lang.code ? theme.text : theme.border
                          }}
                        >
                          <Text style={{
                            color: selectedLanguage === lang.code ? theme.background : theme.textSecondary,
                            fontSize: 12,
                            fontWeight: '600'
                          }}>
                            {lang.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Button
                      title={scanning ? t.budget.processing : t.budget.processReceipt}
                      onPress={handleProcessReceipt}
                      loading={scanning}
                      disabled={scanning}
                      variant="primary"
                      icon={!scanning ? <ScanLine size={18} color={theme.isDark ? "#1C1C1E" : "#FFFFFF"} /> : undefined}
                    />
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
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>{t.budget.vendor}</Text>
                        <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>{ocrResult.vendor}</Text>
                      </View>
                    )}

                    {ocrResult.date && (
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>{t.budget.date}</Text>
                        <Text className="text-sm font-manrope-semibold" style={{ color: theme.text }}>{ocrResult.date}</Text>
                      </View>
                    )}

                    {ocrResult.items && ocrResult.items.length > 0 && (
                      <View className="mt-1 pt-2" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                        <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>
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
                              {item.price.toFixed(2)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {ocrResult.total > 0 && (
                      <View className="flex-row justify-between mt-2 pt-2" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
                        <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>{t.common.total}</Text>
                        <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>{ocrResult.total.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Manual entry / Category & Amount */}
          <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>{t.budget.category}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View className="flex-row gap-2.5">
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  className="px-4 py-2.5 rounded-xl border"
                  style={[
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    selectedCategoryId === cat.id && { borderColor: theme.accent.pink, backgroundColor: theme.accent.pinkLight }
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text style={{ color: theme.text }}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
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
              splitUserIds, setSplitUserIds,
              splitMode, setSplitMode,
              manualAmounts, setManualAmounts,
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
        onClose={() => { setShowEditSplitsModal(false); setEditingBill(null); }}
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
                  {editingBill.total_amount.toFixed(2)}
                </Text>
              </View>

              {renderSplitPicker(
                editSplitUserIds, setEditSplitUserIds,
                editSplitMode, setEditSplitMode,
                editManualAmounts, setEditManualAmounts,
                editingBill.total_amount,
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

          <Text className="text-xs font-manrope-bold uppercase mb-2 mt-5" style={{ color: theme.textSecondary }}>{t.budget.color}</Text>
          <View className="flex-row flex-wrap gap-3 mb-5">
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                className="w-8 h-8 rounded-full"
                style={[
                  { backgroundColor: color },
                  selectedColor === color && { borderWidth: 2, borderColor: theme.text }
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
    </View>
  );
}
