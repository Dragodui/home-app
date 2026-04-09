import {
  Apple,
  ArrowLeft,
  Baby,
  Beef,
  Book,
  Cake,
  Candy,
  Car,
  Carrot,
  Check,
  Coffee,
  Cookie,
  Dog,
  Fish,
  Gift,
  Home,
  Lightbulb,
  Milk,
  Pill,
  Plus,
  Scissors,
  Shirt,
  ShoppingCart,
  Sparkles,
  Trash2,
  Utensils,
  Wine,
  Wrench,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShoppingSkeleton } from "@/components/skeletons";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { shoppingApi } from "@/lib/api";
import type { ShoppingCategory, ShoppingItem } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

// Category colors matching PDF
const CATEGORY_COLORS = ["#D8D4FC", "#FBEB9E", "#FF7476", "#A8E6CF", "#7DD3E8", "#F5A3D3"];

// Available icons for categories
const ICON_OPTIONS = [
  { id: "utensils", label: "Food" },
  { id: "shopping-cart", label: "Cart" },
  { id: "coffee", label: "Coffee" },
  { id: "wine", label: "Drinks" },
  { id: "milk", label: "Dairy" },
  { id: "beef", label: "Meat" },
  { id: "fish", label: "Fish" },
  { id: "carrot", label: "Veggies" },
  { id: "apple", label: "Fruits" },
  { id: "candy", label: "Sweets" },
  { id: "cake", label: "Bakery" },
  { id: "cookie", label: "Snacks" },
  { id: "pill", label: "Medicine" },
  { id: "baby", label: "Baby" },
  { id: "dog", label: "Pets" },
  { id: "shirt", label: "Clothes" },
  { id: "sparkles", label: "Cleaning" },
  { id: "scissors", label: "Beauty" },
  { id: "home", label: "Home" },
  { id: "lightbulb", label: "Electronics" },
  { id: "wrench", label: "Tools" },
  { id: "car", label: "Auto" },
  { id: "book", label: "Books" },
  { id: "gift", label: "Gifts" },
];

const getIconComponent = (iconId: string, size: number = 24, color: string = "#1C1C1E") => {
  switch (iconId) {
    case "utensils":
      return <Utensils size={size} color={color} />;
    case "shopping-cart":
      return <ShoppingCart size={size} color={color} />;
    case "coffee":
      return <Coffee size={size} color={color} />;
    case "wine":
      return <Wine size={size} color={color} />;
    case "milk":
      return <Milk size={size} color={color} />;
    case "beef":
      return <Beef size={size} color={color} />;
    case "fish":
      return <Fish size={size} color={color} />;
    case "carrot":
      return <Carrot size={size} color={color} />;
    case "apple":
      return <Apple size={size} color={color} />;
    case "candy":
      return <Candy size={size} color={color} />;
    case "cake":
      return <Cake size={size} color={color} />;
    case "cookie":
      return <Cookie size={size} color={color} />;
    case "pill":
      return <Pill size={size} color={color} />;
    case "baby":
      return <Baby size={size} color={color} />;
    case "dog":
      return <Dog size={size} color={color} />;
    case "shirt":
      return <Shirt size={size} color={color} />;
    case "sparkles":
      return <Sparkles size={size} color={color} />;
    case "scissors":
      return <Scissors size={size} color={color} />;
    case "home":
      return <Home size={size} color={color} />;
    case "lightbulb":
      return <Lightbulb size={size} color={color} />;
    case "wrench":
      return <Wrench size={size} color={color} />;
    case "car":
      return <Car size={size} color={color} />;
    case "book":
      return <Book size={size} color={color} />;
    case "gift":
      return <Gift size={size} color={color} />;
    default:
      return <Utensils size={size} color={color} />;
  }
};

// Color options for creating new lists
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

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const { home } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();

  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [items, setItems] = useState<Record<number, ShoppingItem[]>>({});
  const [activeCategory, setActiveCategory] = useState<ShoppingCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0].id);
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Delete category
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ShoppingCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  // Create item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [pendingItemNames, setPendingItemNames] = useState<string[]>([]);
  const [creatingItem, setCreatingItem] = useState(false);

  const loadShoppingData = useCallback(async () => {
    if (!home) {
      setIsLoading(false);
      return;
    }

    try {
      const categoriesData = await shoppingApi.getCategories(home.id);
      setCategories(categoriesData || []);

      if (categoriesData && categoriesData.length > 0) {
        const results = await Promise.all(
          categoriesData.map((category) => shoppingApi.getCategoryItems(home.id, category.id).catch(() => [])),
        );
        const itemsData: Record<number, ShoppingItem[]> = {};
        categoriesData.forEach((category, i) => {
          itemsData[category.id] = results[i] || [];
        });
        setItems(itemsData);
      }
    } catch (error) {
      console.error("Error loading shopping data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home]);

  useEffect(() => {
    loadShoppingData();
  }, [loadShoppingData]);

  useRealtimeRefresh(["SHOPPING_CATEGORY", "SHOPPING_ITEM"], loadShoppingData);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShoppingData();
    setRefreshing(false);
  };

  const handleCreateCategory = async () => {
    if (!home || !newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      await shoppingApi.createCategory(home.id, {
        name: newCategoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });

      setNewCategoryName("");
      setSelectedIcon(ICON_OPTIONS[0].id);
      setSelectedColor(COLOR_OPTIONS[0]);
      setShowCategoryModal(false);
      await loadShoppingData();
    } catch (error) {
      console.error("Error creating category:", error);
    } finally {
      setCreatingCategory(false);
    }
  };

  const openItemModal = () => {
    setNewItemName("");
    setPendingItemNames([]);
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setNewItemName("");
    setPendingItemNames([]);
  };

  const handleAddPendingItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setPendingItemNames((prev) => [...prev, name]);
    setNewItemName("");
  };

  const handleCreateItem = async () => {
    if (!home || !activeCategory) return;

    const itemsToCreate = [...pendingItemNames];
    const currentName = newItemName.trim();
    if (currentName) {
      itemsToCreate.push(currentName);
    }
    if (itemsToCreate.length === 0) return;

    setCreatingItem(true);
    try {
      await shoppingApi.createItems(home.id, {
        categoryId: activeCategory.id,
        items: itemsToCreate.map((itemName) => ({ name: itemName })),
      });

      setNewItemName("");
      setPendingItemNames([]);
      setShowItemModal(false);
      await loadShoppingData();
    } catch (error) {
      console.error("Error creating item:", error);
    } finally {
      setCreatingItem(false);
    }
  };

  const toggleItemBought = async (itemId: number) => {
    if (!home) return;

    try {
      await shoppingApi.markBought(home.id, itemId);
      setItems((prev) => {
        const updated = { ...prev };
        for (const catId in updated) {
          updated[catId] = updated[catId].map((item) =>
            item.id === itemId ? { ...item, isBought: !item.isBought } : item,
          );
        }
        return updated;
      });
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!home) return;

    try {
      await shoppingApi.deleteItem(home.id, itemId);
      await loadShoppingData();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const openDeleteCategory = (category: ShoppingCategory) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleDeleteCategory = async () => {
    if (!home || !categoryToDelete) return;
    setDeletingCategory(true);
    try {
      await shoppingApi.deleteCategory(home.id, categoryToDelete.id);
      if (activeCategory?.id === categoryToDelete.id) {
        setActiveCategory(null);
      }
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      await loadShoppingData();
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setDeletingCategory(false);
    }
  };

  const getCategoryIcon = (category: ShoppingCategory) => {
    return getIconComponent(category.icon || "utensils", 24, "#1C1C1E");
  };

  const getActiveItems = () => {
    if (!activeCategory) return [];
    return items[activeCategory.id] || [];
  };

  if (isLoading) {
    return <ShoppingSkeleton />;
  }

  // List detail view
  if (activeCategory) {
    const categoryItems = getActiveItems();
    const categoryColor = activeCategory.color || CATEGORY_COLORS[0];

    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: insets.top + 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Detail Header */}
          <View className="flex-row items-center mb-8 gap-3">
            <TouchableOpacity
              className="w-12 h-12 rounded-2xl justify-center items-center"
              style={{ backgroundColor: theme.surface }}
              onPress={() => setActiveCategory(null)}
            >
              <ArrowLeft size={22} color={theme.text} />
            </TouchableOpacity>
            <Text className="flex-1 text-2xl font-manrope-bold" style={{ color: theme.text }}>
              {activeCategory.name}
            </Text>
            <View
              className="w-14 h-14 rounded-[18px] justify-center items-center"
              style={{ backgroundColor: categoryColor }}
            >
              {getCategoryIcon(activeCategory)}
            </View>
          </View>

          {/* Items List */}
          <View className="gap-4">
            {categoryItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="flex-row items-center gap-4 py-2"
                onPress={() => toggleItemBought(item.id)}
                activeOpacity={0.95}
              >
                <View
                  className="w-8 h-8 rounded-full border-2 justify-center items-center"
                  style={[
                    { borderColor: theme.textSecondary },
                    item.isBought && {
                      backgroundColor: theme.accent.purple,
                      borderColor: theme.accent.purple,
                    },
                  ]}
                >
                  {item.isBought && <Check size={16} color="#1C1C1E" strokeWidth={3} />}
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-lg font-manrope-semibold ${item.isBought ? "line-through opacity-50" : ""}`}
                    style={{ color: theme.text }}
                  >
                    {item.name}
                  </Text>
                  {item.user?.name && (
                    <Text
                      className={`text-xs font-manrope mt-0.5 ${item.isBought ? "opacity-50" : ""}`}
                      style={{ color: theme.textSecondary }}
                    >
                      {t.shopping.addedByUser}: {item.user.name}
                    </Text>
                  )}
                </View>
                {item.isBought && (
                  <TouchableOpacity className="p-2" onPress={() => handleDeleteItem(item.id)}>
                    <Trash2 size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Add Item FAB */}
        <TouchableOpacity
          className="absolute bottom-[120px] right-6 w-14 h-14 rounded-[18px] justify-center items-center shadow-lg"
          style={{ backgroundColor: theme.accent.purple }}
          onPress={openItemModal}
          activeOpacity={0.8}
        >
          <Plus size={28} color="#1C1C1E" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Add Item Modal */}
        <Modal visible={showItemModal} onClose={closeItemModal} title={t.shopping.addItem} height="full">
          <View className="flex-1">
            <Input
              label={t.shopping.itemName}
              placeholder={t.shopping.itemNamePlaceholder}
              value={newItemName}
              onChangeText={setNewItemName}
            />

            <Button
              title={t.common.add}
              onPress={handleAddPendingItem}
              disabled={!newItemName.trim() || creatingItem}
              variant="secondary"
              style={{ marginBottom: 16 }}
            />

            {pendingItemNames.length > 0 && (
              <View className="mb-4">
                <Text className="text-xs font-manrope-bold uppercase mb-2" style={{ color: theme.textSecondary }}>
                  {t.common.items} ({pendingItemNames.length})
                </Text>
                <View className="gap-2">
                  {pendingItemNames.map((itemName, index) => (
                    <View
                      key={`${itemName}-${index}`}
                      className="flex-row items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: theme.surface }}
                    >
                      <Text className="text-sm font-manrope-semibold flex-1 mr-3" style={{ color: theme.text }}>
                        {itemName}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setPendingItemNames((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                        }
                        className="p-1"
                      >
                        <Trash2 size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Button
              title={t.common.done}
              onPress={handleCreateItem}
              loading={creatingItem}
              disabled={(pendingItemNames.length === 0 && !newItemName.trim()) || creatingItem}
              variant="purple"
              style={{ marginTop: "auto" }}
            />
          </View>
        </Modal>
      </View>
    );
  }

  // Main shopping lists view - matches PDF exactly
  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: insets.top + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-4xl font-manrope-bold mb-1" style={{ color: theme.text }}>
              {t.shopping.title}
            </Text>
            <Text className="text-base font-manrope" style={{ color: theme.textSecondary }}>
              {t.shopping.myLists}
            </Text>
          </View>
          <TouchableOpacity
            className="w-14 h-14 rounded-[18px] justify-center items-center"
            style={{ backgroundColor: theme.accent.cyan }}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {/* Category Grid - matches PDF layout */}
        <View className="flex-row flex-wrap gap-3">
          {categories.map((category) => {
            const categoryColor = category.color || CATEGORY_COLORS[0];
            const itemCount = items[category.id]?.length || 0;

            return (
              <TouchableOpacity
                key={category.id}
                className="w-[47%] rounded-3xl p-[18px] justify-between"
                style={{ backgroundColor: categoryColor, aspectRatio: 0.9 }}
                onPress={() => setActiveCategory(category)}
                activeOpacity={0.9}
              >
                <TouchableOpacity
                  className="absolute top-3 right-3 w-8 h-8 rounded-xl justify-center items-center"
                  style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
                  onPress={(event) => {
                    event.stopPropagation();
                    openDeleteCategory(category);
                  }}
                >
                  <Trash2 size={16} color="#1C1C1E" />
                </TouchableOpacity>
                <View className="w-10 h-10 rounded-xl bg-black/5 justify-center items-center">
                  {getCategoryIcon(category)}
                </View>
                <View className="flex-1 justify-end">
                  <Text className="text-xl font-manrope-bold text-[#1C1C1E] mb-1">{category.name}</Text>
                  <Text className="text-[13px] font-manrope-medium text-black/50">
                    {itemCount} {t.common.items}
                  </Text>
                </View>
                <View className="absolute bottom-[18px] right-[18px]">
                  <View className="w-8 h-8 rounded-full bg-black/10 justify-center items-center">
                    <ArrowLeft size={16} color="rgba(0,0,0,1)" style={{ transform: [{ rotate: "180deg" }] }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Create Category Modal - matches PDF design */}
      <Modal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={t.shopping.newList}
        height="full"
      >
        <View className="flex-1">
          {/* Icon Preview */}
          <View className="items-center mb-6">
            <View
              className="w-20 h-20 rounded-3xl justify-center items-center"
              style={{ backgroundColor: selectedColor }}
            >
              {getIconComponent(selectedIcon, 32, "#1C1C1E")}
            </View>
          </View>

          {/* Title Input */}
          <Input placeholder={t.shopping.title_input} value={newCategoryName} onChangeText={setNewCategoryName} />

          {/* Color Picker */}
          <View className="mb-6 gap-3">
            <View className="flex-row justify-center gap-2.5">
              {COLOR_OPTIONS.slice(0, 7).map((color) => (
                <TouchableOpacity
                  key={color}
                  className={`w-9 h-9 rounded-full ${selectedColor === color ? "border-[3px] border-black/30" : ""}`}
                  style={{ backgroundColor: color }}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
            <View className="flex-row justify-center gap-2.5">
              {COLOR_OPTIONS.slice(7).map((color) => (
                <TouchableOpacity
                  key={color}
                  className={`w-9 h-9 rounded-full ${selectedColor === color ? "border-[3px] border-black/30" : ""}`}
                  style={{ backgroundColor: color }}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </View>

          {/* Icon Picker */}
          <ScrollView className="max-h-[220px]" showsVerticalScrollIndicator={false}>
            <View className="gap-3">
              {[0, 1, 2, 3].map((row) => (
                <View key={row} className="flex-row justify-center gap-2.5">
                  {ICON_OPTIONS.slice(row * 6, row * 6 + 6).map((icon) => (
                    <TouchableOpacity
                      key={icon.id}
                      className="w-12 h-12 rounded-full justify-center items-center"
                      style={{
                        backgroundColor: selectedIcon === icon.id ? selectedColor : theme.surface,
                      }}
                      onPress={() => setSelectedIcon(icon.id)}
                    >
                      {getIconComponent(icon.id, 20, selectedIcon === icon.id ? "#1C1C1E" : theme.textSecondary)}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="flex-row gap-3 pt-4">
          <TouchableOpacity
            className="w-14 h-14 rounded-full justify-center items-center"
            style={{ backgroundColor: theme.surface }}
            onPress={() => setShowCategoryModal(false)}
          >
            <ArrowLeft size={24} color={theme.textSecondary} style={{ transform: [{ rotate: "45deg" }] }} />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 h-14 rounded-full justify-center items-center"
            style={{ backgroundColor: newCategoryName ? theme.text : theme.textSecondary }}
            onPress={handleCreateCategory}
            disabled={!newCategoryName.trim() || creatingCategory}
          >
            <Check size={24} color={theme.background} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete Category Confirmation Modal */}
      <Modal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t.common.delete} height="auto">
        <Text className="text-base font-manrope mb-6" style={{ color: theme.textSecondary }}>
          {t.common.delete} &quot;{categoryToDelete?.name}&quot;?
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 h-14 rounded-full justify-center items-center"
            style={{ backgroundColor: theme.background }}
            onPress={() => setShowDeleteModal(false)}
          >
            <Text className="text-base font-manrope-semibold" style={{ color: theme.text }}>
              {t.common.cancel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 h-14 rounded-full justify-center items-center"
            style={{ backgroundColor: "#FF7476" }}
            onPress={handleDeleteCategory}
            disabled={deletingCategory}
          >
            <Text className="text-base font-manrope-semibold text-white">
              {deletingCategory ? t.common.loading : t.common.delete}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
