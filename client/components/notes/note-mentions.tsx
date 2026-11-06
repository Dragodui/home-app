import { CheckCircle, DollarSign, type LucideIcon, ShoppingBag, Tag, User } from "lucide-react-native";
import type { FC } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Card, getToneColors, Text, type Tone } from "@/components/ui";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export type MentionKind = "user" | "task" | "bill" | "item" | "category";

export const MENTION_STYLES: Record<MentionKind, { icon: LucideIcon; tone: Tone }> = {
  user: { icon: User, tone: "purple" },
  task: { icon: CheckCircle, tone: "mint" },
  bill: { icon: DollarSign, tone: "yellow" },
  item: { icon: ShoppingBag, tone: "cyan" },
  category: { icon: Tag, tone: "pink" },
};

export interface MentionChip {
  key: string;
  kind: MentionKind;
  label: string;
}

interface NoteMentionChipsProps {
  chips: MentionChip[];
  onRemove: (chip: MentionChip) => void;
}

/** Mentions found in the note text. Tapping one removes it from the text. */
export const NoteMentionChips: FC<NoteMentionChipsProps> = ({ chips, onRemove }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  if (chips.length === 0) return null;

  return (
    <View className="mb-4">
      <Text variant="overline" className="mb-2 ml-1">
        {t.notes.mentionedBlocks}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {chips.map((chip) => {
          const { icon: Icon, tone } = MENTION_STYLES[chip.kind];
          const colors = getToneColors(theme, tone);
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => onRemove(chip)}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: colors.soft }}
              activeOpacity={0.8}
            >
              <Icon size={12} color={colors.onSoft} />
              <Text variant="caption" className="font-manrope-semibold" style={{ color: colors.onSoft }}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export interface MentionSuggestion {
  key: string;
  kind: MentionKind;
  name: string;
  /** Small hint under the name. */
  hint?: string;
  /** Shows a "browse" action next to the name. */
  onBrowse?: () => void;
  onPress: () => void;
}

interface NoteMentionSuggestionsProps {
  title: string;
  suggestions: MentionSuggestion[];
  /** Shows a back link for steps below the first one. */
  onBack?: () => void;
}

/** Autocomplete list shown right under the note text, so the keyboard does not cover it. */
export const NoteMentionSuggestions: FC<NoteMentionSuggestionsProps> = ({ title, suggestions, onBack }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Card size="sm" className="mb-4">
      {onBack && (
        <TouchableOpacity className="py-1 mb-1" onPress={onBack}>
          <Text variant="caption" className="font-manrope-bold">
            {"← Back"}
          </Text>
        </TouchableOpacity>
      )}
      <Text variant="overline" className="mb-1">
        {title}
      </Text>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
        {suggestions.map((suggestion) => {
          const { icon: Icon, tone } = MENTION_STYLES[suggestion.kind];
          const colors = getToneColors(theme, tone);

          return (
            <View
              key={suggestion.key}
              className="flex-row justify-between items-center border-b"
              style={{ borderBottomColor: theme.border }}
            >
              <TouchableOpacity className="flex-1 flex-row items-center gap-2.5 py-3" onPress={suggestion.onPress}>
                <Icon size={16} color={theme.isDark ? colors.solid : colors.onSoft} />
                <View className="flex-1">
                  <Text variant="label" numberOfLines={1}>
                    {suggestion.name}
                  </Text>
                  {suggestion.hint && (
                    <Text variant="micro" color="secondary">
                      {suggestion.hint}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              {suggestion.onBrowse && (
                <TouchableOpacity
                  className="pl-3.5 py-3 border-l"
                  style={{ borderLeftColor: theme.border }}
                  onPress={suggestion.onBrowse}
                >
                  <Text variant="caption" color="secondary" className="font-manrope-bold">
                    {t.notes.browse}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Card>
  );
};
