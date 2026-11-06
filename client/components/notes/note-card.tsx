import { User } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { View } from "react-native";
import { Badge, Card, getToneColors, Text } from "@/components/ui";
import type { Note } from "@/lib/types";
import { useTheme } from "@/stores/themeStore";
import { MENTION_STYLES, type MentionKind } from "./note-mentions";
import { getNoteCategoryIcon } from "./note-options";

const MENTION_REGEX = /@(user|task|bill|item|category):(?:"([^"]+)"|(\S+))|@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g;

// Web-only values that keep the icon on the text line of a mention.
const INLINE_ICON_STYLE = { marginRight: 2, display: "inline-flex", verticalAlign: "middle" } as unknown as ViewStyle;

function resolveMentionKind(note: Note, prefixType: string | undefined, name: string): MentionKind | null {
  if (prefixType) return prefixType as MentionKind;
  if (note.mentionedUsers?.some((u) => u.username === name || u.name === name)) return "user";
  if (note.mentionedTasks?.some((task) => task.name === name)) return "task";
  if (note.mentionedBills?.some((bill) => bill.description === name)) return "bill";
  if (note.mentionedShoppingItems?.some((item) => item.name === name)) return "item";
  if (
    note.mentionedNoteCategories?.some((c) => c.name === name) ||
    note.mentionedBillCategories?.some((c) => c.name === name) ||
    note.mentionedShoppingCategories?.some((c) => c.name === name)
  ) {
    return "category";
  }
  return null;
}

interface NoteContentProps {
  note: Note;
  numberOfLines?: number;
  onMentionPress: (type: string, name: string) => void;
}

const NoteContent: FC<NoteContentProps> = ({ note, numberOfLines, onMentionPress }) => {
  const { theme } = useTheme();
  const text = note.content;
  const regex = new RegExp(MENTION_REGEX.source, "g");
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  while (true) {
    const match = regex.exec(text);
    if (match === null) break;

    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const prefixType = match[1];
    const name = match[2] || match[4] || match[3] || match[5];
    const kind = resolveMentionKind(note, prefixType, name);

    if (kind) {
      const { icon: Icon, tone } = MENTION_STYLES[kind];
      const colors = getToneColors(theme, tone);
      parts.push(
        <Text
          key={key++}
          variant="label"
          onPress={() =>
            onMentionPress(
              prefixType ||
                (note.mentionedUsers?.some((u) => u.username === name || u.name === name)
                  ? "user"
                  : note.mentionedTasks?.some((task) => task.name === name)
                    ? "task"
                    : "note_category"),
              name,
            )
          }
          className="px-2.5 py-0.5 rounded-full overflow-hidden mx-0.5"
          style={{ backgroundColor: colors.soft, color: colors.onSoft }}
        >
          <Icon size={12} color={colors.onSoft} style={INLINE_ICON_STYLE} /> {name}
        </Text>,
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <Text variant="body" numberOfLines={numberOfLines}>
      {parts}
    </Text>
  );
};

interface NoteCardProps {
  note: Note;
  expanded: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMentionPress: (type: string, name: string) => void;
}

const NoteCard: FC<NoteCardProps> = ({ note, expanded, onPress, onLongPress, onMentionPress }) => {
  const { theme } = useTheme();

  return (
    <Card size="md" onPress={onPress} onLongPress={onLongPress}>
      <View className="flex-row justify-between items-start gap-4 mb-3">
        <Text variant="heading" className="flex-1" numberOfLines={1}>
          {note.title}
        </Text>
        {note.noteCategory && (
          <Badge
            label={note.noteCategory.name}
            icon={getNoteCategoryIcon(note.noteCategory.icon)}
            color={note.noteCategory.color}
          />
        )}
      </View>

      <View className="mb-4">
        <NoteContent note={note} numberOfLines={expanded ? undefined : 3} onMentionPress={onMentionPress} />
      </View>

      <View className="flex-row justify-between items-center pt-3 border-t" style={{ borderColor: theme.border }}>
        <View className="flex-row items-center gap-1.5 shrink">
          <User size={12} color={theme.textSecondary} />
          <Text variant="caption" color="secondary" className="font-manrope-semibold" numberOfLines={1}>
            {note.creator?.name}
          </Text>
        </View>
        <Text variant="caption" color="secondary">
          {new Date(note.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Card>
  );
};

export default NoteCard;
