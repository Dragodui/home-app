import { useRouter } from "expo-router";
import { Notebook, Tag } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import NoteCard from "@/components/notes/note-card";
import {
  type MentionChip,
  type MentionKind,
  type MentionSuggestion,
  NoteMentionChips,
  NoteMentionSuggestions,
} from "@/components/notes/note-mentions";
import { getNoteCategoryIcon, NOTE_CATEGORY_COLORS, NOTE_ICON_OPTIONS } from "@/components/notes/note-options";
import { NotesSkeleton } from "@/components/skeletons";
import {
  ActionSheet,
  Button,
  CategoryFormModal,
  ChipSelect,
  EmptyState,
  FabMenu,
  Input,
  Modal,
  Section,
  type SheetAction,
  TabHeader,
  TabScreen,
  useAlert,
} from "@/components/ui";
import { billApi, billCategoryApi, noteApi, shoppingApi, taskApi } from "@/lib/api";
import type { Bill, BillCategory, Note, NoteCategory, ShoppingCategory, ShoppingItem, Task } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";

type SuggestionStep =
  | "category"
  | "shopping_categories"
  | "bill_categories"
  | "shopping_items"
  | "bill_items"
  | "users"
  | "tasks"
  | "note_categories"
  | null;

export default function NotesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { home, isAdmin } = useHome();
  const { t } = useI18n();
  const { alert } = useAlert();

  // Notes and Categories state
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active view note modal
  const [expandedNoteIds, setExpandedNoteIds] = useState<number[]>([]);
  const [selectedNoteForActions, setSelectedNoteForActions] = useState<Note | null>(null);

  // Create / Edit Note Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteIdToEdit, setNoteIdToEdit] = useState<number | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCategoryId, setNoteCategoryId] = useState<number | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Mentions lists (fetched for picker/autocomplete)
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [billCategories, setBillCategories] = useState<BillCategory[]>([]);
  const [shoppingCategories, setShoppingCategories] = useState<ShoppingCategory[]>([]);

  // Selected Mentions IDs for Editor
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);
  const [selectedShoppingItemIds, setSelectedShoppingItemIds] = useState<number[]>([]);
  const [selectedNoteCategoryIds, setSelectedNoteCategoryIds] = useState<number[]>([]);
  const [selectedBillCategoryIds, setSelectedBillCategoryIds] = useState<number[]>([]);
  const [selectedShoppingCategoryIds, setSelectedShoppingCategoryIds] = useState<number[]>([]);

  // Mentions Autocomplete suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionStep, setSuggestionStep] = useState<SuggestionStep>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<number | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState("");

  // Create category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#D2C4FF");
  const [categoryIcon, setCategoryIcon] = useState("tag");
  const [savingCategory, setSavingCategory] = useState(false);

  const removeMentionFromText = (type: string, name: string) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `@${type}:(?:"${escapedName}"|${escapedName})\\s*|@(?:"${escapedName}"|${escapedName})\\s*`,
      "g",
    );
    const updated = noteContent.replace(regex, "");
    setNoteContent(updated);
  };

  // Pre-load all entities for autocomplete and check-lists
  const loadSuggestionsData = useCallback(async () => {
    if (!home) return;
    try {
      const [tasksData, billsData, shopCatsData] = await Promise.all([
        taskApi.getByHomeId(home.id).catch(() => []),
        billApi.getByHomeId(home.id).catch(() => []),
        shoppingApi.getCategories(home.id).catch(() => []),
      ]);

      const items: ShoppingItem[] = [];
      for (const cat of shopCatsData) {
        const catItems = await shoppingApi.getCategoryItems(home.id, cat.id).catch(() => []);
        items.push(...catItems);
      }

      const billCatsData = await billCategoryApi.getAll(home.id).catch(() => []);

      setUsers(home.memberships?.map((m) => m.user).filter(Boolean) || []);
      setTasks(tasksData);
      setBills(billsData);
      setShoppingItems(items);
      setBillCategories(billCatsData);
      setShoppingCategories(shopCatsData);
    } catch (e) {
      console.error("Failed to load mentions data:", e);
    }
  }, [home]);

  const loadNotesAndCategories = useCallback(async () => {
    if (!home) {
      setIsLoading(false);
      return;
    }
    try {
      const [notesData, catsData] = await Promise.all([
        noteApi.getByHomeId(home.id, selectedCategoryId || undefined),
        noteApi.getCategoriesByHomeId(home.id),
      ]);
      setNotes(notesData);
      setCategories(catsData);
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [home, selectedCategoryId]);

  useEffect(() => {
    loadNotesAndCategories();
  }, [loadNotesAndCategories]);

  useEffect(() => {
    if (showNoteModal) {
      loadSuggestionsData();
    }
  }, [showNoteModal, loadSuggestionsData]);

  useRealtimeRefresh(["NOTE", "NOTE_CATEGORY"], loadNotesAndCategories);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotesAndCategories();
    setRefreshing(false);
  };

  // Autocomplete mentions parser
  const handleContentChange = (text: string) => {
    setNoteContent(text);

    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    const afterAt = text.substring(lastAtIndex);
    if (
      afterAt.includes(" ") &&
      !afterAt.startsWith('@task:"') &&
      !afterAt.startsWith('@bill:"') &&
      !afterAt.startsWith('@item:"') &&
      !afterAt.startsWith('@category:"') &&
      !afterAt.startsWith('@user:"')
    ) {
      setShowSuggestions(false);
      return;
    }

    if (afterAt === "@") {
      setSuggestionStep("category");
      setSuggestionQuery("");
      setShowSuggestions(true);
      return;
    }

    const match = afterAt.match(/^@(user|task|bill|item|category):(.*)$/);
    if (match) {
      const cat = match[1];
      const query = match[2];

      if (cat === "user") {
        setSuggestionStep("users");
      } else if (cat === "task") {
        setSuggestionStep("tasks");
      } else if (cat === "category") {
        setSuggestionStep("note_categories");
      } else if (cat === "bill") {
        setSuggestionStep("bill_categories");
      } else if (cat === "item") {
        setSuggestionStep("shopping_categories");
      }

      setSuggestionQuery(query);
      setShowSuggestions(true);
      return;
    }

    const categoryQuery = afterAt.substring(1).toLowerCase();
    setSuggestionStep("category");
    setSuggestionQuery(categoryQuery);
    setShowSuggestions(true);
  };

  const getFilteredItems = () => {
    const lowerQuery = suggestionQuery.toLowerCase();

    if (suggestionStep === "category") {
      const categoriesList = [
        { id: 1, name: "Users", type: "category", val: "users" },
        { id: 2, name: "Tasks", type: "category", val: "tasks" },
        { id: 3, name: "Bills", type: "category", val: "bill_categories" },
        { id: 4, name: "Shopping Items", type: "category", val: "shopping_categories" },
        { id: 5, name: "Categories", type: "category", val: "note_categories" },
      ];
      return categoriesList.filter((c) => c.name.toLowerCase().includes(lowerQuery));
    }

    if (suggestionStep === "users") {
      return users
        .filter((u) => (u.username || u.name).toLowerCase().includes(lowerQuery))
        .map((u) => ({ id: u.id, name: u.username || u.name, type: "user" }));
    }

    if (suggestionStep === "tasks") {
      return tasks
        .filter((t) => t.name.toLowerCase().includes(lowerQuery))
        .map((t) => ({ id: t.id, name: t.name, type: "task" }));
    }

    if (suggestionStep === "note_categories") {
      return categories
        .filter((c) => c.name.toLowerCase().includes(lowerQuery))
        .map((c) => ({ id: c.id, name: c.name, type: "note_category" }));
    }

    if (suggestionStep === "bill_categories") {
      return billCategories
        .filter((c) => c.name.toLowerCase().includes(lowerQuery))
        .map((c) => ({ id: c.id, name: c.name, type: "bill_category" }));
    }

    if (suggestionStep === "shopping_categories") {
      return shoppingCategories
        .filter((c) => c.name.toLowerCase().includes(lowerQuery))
        .map((c) => ({ id: c.id, name: c.name, type: "shopping_category" }));
    }

    if (suggestionStep === "shopping_items" && selectedSubCategoryId !== null) {
      return shoppingItems
        .filter((i) => i.categoryId === selectedSubCategoryId && i.name.toLowerCase().includes(lowerQuery))
        .map((i) => ({ id: i.id, name: i.name, type: "item" }));
    }

    if (suggestionStep === "bill_items" && selectedSubCategoryId !== null) {
      return bills
        .filter((b) => b.billCategoryId === selectedSubCategoryId && b.description.toLowerCase().includes(lowerQuery))
        .map((b) => ({ id: b.id, name: b.description, type: "bill" }));
    }

    return [];
  };

  const selectCategory = (stepVal: SuggestionStep) => {
    const lastAtIndex = noteContent.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    const before = noteContent.substring(0, lastAtIndex);

    let prefix = "@";
    if (stepVal === "users") prefix = "@user:";
    else if (stepVal === "tasks") prefix = "@task:";
    else if (stepVal === "note_categories") prefix = "@category:";
    else if (stepVal === "bill_categories") prefix = "@bill:";
    else if (stepVal === "shopping_categories") prefix = "@item:";

    const newText = before + prefix;
    setNoteContent(newText);

    setSuggestionStep(stepVal);
    setSuggestionQuery("");
  };

  const selectItem = (itemId: number, itemName: string, type: string) => {
    const lastAtIndex = noteContent.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    const before = noteContent.substring(0, lastAtIndex);
    let insertText = "";

    switch (type) {
      case "user":
        insertText = `@user:"${itemName}"`;
        if (!selectedUserIds.includes(itemId)) setSelectedUserIds([...selectedUserIds, itemId]);
        break;
      case "task":
        insertText = `@task:"${itemName}"`;
        if (!selectedTaskIds.includes(itemId)) setSelectedTaskIds([...selectedTaskIds, itemId]);
        break;
      case "bill":
        insertText = `@bill:"${itemName}"`;
        if (!selectedBillIds.includes(itemId)) setSelectedBillIds([...selectedBillIds, itemId]);
        break;
      case "item":
        insertText = `@item:"${itemName}"`;
        if (!selectedShoppingItemIds.includes(itemId)) setSelectedShoppingItemIds([...selectedShoppingItemIds, itemId]);
        break;
      case "note_category":
        insertText = `@category:"${itemName}"`;
        if (!selectedNoteCategoryIds.includes(itemId)) setSelectedNoteCategoryIds([...selectedNoteCategoryIds, itemId]);
        break;
      case "bill_category":
        insertText = `@category:"${itemName}"`;
        if (!selectedBillCategoryIds.includes(itemId)) setSelectedBillCategoryIds([...selectedBillCategoryIds, itemId]);
        break;
      case "shopping_category":
        insertText = `@category:"${itemName}"`;
        if (!selectedShoppingCategoryIds.includes(itemId))
          setSelectedShoppingCategoryIds([...selectedShoppingCategoryIds, itemId]);
        break;
    }

    setNoteContent(`${before + insertText} `);
    setShowSuggestions(false);
    setSuggestionStep(null);
    setSelectedSubCategoryId(null);
  };

  const syncMentionIdsBeforeSave = (content: string) => {
    const userIds: number[] = [];
    const taskIds: number[] = [];
    const billIds: number[] = [];
    const itemIds: number[] = [];
    const noteCategoryIds: number[] = [];
    const billCategoryIds: number[] = [];
    const shoppingCategoryIds: number[] = [];

    const regex = /@(user|task|bill|item|category):(?:"([^"]+)"|(\S+))|@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g;

    while (true) {
      const match = regex.exec(content);
      if (match === null) break;

      const prefixType = match[1];
      const name = match[2] || match[4] || match[3] || match[5];

      if (prefixType === "user" || !prefixType) {
        const u = users.find((u) => u.username === name || u.name === name);
        if (u) userIds.push(u.id);
      }
      if (prefixType === "task" || !prefixType) {
        const t = tasks.find((t) => t.name === name);
        if (t) taskIds.push(t.id);
      }
      if (prefixType === "bill" || !prefixType) {
        const b = bills.find((b) => b.description === name);
        if (b) billIds.push(b.id);
      }
      if (prefixType === "item" || !prefixType) {
        const i = shoppingItems.find((i) => i.name === name);
        if (i) itemIds.push(i.id);
      }
      if (prefixType === "category" || !prefixType) {
        const nc = categories.find((c) => c.name === name);
        if (nc) {
          noteCategoryIds.push(nc.id);
        } else {
          const bc = billCategories.find((c) => c.name === name);
          if (bc) {
            billCategoryIds.push(bc.id);
          } else {
            const sc = shoppingCategories.find((c) => c.name === name);
            if (sc) {
              shoppingCategoryIds.push(sc.id);
            }
          }
        }
      }
    }

    return {
      userIds,
      taskIds,
      billIds,
      itemIds,
      noteCategoryIds,
      billCategoryIds,
      shoppingCategoryIds,
    };
  };

  const handleCreateCategory = async () => {
    if (!home || !categoryName.trim()) return;
    setSavingCategory(true);
    try {
      await noteApi.createCategory(home.id, {
        name: categoryName.trim(),
        icon: categoryIcon,
        color: categoryColor,
      });
      setCategoryName("");
      setShowCategoryModal(false);
      await loadNotesAndCategories();
    } catch (e) {
      console.error(e);
      alert(t.common.error, t.notes.failedToCreateCategory);
    } finally {
      setSavingCategory(false);
    }
  };

  const openEditNote = (note: Note) => {
    setNoteIdToEdit(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategoryId(note.noteCategoryId || null);

    // Set mentions
    setSelectedUserIds(note.mentionedUsers?.map((u) => u.id) || []);
    setSelectedTaskIds(note.mentionedTasks?.map((t) => t.id) || []);
    setSelectedBillIds(note.mentionedBills?.map((b) => b.id) || []);
    setSelectedShoppingItemIds(note.mentionedShoppingItems?.map((i) => i.id) || []);
    setSelectedNoteCategoryIds(note.mentionedNoteCategories?.map((c) => c.id) || []);
    setSelectedBillCategoryIds(note.mentionedBillCategories?.map((c) => c.id) || []);
    setSelectedShoppingCategoryIds(note.mentionedShoppingCategories?.map((c) => c.id) || []);

    setShowNoteModal(true);
  };

  const openCreateNote = () => {
    setNoteIdToEdit(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteCategoryId(selectedCategoryId);

    setSelectedUserIds([]);
    setSelectedTaskIds([]);
    setSelectedBillIds([]);
    setSelectedShoppingItemIds([]);
    setSelectedNoteCategoryIds([]);
    setSelectedBillCategoryIds([]);
    setSelectedShoppingCategoryIds([]);

    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!home || !noteTitle.trim()) return;
    setSavingNote(true);

    const synced = syncMentionIdsBeforeSave(noteContent);

    const payload = {
      title: noteTitle.trim(),
      content: noteContent,
      noteCategoryId: noteCategoryId,
      mentionedUserIds: synced.userIds,
      mentionedTaskIds: synced.taskIds,
      mentionedBillIds: synced.billIds,
      mentionedShoppingItemIds: synced.itemIds,
      mentionedNoteCategoryIds: synced.noteCategoryIds,
      mentionedBillCategoryIds: synced.billCategoryIds,
      mentionedShoppingCategoryIds: synced.shoppingCategoryIds,
    };

    try {
      if (noteIdToEdit) {
        await noteApi.update(home.id, noteIdToEdit, payload);
      } else {
        await noteApi.create(home.id, payload);
      }
      setShowNoteModal(false);
      await loadNotesAndCategories();
    } catch (e) {
      console.error(e);
      alert(t.common.error, t.notes.failedToSave);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = (noteId: number) => {
    if (!home) return;
    alert(t.notes.deleteNoteConfirm, "", [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await noteApi.delete(home.id, noteId);
            await loadNotesAndCategories();
          } catch (e) {
            console.error(e);
            alert(t.common.error, t.notes.failedToDelete);
          }
        },
      },
    ]);
  };

  const toggleExpandNote = (id: number) => {
    if (expandedNoteIds.includes(id)) {
      setExpandedNoteIds(expandedNoteIds.filter((x) => x !== id));
    } else {
      setExpandedNoteIds([...expandedNoteIds, id]);
    }
  };

  const handleMentionPress = (type: string, name: string) => {
    switch (type) {
      case "user":
        // Users doesn't have a separate tab, do nothing
        break;
      case "task":
        router.push("/(tabs)/tasks");
        break;
      case "bill":
      case "bill_category":
        router.push("/(tabs)/budget");
        break;
      case "item":
      case "shopping_category":
        router.push("/(tabs)/shopping");
        break;
      case "note_category": {
        const cat = categories.find((c) => c.name === name);
        if (cat) setSelectedCategoryId(cat.id);
        break;
      }
    }
  };

  const getMentionChips = (): MentionChip[] => {
    const synced = syncMentionIdsBeforeSave(noteContent);
    const toChips = (ids: number[], kind: MentionKind, prefix: string, labelOf: (id: number) => string | undefined) =>
      ids.flatMap((id) => {
        const label = labelOf(id);
        return label ? [{ key: `${prefix}-${id}`, kind, label }] : [];
      });

    return [
      ...toChips(synced.userIds, "user", "u", (id) => {
        const found = users.find((x) => x.id === id);
        return found?.username || found?.name;
      }),
      ...toChips(synced.taskIds, "task", "t", (id) => tasks.find((x) => x.id === id)?.name),
      ...toChips(synced.billIds, "bill", "b", (id) => bills.find((x) => x.id === id)?.description),
      ...toChips(synced.itemIds, "item", "i", (id) => shoppingItems.find((x) => x.id === id)?.name),
      ...toChips(synced.noteCategoryIds, "category", "nc", (id) => categories.find((x) => x.id === id)?.name),
      ...toChips(synced.billCategoryIds, "category", "bc", (id) => billCategories.find((x) => x.id === id)?.name),
      ...toChips(
        synced.shoppingCategoryIds,
        "category",
        "sc",
        (id) => shoppingCategories.find((x) => x.id === id)?.name,
      ),
    ];
  };

  const getSuggestionKind = (item: any): MentionKind => {
    if (suggestionStep === "category") {
      const kinds: Record<string, MentionKind> = {
        users: "user",
        tasks: "task",
        bill_categories: "bill",
        shopping_categories: "item",
      };
      return kinds[item.val] ?? "category";
    }
    if (item.type === "user" || suggestionStep === "users") return "user";
    if (item.type === "task" || suggestionStep === "tasks") return "task";
    if (
      item.type === "bill" ||
      item.type === "bill_category" ||
      suggestionStep === "bill_items" ||
      suggestionStep === "bill_categories"
    ) {
      return "bill";
    }
    if (
      item.type === "item" ||
      item.type === "shopping_category" ||
      suggestionStep === "shopping_items" ||
      suggestionStep === "shopping_categories"
    ) {
      return "item";
    }
    return "category";
  };

  const getSuggestions = (): MentionSuggestion[] =>
    getFilteredItems().map((item: any) => {
      const isSubCategoryStep = suggestionStep === "shopping_categories" || suggestionStep === "bill_categories";
      const browseStep: SuggestionStep = suggestionStep === "shopping_categories" ? "shopping_items" : "bill_items";

      return {
        key: suggestionStep === "category" ? item.val : `${item.type || suggestionStep}-${item.id}`,
        kind: getSuggestionKind(item),
        name: item.name,
        hint: isSubCategoryStep ? t.notes.linkCategory : undefined,
        onBrowse: isSubCategoryStep
          ? () => {
              setSelectedSubCategoryId(item.id);
              setSuggestionStep(browseStep);
              setSuggestionQuery("");
            }
          : undefined,
        onPress: () => {
          if (suggestionStep === "category") {
            selectCategory(item.val);
          } else if (suggestionStep === "shopping_categories") {
            selectItem(item.id, item.name, "shopping_category");
          } else if (suggestionStep === "bill_categories") {
            selectItem(item.id, item.name, "bill_category");
          } else {
            selectItem(item.id, item.name, item.type || suggestionStep);
          }
        },
      };
    });

  const suggestionTitle =
    suggestionStep === "category"
      ? "Mention Category"
      : suggestionStep === "shopping_categories"
        ? "Select Shopping Category"
        : suggestionStep === "bill_categories"
          ? "Select Bill Category"
          : suggestionStep === "shopping_items"
            ? "Select Shopping Item"
            : suggestionStep === "bill_items"
              ? "Select Bill"
              : `Select ${suggestionStep}`;

  const goBackInSuggestions = () => {
    if (suggestionStep === "shopping_items") {
      setSuggestionStep("shopping_categories");
    } else if (suggestionStep === "bill_items") {
      setSuggestionStep("bill_categories");
    } else {
      setSuggestionStep("category");
    }
  };

  const noteActions: SheetAction[] =
    selectedNoteForActions && (isAdmin || selectedNoteForActions.createdBy === user?.id)
      ? [
          { label: t.notes.editNote, onPress: () => openEditNote(selectedNoteForActions) },
          {
            label: t.common.delete || "Delete",
            destructive: true,
            onPress: () => handleDeleteNote(selectedNoteForActions.id),
          },
        ]
      : [];

  if (isLoading) {
    return <NotesSkeleton />;
  }

  const suggestions = showNoteModal && showSuggestions ? getSuggestions() : [];

  return (
    <TabScreen
      refreshing={refreshing}
      onRefresh={onRefresh}
      overlay={
        <FabMenu
          items={[
            { icon: Tag, label: t.notes.category || "Category", onPress: () => setShowCategoryModal(true) },
            { icon: Notebook, label: t.notes.createNote, onPress: openCreateNote },
          ]}
        />
      }
    >
      <TabHeader title={t.notes.title} />

      <ChipSelect<number | null>
        value={selectedCategoryId}
        onChange={setSelectedCategoryId}
        className="mb-5"
        options={[
          { value: null, label: t.common.all },
          ...categories.map((cat) => ({ value: cat.id, label: cat.name, icon: getNoteCategoryIcon(cat.icon) })),
        ]}
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={Notebook}
          title={t.notes.noNotes}
          description={t.notes.noNotesDescription}
          action={<Button title={t.notes.createNote} onPress={openCreateNote} />}
        />
      ) : (
        <View className="gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              expanded={expandedNoteIds.includes(note.id)}
              onPress={() => toggleExpandNote(note.id)}
              onLongPress={() => setSelectedNoteForActions(note)}
              onMentionPress={handleMentionPress}
            />
          ))}
        </View>
      )}

      <ActionSheet
        visible={!!selectedNoteForActions}
        onClose={() => setSelectedNoteForActions(null)}
        title={selectedNoteForActions?.title}
        cancelLabel={t.common.cancel || "Cancel"}
        actions={noteActions}
      />

      <Modal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title={noteIdToEdit ? t.notes.editNote : t.notes.createNote}
      >
        <Input
          label={t.notes.noteTitle}
          placeholder={t.notes.noteTitlePlaceholder}
          value={noteTitle}
          onChangeText={setNoteTitle}
        />

        <Section compact title={t.notes.category}>
          <ChipSelect<number | null>
            value={noteCategoryId}
            onChange={setNoteCategoryId}
            options={[
              { value: null, label: t.notes.noCategory },
              ...categories.map((c) => ({ value: c.id, label: c.name, icon: getNoteCategoryIcon(c.icon) })),
            ]}
          />
        </Section>

        <Input
          label={t.notes.noteContent}
          placeholder={t.notes.noteContentPlaceholder}
          value={noteContent}
          onChangeText={handleContentChange}
          multiline
          style={{
            height: 160,
            paddingTop: 16,
            paddingBottom: 16,
            textAlignVertical: "top",
          }}
        />

        {suggestions.length > 0 && (
          <NoteMentionSuggestions
            title={suggestionTitle}
            suggestions={suggestions}
            onBack={suggestionStep !== "category" ? goBackInSuggestions : undefined}
          />
        )}

        {showNoteModal && (
          <NoteMentionChips
            chips={getMentionChips()}
            onRemove={(chip) => removeMentionFromText(chip.kind, chip.label)}
          />
        )}

        <View className="flex-row gap-3 mt-2">
          <Button
            title={t.common.cancel}
            variant="secondary"
            onPress={() => setShowNoteModal(false)}
            className="flex-1"
          />
          <Button
            title={noteIdToEdit ? t.common.save : t.common.create || "Create"}
            onPress={handleSaveNote}
            loading={savingNote}
            disabled={savingNote || !noteTitle.trim()}
            className="flex-1"
          />
        </View>
      </Modal>

      <CategoryFormModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={t.notes.createCategory}
        namePlaceholder={t.notes.categoryNamePlaceholder}
        name={categoryName}
        onNameChange={setCategoryName}
        colors={NOTE_CATEGORY_COLORS}
        color={categoryColor}
        onColorChange={setCategoryColor}
        iconOptions={NOTE_ICON_OPTIONS}
        icon={categoryIcon}
        onIconChange={setCategoryIcon}
        submitLabel={t.common.create}
        submitting={savingCategory}
        onSubmit={handleCreateCategory}
      />
    </TabScreen>
  );
}
