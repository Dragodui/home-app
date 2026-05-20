import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  type FlatList as FlatListType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Modal as RNModal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";
import Button from "./button";

interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  value?: Date;
  mode?: "date" | "datetime";
  minimumDate?: Date;
  title?: string;
  confirmLabel?: string;
}

const WEEKDAYS_BY_LANGUAGE = {
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  pl: ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"],
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  fr: ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],
  it: ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"],
  uk: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
  be: ["Пн", "Аў", "Ср", "Чц", "Пт", "Сб", "Нд"],
} as const;
const MONTHS_BY_LANGUAGE = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  pl: [
    "styczeń",
    "luty",
    "marzec",
    "kwiecień",
    "maj",
    "czerwiec",
    "lipiec",
    "sierpień",
    "wrzesień",
    "październik",
    "listopad",
    "grudzień",
  ],
  de: [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  fr: [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ],
  it: [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ],
  uk: [
    "січень",
    "лютий",
    "березень",
    "квітень",
    "травень",
    "червень",
    "липень",
    "серпень",
    "вересень",
    "жовтень",
    "листопад",
    "грудень",
  ],
  be: [
    "студзень",
    "люты",
    "сакавік",
    "красавік",
    "май",
    "чэрвень",
    "ліпень",
    "жнівень",
    "верасень",
    "кастрычнік",
    "лістапад",
    "снежань",
  ],
} as const;

// --- Компонент бесконечного барабана ---
interface WheelPickerProps {
  items: number[];
  value: number;
  onChange: (val: number) => void;
  theme: any;
  visible: boolean;
}

const ITEM_HEIGHT = 40;
const MULTIPLIER = 100; // Эмуляция бесконечного скролла

const InfiniteWheelPicker: FC<WheelPickerProps> = ({ items, value, onChange, theme, visible }) => {
  const listRef = useRef<FlatListType<number>>(null);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < MULTIPLIER; i++) {
      arr.push(...items);
    }
    return arr;
  }, [items]);

  const getCenteredIndex = (targetValue: number) => {
    const itemIndex = Math.max(0, items.indexOf(targetValue));
    return Math.floor(MULTIPLIER / 2) * items.length + itemIndex;
  };

  const middleIndex = getCenteredIndex(value);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: middleIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 0);

    return () => {
      clearTimeout(timeout);
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = null;
      }
    };
  }, [middleIndex, visible]);

  const commitOffset = (offsetY: number) => {
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const normalizedIndex = ((index % items.length) + items.length) % items.length;
    const val = items[normalizedIndex];
    if (val !== undefined) {
      onChange(val);
      const centeredIndex = getCenteredIndex(val);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: centeredIndex * ITEM_HEIGHT,
          animated: false,
        });
      });
    }
  };

  const scheduleCommit = (offsetY: number, delay: number) => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }
    commitTimeoutRef.current = setTimeout(() => {
      commitOffset(offsetY);
      commitTimeoutRef.current = null;
    }, delay);
  };

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <View
      style={{
        height: ITEM_HEIGHT * 3,
        width: 64,
        backgroundColor: theme.background,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Фон для выделения активной цифры */}
      <View
        style={{
          position: "absolute",
          top: ITEM_HEIGHT,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          backgroundColor: theme.text,
          opacity: 0.05,
          borderRadius: 8,
        }}
        pointerEvents="none"
      />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        initialScrollIndex={middleIndex}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onMomentumScrollBegin={() => {
          if (commitTimeoutRef.current) {
            clearTimeout(commitTimeoutRef.current);
            commitTimeoutRef.current = null;
          }
        }}
        onMomentumScrollEnd={(e) => scheduleCommit(e.nativeEvent.contentOffset.y, 0)}
        onScrollEndDrag={(e) => scheduleCommit(e.nativeEvent.contentOffset.y, 90)}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        renderItem={({ item }) => (
          <View style={{ height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" }}>
            <Text
              className="text-lg font-manrope-bold"
              style={{ color: item === value ? theme.text : theme.textSecondary }}
            >
              {pad(item)}
            </Text>
          </View>
        )}
      />
    </View>
  );
};
// ----------------------------------------

const DatePicker: FC<DatePickerProps> = ({
  visible,
  onClose,
  onConfirm,
  value,
  mode = "datetime",
  minimumDate,
  title = "Select Date",
  confirmLabel = "Done",
}) => {
  const { theme } = useTheme();
  const { language } = useI18n();
  const [viewDate, setViewDate] = useState(() => value ?? new Date());
  const [selectedDate, setSelectedDate] = useState(() => value ?? new Date());
  const [selectedHour, setSelectedHour] = useState(() => (value ?? new Date()).getHours());
  const [selectedMinute, setSelectedMinute] = useState(() => (value ?? new Date()).getMinutes());

  useEffect(() => {
    if (!visible) return;
    const nextValue = value ?? new Date();
    setViewDate(nextValue);
    setSelectedDate(nextValue);
    setSelectedHour(nextValue.getHours());
    setSelectedMinute(nextValue.getMinutes());
  }, [value, visible]);

  const HOURS = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const MINUTES = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = `${MONTHS_BY_LANGUAGE[language]?.[month] || MONTHS_BY_LANGUAGE.en[month]} ${year}`;
  const weekdays = WEEKDAYS_BY_LANGUAGE[language] || WEEKDAYS_BY_LANGUAGE.en;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; current: boolean; date: Date }[] = [];

    for (let i = startDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({ day: d, current: false, date: new Date(year, month - 1, d) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, current: true, date: new Date(year, month, i) });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }

    return days;
  }, [year, month]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isToday = (d: Date) => isSameDay(d, new Date());

  const isDisabled = (d: Date) => {
    if (!minimumDate) return false;
    const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate());
    return d < min;
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleDayPress = (d: { day: number; current: boolean; date: Date }) => {
    if (isDisabled(d.date)) return;
    setSelectedDate(d.date);
    if (!d.current) {
      setViewDate(new Date(d.date.getFullYear(), d.date.getMonth(), 1));
    }
  };

  const handleConfirm = () => {
    const result = new Date(selectedDate);
    if (mode === "datetime") {
      result.setHours(selectedHour, selectedMinute, 0, 0);
    }
    onConfirm(result);
    onClose();
  };

  return (
    <RNModal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center px-5">
        {/* АБСОЛЮТНЫЙ ФОН ДЛЯ ЗАКРЫТИЯ ПО КЛИКУ */}
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)" },
          ]}
          onPress={onClose}
        />

        {/* КАРТОЧКА БЕЗ TOUCHABLE ОБЕРТКИ */}
        <View className="w-full rounded-3xl p-6" style={{ backgroundColor: theme.surface, maxWidth: 360 }}>
          {/* Title */}
          <Text className="text-lg font-manrope-bold text-center mb-4" style={{ color: theme.text }}>
            {title}
          </Text>

          {/* Month navigation */}
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.background }}
              onPress={prevMonth}
            >
              <ChevronLeft size={18} color={theme.text} />
            </TouchableOpacity>
            <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>
              {monthName}
            </Text>
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.background }}
              onPress={nextMonth}
            >
              <ChevronRight size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View className="flex-row mb-1">
            {weekdays.map((d) => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-xs font-manrope-semibold" style={{ color: theme.textSecondary }}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View className="flex-row flex-wrap">
            {calendarDays.map((d, i) => {
              const selected = isSameDay(d.date, selectedDate);
              const today = isToday(d.date);
              const disabled = isDisabled(d.date);

              return (
                <TouchableOpacity
                  key={i}
                  className="items-center justify-center"
                  style={{ width: "14.28%", height: 40 }}
                  onPress={() => handleDayPress(d)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={[
                      selected && { backgroundColor: theme.accent.pink },
                      today && !selected && { borderWidth: 1.5, borderColor: theme.accent.pink },
                    ]}
                  >
                    <Text
                      className="text-xs font-manrope-semibold"
                      style={{
                        color: disabled
                          ? theme.border
                          : selected
                            ? "#FFFFFF"
                            : d.current
                              ? theme.text
                              : theme.textSecondary,
                      }}
                    >
                      {d.day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time picker */}
          {mode === "datetime" && (
            <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
              <View className="flex-row items-center justify-center gap-4">
                <InfiniteWheelPicker
                  items={HOURS}
                  value={selectedHour}
                  onChange={setSelectedHour}
                  theme={theme}
                  visible={visible}
                />

                <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>
                  :
                </Text>

                <InfiniteWheelPicker
                  items={MINUTES}
                  value={selectedMinute}
                  onChange={setSelectedMinute}
                  theme={theme}
                  visible={visible}
                />
              </View>
            </View>
          )}

          {/* Confirm button */}
          <Button title={confirmLabel} onPress={handleConfirm} variant="pink" style={{ marginTop: 24 }} />
        </View>
      </View>
    </RNModal>
  );
};

export default DatePicker;
