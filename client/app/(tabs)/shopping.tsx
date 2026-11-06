import { ChevronRight, Plus, ShoppingCart, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import ShoppingItemRow from "@/components/shopping/shopping-item-row";
import { DEFAULT_CATEGORY_COLOR, getShoppingIcon, SHOPPING_ICON_OPTIONS } from "@/components/shopping/shopping-options";
import { ShoppingSkeleton } from "@/components/skeletons";
import {
  ActionSheet,
  Button,
  Card,
  CategoryFormModal,
  Divider,
  EmptyState,
  Fab,
  IconButton,
  Input,
  Modal,
  ResponsiveGrid,
  ScreenHeader,
  TabHeader,
  TabScreen,
  Text,
  useAlert,
} from "@/components/ui";
import { PICKER_COLORS } from "@/constants/colors";
import { shoppingApi } from "@/lib/api";
import type { ShoppingCategory, ShoppingItem } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

const DEFAULT_LIST_COLOR: string = PICKER_COLORS[0];
const DEFAULT_LIST_ICON = SHOPPING_ICON_OPTIONS[0].value;

const getItemTimestamp = (value?: string) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortShoppingItems = (shoppingItems: ShoppingItem[]) =>
  [...shoppingItems].sort((left, right) => {
    if (left.isBought !== right.isBought) {
      return left.isBought ? 1 : -1;
    }

    if (!left.isBought) {
      return getItemTimestamp(left.createdAt) - getItemTimestamp(right.createdAt);
    }

    const boughtDiff = getItemTimestamp(right.boughtDate) - getItemTimestamp(left.boughtDate);
    if (boughtDiff !== 0) {
      return boughtDiff;
    }

    return getItemTimestamp(right.createdAt) - getItemTimestamp(left.createdAt);
  });

export default function ShoppingScreen() {
  const { home } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [items, setItems] = useState<Record<number, ShoppingItem[]>>({});
  const [activeCategory, setActiveCategory] = useState<ShoppingCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_LIST_COLOR);
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_LIST_ICON);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [selectedCategoryForActions, setSelectedCategoryForActions] = useState<ShoppingCategory | null>(null);

  // Delete category
  const [deletingCategory, setDeletingCategory] = useState(false);

  // Create item modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [pendingItemNames, setPendingItemNames] = useState<string[]>([]);
  const [creatingItem, setCreatingItem] = useState(false);
  const [selectedItemForActions, setSelectedItemForActions] = useState<ShoppingItem | null>(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editItemName, setEditItemName] = useState("");
  const [savingItemEdit, setSavingItemEdit] = useState(false);
  const suppressRealtimeRefreshUntilRef = useRef(0);

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
          itemsData[category.id] = sortShoppingItems(results[i] || []);
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

  const handleRealtimeRefresh = useCallback(() => {
    if (Date.now() < suppressRealtimeRefreshUntilRef.current) {
      return;
    }
    loadShoppingData();
  }, [loadShoppingData]);

  useRealtimeRefresh(["SHOPPING_CATEGORY", "SHOPPING_ITEM"], handleRealtimeRefresh);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShoppingData();
    setRefreshing(false);
  };

  const handleCreateCategory = async () => {
    if (!home || !newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      if (editingCategoryId) {
        await shoppingApi.editCategory(home.id, editingCategoryId, {
          name: newCategoryName.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await shoppingApi.createCategory(home.id, {
          name: newCategoryName.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
      }

      setNewCategoryName("");
      setSelectedIcon(DEFAULT_LIST_ICON);
      setSelectedColor(DEFAULT_LIST_COLOR);
      setShowCategoryModal(false);
      setEditingCategoryId(null);
      await loadShoppingData();
    } catch (error) {
      console.error("Error creating category:", error);
    } finally {
      setCreatingCategory(false);
    }
  };

  const openCategoryActions = (category: ShoppingCategory) => {
    setSelectedCategoryForActions(category);
  };

  const openEditCategory = (category: ShoppingCategory) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.name || "");
    setSelectedIcon(category.icon || DEFAULT_LIST_ICON);
    setSelectedColor(category.color || DEFAULT_LIST_COLOR);
    setShowCategoryModal(true);
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

    const categoryEntry = Object.entries(items).find(([, categoryItems]) =>
      categoryItems.some((item) => item.id === itemId),
    );
    if (!categoryEntry) return;

    const [categoryKey, categoryItems] = categoryEntry;
    const categoryId = Number(categoryKey);
    const currentItem = categoryItems.find((item) => item.id === itemId);
    if (!currentItem) return;

    const previousCategoryItems = categoryItems;
    const nowIso = new Date().toISOString();
    suppressRealtimeRefreshUntilRef.current = Date.now() + 1200;

    setItems((prev) => ({
      ...prev,
      [categoryId]: sortShoppingItems(
        (prev[categoryId] || []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                isBought: !item.isBought,
                boughtDate: item.isBought ? undefined : nowIso,
              }
            : item,
        ),
      ),
    }));

    try {
      await shoppingApi.markBought(home.id, itemId);
    } catch (error) {
      console.error("Error toggling item:", error);
      suppressRealtimeRefreshUntilRef.current = 0;
      setItems((prev) => ({
        ...prev,
        [categoryId]: previousCategoryItems,
      }));
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

  const openItemActions = (item: ShoppingItem) => {
    setSelectedItemForActions(item);
  };

  const handleEditItem = async () => {
    if (!home || !selectedItemForActions || !editItemName.trim()) return;
    setSavingItemEdit(true);
    try {
      await shoppingApi.editItem(home.id, selectedItemForActions.id, { name: editItemName.trim() });
      setShowEditItemModal(false);
      setSelectedItemForActions(null);
      await loadShoppingData();
    } catch (error) {
      console.error("Error editing item:", error);
    } finally {
      setSavingItemEdit(false);
    }
  };

  const handleDeleteCategory = async (category: ShoppingCategory) => {
    if (!home) return;
    setDeletingCategory(true);
    try {
      await shoppingApi.deleteCategory(home.id, category.id);
      if (activeCategory?.id === category.id) {
        setActiveCategory(null);
      }
      await loadShoppingData();
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setDeletingCategory(false);
    }
  };

  const openDeleteCategory = (category: ShoppingCategory) => {
    if (deletingCategory) return;
    alert(t.common.delete, `${t.common.delete} "${category.name}"?`, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: () => {
          handleDeleteCategory(category);
        },
      },
    ]);
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
    const pendingItems = categoryItems.filter((item) => !item.isBought);
    const boughtItems = categoryItems.filter((item) => item.isBought);
    const renderItem = (item: ShoppingItem) => (
      <ShoppingItemRow
        key={item.id}
        item={item}
        onToggle={() => toggleItemBought(item.id)}
        onLongPress={() => openItemActions(item)}
        onDelete={() => handleDeleteItem(item.id)}
      />
    );

    return (
      <TabScreen
        width="md"
        overlay={
          <Fab icon={Plus} tone="cyan" aboveTabBar onPress={openItemModal} accessibilityLabel={t.shopping.addItem} />
        }
      >
        <ScreenHeader title={activeCategory.name} onBack={() => setActiveCategory(null)} />

        {categoryItems.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t.shopping.noItems || "No Items"}
            description={t.shopping.noItemsHint || "Your shopping list is empty."}
            action={<Button title={t.shopping.addItem || "Add Item"} onPress={openItemModal} />}
          />
        ) : (
          <View className="gap-4">
            {pendingItems.map(renderItem)}
            {pendingItems.length > 0 && boughtItems.length > 0 && <Divider className="my-3" />}
            {boughtItems.map(renderItem)}
          </View>
        )}

        <Modal visible={showItemModal} onClose={closeItemModal} title={t.shopping.addItem}>
          <Input
            label={t.shopping.itemName}
            placeholder={t.shopping.itemNamePlaceholder}
            value={newItemName}
            onChangeText={setNewItemName}
          />

          <Button
            title={t.common.add}
            size="md"
            onPress={handleAddPendingItem}
            disabled={!newItemName.trim() || creatingItem}
            variant="yellow"
            className="mb-6"
          />

          {pendingItemNames.length > 0 && (
            <View className="mb-6 gap-2">
              <Text variant="overline" className="ml-1">
                {t.common.items} ({pendingItemNames.length})
              </Text>
              {pendingItemNames.map((itemName, index) => (
                <Card key={`${itemName}-${index}`} size="sm" className="flex-row items-center gap-3">
                  <Text variant="label" className="flex-1">
                    {itemName}
                  </Text>
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    tone="danger"
                    accessibilityLabel={t.common.delete}
                    onPress={() => setPendingItemNames((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  />
                </Card>
              ))}
            </View>
          )}

          <Button
            title={t.common.done}
            onPress={handleCreateItem}
            loading={creatingItem}
            disabled={(pendingItemNames.length === 0 && !newItemName.trim()) || creatingItem}
            variant="purple"
          />
        </Modal>

        <ActionSheet
          visible={!!selectedItemForActions && !showEditItemModal}
          onClose={() => {
            if (!showEditItemModal) setSelectedItemForActions(null);
          }}
          title={selectedItemForActions?.name || t.shopping.addItem}
          cancelLabel={t.common.cancel}
          actions={
            selectedItemForActions
              ? [
                  {
                    label: t.common.edit,
                    onPress: () => {
                      // Keeps the item selected, because the edit modal saves it.
                      setSelectedItemForActions(selectedItemForActions);
                      setEditItemName(selectedItemForActions.name);
                      setShowEditItemModal(true);
                    },
                  },
                  {
                    label: t.common.delete,
                    destructive: true,
                    onPress: () => handleDeleteItem(selectedItemForActions.id),
                  },
                ]
              : []
          }
        />

        <Modal
          visible={showEditItemModal}
          onClose={() => {
            setShowEditItemModal(false);
            setSelectedItemForActions(null);
          }}
          title={t.shopping.editItem}
          height="auto"
        >
          <Input value={editItemName} onChangeText={setEditItemName} placeholder={t.shopping.itemNamePlaceholder} />
          <Button
            title={t.common.save}
            size="md"
            onPress={handleEditItem}
            loading={savingItemEdit}
            disabled={!editItemName.trim() || savingItemEdit}
          />
        </Modal>
      </TabScreen>
    );
  }

  // Main shopping lists view
  return (
    <TabScreen
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={
        <Fab
          icon={Plus}
          tone="cyan"
          aboveTabBar
          onPress={() => setShowCategoryModal(true)}
          accessibilityLabel={t.shopping.newList}
        />
      }
    >
      <TabHeader title={t.shopping.title}>
        <Text variant="body" color="secondary" className="mt-1">
          {t.shopping.myLists}
        </Text>
      </TabHeader>

      {categories.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t.shopping.noLists || "No Shopping Lists"}
          description={t.shopping.noListsHint || "Create your first shopping list category to start adding items."}
          action={
            <Button
              title={t.shopping.newList || "New List"}
              onPress={() => setShowCategoryModal(true)}
              variant="purple"
            />
          }
        />
      ) : (
        <ResponsiveGrid mobileColumns={2} desktopColumns={4}>
          {categories.map((category) => {
            const CategoryIcon = getShoppingIcon(category.icon);

            return (
              <Card
                key={category.id}
                padding={18}
                borderRadius={24}
                style={{ backgroundColor: category.color || DEFAULT_CATEGORY_COLOR, aspectRatio: 0.9 }}
                onPress={() => setActiveCategory(category)}
                onLongPress={() => openCategoryActions(category)}
              >
                <View className="w-10 h-10 rounded-xl bg-black/5 justify-center items-center">
                  <CategoryIcon size={24} color={theme.onAccent} />
                </View>
                <View className="flex-1 justify-end pr-8">
                  <Text variant="heading" color="onAccent" className="mb-1" numberOfLines={2}>
                    {category.name}
                  </Text>
                  <Text variant="caption" color="onAccent" className="font-manrope-medium opacity-50">
                    {items[category.id]?.length || 0} {t.common.items}
                  </Text>
                </View>
                <View className="absolute bottom-[18px] right-[18px] w-8 h-8 rounded-full bg-black/10 justify-center items-center">
                  <ChevronRight size={16} color={theme.onAccent} />
                </View>
              </Card>
            );
          })}
        </ResponsiveGrid>
      )}

      <CategoryFormModal
        visible={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategoryId(null);
        }}
        title={editingCategoryId ? "Edit list" : t.shopping.newList}
        namePlaceholder={t.shopping.title_input}
        name={newCategoryName}
        onNameChange={setNewCategoryName}
        colors={PICKER_COLORS}
        color={selectedColor}
        onColorChange={setSelectedColor}
        iconOptions={SHOPPING_ICON_OPTIONS}
        icon={selectedIcon}
        onIconChange={setSelectedIcon}
        submitLabel={editingCategoryId ? t.common.save : t.shopping.newList}
        submitting={creatingCategory}
        onSubmit={handleCreateCategory}
      />

      <ActionSheet
        visible={!!selectedCategoryForActions}
        onClose={() => setSelectedCategoryForActions(null)}
        title={selectedCategoryForActions?.name || t.shopping.title}
        cancelLabel={t.common.cancel}
        actions={
          selectedCategoryForActions
            ? [
                { label: t.common.edit, onPress: () => openEditCategory(selectedCategoryForActions) },
                {
                  label: t.common.delete,
                  destructive: true,
                  onPress: () => openDeleteCategory(selectedCategoryForActions),
                },
              ]
            : []
        }
      />
    </TabScreen>
  );
}
