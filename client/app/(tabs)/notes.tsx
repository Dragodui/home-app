import { useRouter } from "expo-router";
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
  Notebook,
  Plus,
  ShoppingBag,
  Smile,
  Star,
  Tag,
  Trash2,
  User as UserIcon,
  Utensils,
  Wrench,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotesSkeleton } from "@/components/skeletons";
import { useAlert } from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { billApi, billCategoryApi, noteApi, shoppingApi, taskApi } from "@/lib/api";
import type { Bill, BillCategory, Note, NoteCategory, ShoppingCategory, ShoppingItem, Task } from "@/lib/types";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { home, isAdmin } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();
  const { isDesktop, horizontalPadding, contentMaxWidth } = useResponsiveLayout();

  // Notes and Categories state
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active view note modal
  const [expandedNoteIds, setExpandedNoteIds] = useState<number[]>([]);
  const [showNoteActionsModal, setShowNoteActionsModal] = useState(false);
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

  // Preset Colors for Categories (matching the design system accents and pastels)
  const PRESET_COLORS = [
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
  ];

  // Helper to render category icon component
  const getCategoryIcon = (iconName: string, size = 16, color = theme.text) => {
    switch (iconName) {
      case "notebook":
        return <Notebook size={size} color={color} />;
      case "tag":
        return <Tag size={size} color={color} />;
      case "edit":
        return <Edit2 size={size} color={color} />;
      case "home":
        return <Home size={size} color={color} />;
      case "shopping":
        return <ShoppingBag size={size} color={color} />;
      case "finance":
        return <DollarSign size={size} color={color} />;
      case "task":
        return <CheckCircle size={size} color={color} />;
      case "calendar":
        return <Calendar size={size} color={color} />;
      case "lock":
        return <Lock size={size} color={color} />;
      case "idea":
        return <Lightbulb size={size} color={color} />;
      case "heart":
        return <Heart size={size} color={color} />;
      case "food":
        return <Utensils size={size} color={color} />;
      case "book":
        return <Book size={size} color={color} />;
      case "work":
        return <Briefcase size={size} color={color} />;
      case "coffee":
        return <Coffee size={size} color={color} />;
      case "star":
        return <Star size={size} color={color} />;
      case "tool":
        return <Wrench size={size} color={color} />;
      case "user":
        return <UserIcon size={size} color={color} />;
      case "smile":
        return <Smile size={size} color={color} />;
      case "document":
        return <FileText size={size} color={color} />;
      default:
        return <Tag size={size} color={color} />;
    }
  };

  const getSuggestionAlignment = () => {
    const lastAtIndex = noteContent.lastIndexOf("@");
    if (lastAtIndex === -1) return { left: 16 };

    const textBeforeAt = noteContent.substring(0, lastAtIndex);
    const lines = textBeforeAt.split("\n");
    const currentLineText = lines[lines.length - 1] || "";

    if (currentLineText.length < 20) {
      return { left: 16 };
    }
    return { right: 16 };
  };

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
      alert(t.common.error, "Failed to create category");
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
      alert(t.common.error, "Failed to save note");
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
            alert(t.common.error, "Failed to delete note");
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

  const renderNoteContentWithMentions = (text: string, note: Note, numberOfLines?: number) => {
    const regex = /@(user|task|bill|item|category):(?:"([^"]+)"|(\S+))|@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    while (true) {
      const match = regex.exec(text);
      if (match === null) break;
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(
          <Text key={key++} className="font-manrope text-base" style={{ color: theme.text }}>
            {text.substring(lastIndex, matchIndex)}
          </Text>,
        );
      }

      const fullMatch = match[0];
      const prefixType = match[1];
      const quotedName = match[2] || match[4];
      const unquotedName = match[3] || match[5];
      const name = quotedName || unquotedName;

      let isMention = false;
      let badgeBg = "";
      let label = name;

      let icon: React.ReactNode = null;

      if (
        prefixType === "user" ||
        (!prefixType && note.mentionedUsers?.some((u) => u.username === name || u.name === name))
      ) {
        isMention = true;
        badgeBg = "bg-accent-purple/20 text-accent-purple";
        label = name;
        icon = (
          <UserIcon
            size={12}
            color={theme.accent.purple}
            style={{ marginRight: 2, display: "inline-flex" as any, verticalAlign: "middle" as any }}
          />
        );
      } else if (prefixType === "task" || (!prefixType && note.mentionedTasks?.some((t) => t.name === name))) {
        isMention = true;
        badgeBg = "bg-accent-mint/20 text-accent-mint";
        label = name;
        icon = (
          <CheckCircle
            size={12}
            color={theme.accent.mint}
            style={{ marginRight: 2, display: "inline-flex" as any, verticalAlign: "middle" as any }}
          />
        );
      } else if (prefixType === "bill" || (!prefixType && note.mentionedBills?.some((b) => b.description === name))) {
        isMention = true;
        badgeBg = "bg-accent-yellow/20 text-accent-yellow";
        label = name;
        icon = (
          <DollarSign
            size={12}
            color={theme.accent.yellow}
            style={{ marginRight: 2, display: "inline-flex" as any, verticalAlign: "middle" as any }}
          />
        );
      } else if (prefixType === "item" || (!prefixType && note.mentionedShoppingItems?.some((i) => i.name === name))) {
        isMention = true;
        badgeBg = "bg-accent-cyan/20 text-accent-cyan";
        label = name;
        icon = (
          <ShoppingBag
            size={12}
            color={theme.accent.cyan}
            style={{ marginRight: 2, display: "inline-flex" as any, verticalAlign: "middle" as any }}
          />
        );
      } else if (
        prefixType === "category" ||
        (!prefixType &&
          (note.mentionedNoteCategories?.some((c) => c.name === name) ||
            note.mentionedBillCategories?.some((c) => c.name === name) ||
            note.mentionedShoppingCategories?.some((c) => c.name === name)))
      ) {
        isMention = true;
        badgeBg = "bg-accent-pink/20 text-accent-pink";
        label = name;
        icon = (
          <Tag
            size={12}
            color={theme.accent.pink}
            style={{ marginRight: 2, display: "inline-flex" as any, verticalAlign: "middle" as any }}
          />
        );
      }

      if (isMention) {
        parts.push(
          <Text
            key={key++}
            onPress={() =>
              handleMentionPress(
                prefixType ||
                  (note.mentionedUsers?.some((u) => u.username === name || u.name === name)
                    ? "user"
                    : note.mentionedTasks?.some((t) => t.name === name)
                      ? "task"
                      : "note_category"),
                name,
              )
            }
            className={`font-manrope-semibold text-sm px-2.5 py-0.5 rounded-full overflow-hidden mx-0.5 ${badgeBg}`}
          >
            {icon} {label}
          </Text>,
        );
      } else {
        parts.push(
          <Text key={key++} className="font-manrope text-base" style={{ color: theme.text }}>
            {fullMatch}
          </Text>,
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(
        <Text key={key++} className="font-manrope text-base" style={{ color: theme.text }}>
          {text.substring(lastIndex)}
        </Text>,
      );
    }
    return (
      <Text numberOfLines={numberOfLines} className="flex-row flex-wrap leading-6">
        {parts}
      </Text>
    );
  };

  const _renderFormattedNoteTextInEditor = (text: string) => {
    const regex = /@(user|task|bill|item|category):(?:"([^"]+)"|(\S+))|@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    while (true) {
      const match = regex.exec(text);
      if (match === null) break;
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const fullMatch = match[0];
      const prefixType = match[1];
      const quotedName = match[2] || match[4];
      const unquotedName = match[3] || match[5];
      const name = quotedName || unquotedName;

      let isMention = false;
      let badgeBg = "";
      let textColor = "";

      if (prefixType === "user" || (!prefixType && users.some((u) => u.username === name || u.name === name))) {
        isMention = true;
        badgeBg = "bg-accent-purple/20";
        textColor = theme.accent.purple;
      } else if (prefixType === "task" || (!prefixType && tasks.some((t) => t.name === name))) {
        isMention = true;
        badgeBg = "bg-accent-mint/20";
        textColor = theme.accent.mint;
      } else if (prefixType === "bill" || (!prefixType && bills.some((b) => b.description === name))) {
        isMention = true;
        badgeBg = "bg-accent-yellow/20";
        textColor = theme.accent.yellow;
      } else if (prefixType === "item" || (!prefixType && shoppingItems.some((i) => i.name === name))) {
        isMention = true;
        badgeBg = "bg-accent-cyan/20";
        textColor = theme.accent.cyan;
      } else if (
        prefixType === "category" ||
        (!prefixType &&
          (categories.some((c) => c.name === name) ||
            billCategories.some((c) => c.name === name) ||
            shoppingCategories.some((c) => c.name === name)))
      ) {
        isMention = true;
        badgeBg = "bg-accent-pink/20";
        textColor = theme.accent.pink;
      }

      if (isMention) {
        parts.push(
          <Text
            key={key++}
            className={`font-manrope-semibold text-sm px-2 py-0.5 rounded-full overflow-hidden mx-0.5 ${badgeBg}`}
            style={{ color: textColor }}
          >
            {fullMatch}
          </Text>,
        );
      } else {
        parts.push(fullMatch);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts;
  };

  const _getSuggestionAlignment = () => {
    const lastAtIndex = noteContent.lastIndexOf("@");
    if (lastAtIndex === -1) return { left: 16 };

    const textBeforeAt = noteContent.substring(0, lastAtIndex);
    const lines = textBeforeAt.split("\n");
    const currentLineText = lines[lines.length - 1] || "";

    if (currentLineText.length < 20) {
      return { left: 16 };
    }
    return { right: 16 };
  };

  if (isLoading) {
    return <NotesSkeleton />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: insets.top + (isDesktop ? 16 : 24),
          paddingBottom: insets.bottom + 100,
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-3xl font-manrope-bold" style={{ color: theme.text }}>
              {t.notes.title}
            </Text>
          </View>
          <View className="flex-row items-center gap-2.5">
            <TouchableOpacity
              className="px-4 py-2 rounded-xl justify-center items-center"
              style={{ backgroundColor: theme.surface }}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.8}
            >
              <Text className="text-xs font-manrope-semibold" style={{ color: theme.text }}>
                + {t.notes.category || "Category"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 20 }}
        >
          <TouchableOpacity
            className={`px-5 py-2.5 rounded-full ${selectedCategoryId === null ? "" : "border"}`}
            style={{
              backgroundColor: selectedCategoryId === null ? theme.text : theme.surface,
              borderColor: theme.border,
            }}
            onPress={() => setSelectedCategoryId(null)}
            activeOpacity={0.8}
          >
            <Text
              className="text-sm font-manrope-bold"
              style={{ color: selectedCategoryId === null ? theme.background : theme.text }}
            >
              {t.common.all}
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              className={`px-5 py-2.5 rounded-full flex-row items-center gap-1.5 ${
                selectedCategoryId === cat.id ? "" : "border"
              }`}
              style={{
                backgroundColor: selectedCategoryId === cat.id ? theme.text : theme.surface,
                borderColor: theme.border,
              }}
              onPress={() => setSelectedCategoryId(cat.id)}
              activeOpacity={0.8}
            >
              {getCategoryIcon(cat.icon || "tag", 14, selectedCategoryId === cat.id ? theme.background : theme.text)}
              <Text
                className="text-sm font-manrope-bold"
                style={{ color: selectedCategoryId === cat.id ? theme.background : theme.text }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notes List */}
        {notes.length === 0 ? (
          <View className="items-center py-20 px-6">
            <View
              className="w-16 h-16 rounded-full justify-center items-center mb-4"
              style={{ backgroundColor: theme.surface }}
            >
              <Notebook size={32} color={theme.textSecondary} />
            </View>
            <Text className="text-xl font-manrope-bold mb-2 text-center" style={{ color: theme.text }}>
              {t.notes.noNotes}
            </Text>
            <Text className="text-sm font-manrope text-center leading-5 mb-6" style={{ color: theme.textSecondary }}>
              {t.notes.noNotesDescription}
            </Text>
            <Button title={t.notes.createNote} onPress={openCreateNote} />
          </View>
        ) : (
          <View className="gap-4">
            {notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                onPress={() => toggleExpandNote(note.id)}
                onLongPress={() => {
                  setSelectedNoteForActions(note);
                  setShowNoteActionsModal(true);
                }}
                activeOpacity={0.9}
              >
                <Card className="p-5">
                  <View className="flex-row justify-between items-start mb-3">
                    <Text
                      className="text-lg font-manrope-bold flex-1 mr-4"
                      numberOfLines={1}
                      style={{ color: theme.text }}
                    >
                      {note.title}
                    </Text>
                    {note.noteCategory && (
                      <View
                        className="px-2.5 py-1 rounded-8 flex-row items-center gap-1"
                        style={{ backgroundColor: `${note.noteCategory.color}20` }}
                      >
                        {getCategoryIcon(note.noteCategory.icon || "tag", 12, note.noteCategory.color)}
                        <Text className="text-xs font-manrope-semibold" style={{ color: note.noteCategory.color }}>
                          {note.noteCategory.name}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Render inline parsed content (collapsed at 3 lines, or full height) */}
                  <View className="mb-4">
                    {renderNoteContentWithMentions(
                      note.content,
                      note,
                      expandedNoteIds.includes(note.id) ? undefined : 3,
                    )}
                  </View>

                  <View
                    className="flex-row justify-between items-center pt-3 border-t"
                    style={{ borderColor: theme.border }}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <UserIcon size={12} color={theme.textSecondary} />
                      <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                        {note.creator?.name}
                      </Text>
                    </View>
                    <Text className="text-xs font-manrope" style={{ color: theme.textSecondary }}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Note FAB */}
      <TouchableOpacity
        className="absolute bottom-[120px] right-6 w-14 h-14 rounded-[18px] justify-center items-center shadow-lg z-40"
        style={{ backgroundColor: theme.accent.purple }}
        onPress={openCreateNote}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#1C1C1E" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Note Actions Modal (triggered on long press) */}
      {showNoteActionsModal && selectedNoteForActions && (
        <Modal
          visible={true}
          onClose={() => {
            setShowNoteActionsModal(false);
            setSelectedNoteForActions(null);
          }}
          title={selectedNoteForActions.title}
        >
          <View className="gap-4">
            {(isAdmin || selectedNoteForActions.createdBy === user?.id) && (
              <>
                <Button
                  title="Edit Note"
                  variant="secondary"
                  icon={<Edit2 size={16} color={theme.text} />}
                  onPress={() => {
                    const note = selectedNoteForActions;
                    setShowNoteActionsModal(false);
                    setSelectedNoteForActions(null);
                    openEditNote(note);
                  }}
                />
                <Button
                  title={t.common.delete || "Delete"}
                  variant="danger"
                  icon={<Trash2 size={16} color="#FFFFFF" />}
                  onPress={() => {
                    const id = selectedNoteForActions.id;
                    setShowNoteActionsModal(false);
                    setSelectedNoteForActions(null);
                    handleDeleteNote(id);
                  }}
                />
              </>
            )}
            <Button
              title={t.common.cancel || "Cancel"}
              variant="secondary"
              onPress={() => {
                setShowNoteActionsModal(false);
                setSelectedNoteForActions(null);
              }}
            />
          </View>
        </Modal>
      )}

      {/* Create / Edit Note Modal */}
      {showNoteModal && (
        <Modal
          visible={true}
          onClose={() => setShowNoteModal(false)}
          title={noteIdToEdit ? t.notes.editNote : t.notes.createNote}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
            <View className="relative flex-1">
              <ScrollView className="max-h-[60vh]" showsVerticalScrollIndicator={false}>
                <View className="gap-4 mb-4">
                  <Input
                    label={t.notes.noteTitle}
                    placeholder={t.notes.noteTitlePlaceholder}
                    value={noteTitle}
                    onChangeText={setNoteTitle}
                  />

                  {/* Category Selector */}
                  <View>
                    <Text className="text-xs font-manrope-semibold mb-2" style={{ color: theme.textSecondary }}>
                      {t.notes.category.toUpperCase()}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <TouchableOpacity
                        className={`px-4 py-2 rounded-xl border ${noteCategoryId === null ? "" : "opacity-60"}`}
                        style={{
                          backgroundColor: noteCategoryId === null ? theme.text : theme.surface,
                          borderColor: theme.border,
                        }}
                        onPress={() => setNoteCategoryId(null)}
                      >
                        <Text
                          className="text-xs font-manrope-bold"
                          style={{ color: noteCategoryId === null ? theme.background : theme.text }}
                        >
                          {t.notes.noCategory}
                        </Text>
                      </TouchableOpacity>
                      {categories.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          className={`px-4 py-2 rounded-xl border flex-row items-center gap-1 ${
                            noteCategoryId === c.id ? "" : "opacity-60"
                          }`}
                          style={{
                            backgroundColor: noteCategoryId === c.id ? theme.text : theme.surface,
                            borderColor: theme.border,
                          }}
                          onPress={() => setNoteCategoryId(c.id)}
                        >
                          {getCategoryIcon(
                            c.icon || "tag",
                            12,
                            noteCategoryId === c.id ? theme.background : theme.text,
                          )}
                          <Text
                            className="text-xs font-manrope-bold"
                            style={{ color: noteCategoryId === c.id ? theme.background : theme.text }}
                          >
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Premium multiline textarea for Note Content */}
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

                  {/* Active Mentioned Blocks (Tap to remove) */}
                  {(() => {
                    const synced = syncMentionIdsBeforeSave(noteContent);
                    const hasMentions =
                      synced.userIds.length > 0 ||
                      synced.taskIds.length > 0 ||
                      synced.billIds.length > 0 ||
                      synced.itemIds.length > 0 ||
                      synced.noteCategoryIds.length > 0 ||
                      synced.billCategoryIds.length > 0 ||
                      synced.shoppingCategoryIds.length > 0;

                    if (!hasMentions) return null;

                    return (
                      <View className="mt-2.5">
                        <Text
                          className="text-[10px] font-manrope-bold uppercase tracking-wider mb-2"
                          style={{ color: theme.textSecondary }}
                        >
                          Mentioned Blocks (Tap to Remove)
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {synced.userIds.map((uid) => {
                            const u = users.find((x) => x.id === uid);
                            if (!u) return null;
                            const uName = u.username || u.name;
                            return (
                              <TouchableOpacity
                                key={`u-${uid}`}
                                onPress={() => removeMentionFromText("user", uName)}
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-purple/20"
                                activeOpacity={0.8}
                              >
                                <UserIcon size={12} color={theme.accent.purple} />
                                <Text className="text-xs font-manrope-semibold text-accent-purple">{uName}</Text>
                              </TouchableOpacity>
                            );
                          })}
                          {synced.taskIds.map((tid) => {
                            const t = tasks.find((x) => x.id === tid);
                            if (!t) return null;
                            return (
                              <TouchableOpacity
                                key={`t-${tid}`}
                                onPress={() => removeMentionFromText("task", t.name)}
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-mint/20"
                                activeOpacity={0.8}
                              >
                                <CheckCircle size={12} color={theme.accent.mint} />
                                <Text className="text-xs font-manrope-semibold text-accent-mint">{t.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                          {synced.billIds.map((bid) => {
                            const b = bills.find((x) => x.id === bid);
                            if (!b) return null;
                            return (
                              <TouchableOpacity
                                key={`b-${bid}`}
                                onPress={() => removeMentionFromText("bill", b.description)}
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-yellow/20"
                                activeOpacity={0.8}
                              >
                                <DollarSign size={12} color={theme.accent.yellow} />
                                <Text className="text-xs font-manrope-semibold text-accent-yellow">
                                  {b.description}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          {synced.itemIds.map((iid) => {
                            const i = shoppingItems.find((x) => x.id === iid);
                            if (!i) return null;
                            return (
                              <TouchableOpacity
                                key={`i-${iid}`}
                                onPress={() => removeMentionFromText("item", i.name)}
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-cyan/20"
                                activeOpacity={0.8}
                              >
                                <ShoppingBag size={12} color={theme.accent.cyan} />
                                <Text className="text-xs font-manrope-semibold text-accent-cyan">{i.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                          {synced.noteCategoryIds.map((cid) => {
                            const c = categories.find((x) => x.id === cid);
                            if (!c) return null;
                            return (
                              <TouchableOpacity
                                key={`nc-${cid}`}
                                onPress={() => removeMentionFromText("category", c.name)}
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-pink/20"
                                activeOpacity={0.8}
                              >
                                <Tag size={12} color={theme.accent.pink} />
                                <Text className="text-xs font-manrope-semibold text-accent-pink">{c.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                          {synced.billCategoryIds.map((cid) => {
                            const c = billCategories.find((x) => x.id === cid);
                            if (!c) return null;
                            return (
                              <TouchableOpacity
                                key={`bc-${cid}`}
                                onPress={() => removeMentionFromText("category", c.name)}
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-pink/20"
                                activeOpacity={0.8}
                              >
                                <Tag size={12} color={theme.accent.pink} />
                                <Text className="text-xs font-manrope-semibold text-accent-pink">{c.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                          {synced.shoppingCategoryIds.map((cid) => {
                            const c = shoppingCategories.find((x) => x.id === cid);
                            if (!c) return null;
                            return (
                              <TouchableOpacity
                                key={`sc-${cid}`}
                                onPress={() => removeMentionFromText("category", c.name)}
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-pink/20"
                                activeOpacity={0.8}
                              >
                                <Tag size={12} color={theme.accent.pink} />
                                <Text className="text-xs font-manrope-semibold text-accent-pink">{c.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}
                </View>
              </ScrollView>

              {/* Autocomplete Suggestions Panel (Rendered outside ScrollView to prevent clipping, absolute positioned) */}
              {showSuggestions && getFilteredItems().length > 0 && (
                <View
                  className="absolute rounded-2xl border p-2.5 z-50 shadow-lg"
                  style={[
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      maxHeight: 220,
                      width: 280,
                      bottom: 10,
                    },
                    getSuggestionAlignment(),
                  ]}
                >
                  {/* Back button if in sub-step */}
                  {suggestionStep !== "category" && (
                    <TouchableOpacity
                      className="flex-row items-center gap-1 py-1 mb-1"
                      onPress={() => {
                        if (suggestionStep === "shopping_items") {
                          setSuggestionStep("shopping_categories");
                        } else if (suggestionStep === "bill_items") {
                          setSuggestionStep("bill_categories");
                        } else {
                          setSuggestionStep("category");
                        }
                      }}
                    >
                      <Text className="text-xs font-manrope-bold" style={{ color: theme.accent.purple }}>
                        {"← Back"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <Text
                    className="text-xs font-manrope-bold uppercase tracking-wider px-3 py-1 mb-1"
                    style={{ color: theme.textSecondary }}
                  >
                    {suggestionStep === "category"
                      ? "Mention Category"
                      : suggestionStep === "shopping_categories"
                        ? "Select Shopping Category"
                        : suggestionStep === "bill_categories"
                          ? "Select Bill Category"
                          : suggestionStep === "shopping_items"
                            ? "Select Shopping Item"
                            : suggestionStep === "bill_items"
                              ? "Select Bill"
                              : `Select ${suggestionStep}`}
                  </Text>

                  <ScrollView nestedScrollEnabled style={{ maxHeight: 120 }}>
                    {getFilteredItems().map((item: any) => (
                      <View
                        key={suggestionStep === "category" ? item.val : `${item.type || suggestionStep}-${item.id}`}
                        className="flex-row justify-between items-center border-b"
                        style={{ borderBottomColor: theme.border }}
                      >
                        <TouchableOpacity
                          className="flex-1 flex-row items-center gap-2.5 py-2.5 px-3"
                          onPress={() => {
                            if (suggestionStep === "category") {
                              selectCategory(item.val);
                            } else if (suggestionStep === "shopping_categories") {
                              selectItem(item.id, item.name, "shopping_category");
                            } else if (suggestionStep === "bill_categories") {
                              selectItem(item.id, item.name, "bill_category");
                            } else {
                              selectItem(item.id, item.name, item.type || suggestionStep);
                            }
                          }}
                        >
                          {/* Icon rendering */}
                          {suggestionStep === "category" ? (
                            item.val === "users" ? (
                              <UserIcon size={16} color={theme.accent.purple} />
                            ) : item.val === "tasks" ? (
                              <CheckCircle size={16} color={theme.accent.mint} />
                            ) : item.val === "bill_categories" ? (
                              <DollarSign size={16} color={theme.accent.yellow} />
                            ) : item.val === "shopping_categories" ? (
                              <ShoppingBag size={16} color={theme.accent.cyan} />
                            ) : (
                              <Tag size={16} color={theme.accent.pink} />
                            )
                          ) : item.type === "user" || suggestionStep === "users" ? (
                            <UserIcon size={16} color={theme.accent.purple} />
                          ) : item.type === "task" || suggestionStep === "tasks" ? (
                            <CheckCircle size={16} color={theme.accent.mint} />
                          ) : item.type === "bill" ||
                            suggestionStep === "bill_items" ||
                            item.type === "bill_category" ||
                            suggestionStep === "bill_categories" ? (
                            <DollarSign size={16} color={theme.accent.yellow} />
                          ) : item.type === "item" ||
                            suggestionStep === "shopping_items" ||
                            item.type === "shopping_category" ||
                            suggestionStep === "shopping_categories" ? (
                            <ShoppingBag size={16} color={theme.accent.cyan} />
                          ) : (
                            <Tag size={16} color={theme.accent.pink} />
                          )}

                          <View className="flex-1 ml-1">
                            <Text
                              className="text-sm font-manrope-semibold"
                              style={{ color: theme.text }}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            {(suggestionStep === "shopping_categories" || suggestionStep === "bill_categories") && (
                              <Text className="text-[10px] font-manrope text-accent-purple">Link Category</Text>
                            )}
                          </View>
                        </TouchableOpacity>

                        {/* Drilldown button if shopping category */}
                        {suggestionStep === "shopping_categories" && (
                          <TouchableOpacity
                            className="px-3.5 py-2.5 border-l"
                            style={{ borderLeftColor: theme.border }}
                            onPress={() => {
                              setSelectedSubCategoryId(item.id);
                              setSuggestionStep("shopping_items");
                              setSuggestionQuery("");
                            }}
                          >
                            <Text className="text-xs font-manrope-bold" style={{ color: theme.textSecondary }}>
                              Browse →
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Drilldown button if bill category */}
                        {suggestionStep === "bill_categories" && (
                          <TouchableOpacity
                            className="px-3.5 py-2.5 border-l"
                            style={{ borderLeftColor: theme.border }}
                            onPress={() => {
                              setSelectedSubCategoryId(item.id);
                              setSuggestionStep("bill_items");
                              setSuggestionQuery("");
                            }}
                          >
                            <Text className="text-xs font-manrope-bold" style={{ color: theme.textSecondary }}>
                              Browse →
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Standard rounded buttons footer */}
            <View className="pt-4 border-t flex-row gap-3" style={{ borderTopColor: theme.border }}>
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
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <Modal visible={true} onClose={() => setShowCategoryModal(false)} title={t.notes.createCategory}>
          <View className="gap-4">
            <Input
              label={t.notes.categoryName}
              placeholder={t.notes.categoryNamePlaceholder}
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <View>
              <Text className="text-xs font-manrope-semibold mb-2" style={{ color: theme.textSecondary }}>
                ICON
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { name: "notebook" },
                  { name: "tag" },
                  { name: "edit" },
                  { name: "home" },
                  { name: "shopping" },
                  { name: "finance" },
                  { name: "task" },
                  { name: "calendar" },
                  { name: "lock" },
                  { name: "idea" },
                  { name: "heart" },
                  { name: "food" },
                  { name: "book" },
                  { name: "work" },
                  { name: "coffee" },
                  { name: "star" },
                  { name: "tool" },
                  { name: "user" },
                  { name: "smile" },
                  { name: "document" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    className={`w-11 h-11 rounded-xl justify-center items-center border ${categoryIcon === item.name ? "border-2" : ""}`}
                    style={{
                      borderColor: categoryIcon === item.name ? theme.text : theme.border,
                      backgroundColor: theme.surface,
                    }}
                    onPress={() => setCategoryIcon(item.name)}
                  >
                    {getCategoryIcon(item.name, 18, categoryIcon === item.name ? theme.text : theme.textSecondary)}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-xs font-manrope-semibold mb-2" style={{ color: theme.textSecondary }}>
                COLOR
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    className={`w-8 h-8 rounded-full border ${categoryColor === color ? "border-2" : ""}`}
                    style={{
                      backgroundColor: color,
                      borderColor: categoryColor === color ? theme.text : theme.border,
                    }}
                    onPress={() => setCategoryColor(color)}
                  />
                ))}
              </View>
            </View>

            <View className="flex-row gap-3 mt-4">
              <Button
                title={t.common.cancel}
                variant="secondary"
                onPress={() => setShowCategoryModal(false)}
                className="flex-1"
              />
              <Button
                title={t.common.create}
                onPress={handleCreateCategory}
                loading={savingCategory}
                disabled={savingCategory}
                className="flex-1"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
