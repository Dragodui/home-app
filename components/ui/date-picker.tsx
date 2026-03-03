import { FC, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/stores/themeStore";
import Modal from "./modal";
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

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

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
  const [viewDate, setViewDate] = useState(() => value ?? new Date());
  const [selectedDate, setSelectedDate] = useState(() => value ?? new Date());
  const [selectedHour, setSelectedHour] = useState(() =>
    (value ?? new Date()).getHours()
  );
  const [selectedMinute, setSelectedMinute] = useState(() =>
    (value ?? new Date()).getMinutes()
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = viewDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // Monday-based: 0=Mon, 6=Sun
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; current: boolean; date: Date }[] = [];

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({ day: d, current: false, date: new Date(year, month - 1, d) });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, current: true, date: new Date(year, month, i) });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }

    return days;
  }, [year, month]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isToday = (d: Date) => isSameDay(d, new Date());

  const isDisabled = (d: Date) => {
    if (!minimumDate) return false;
    const min = new Date(
      minimumDate.getFullYear(),
      minimumDate.getMonth(),
      minimumDate.getDate()
    );
    return d < min;
  };

  const prevMonth = () =>
    setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setViewDate(new Date(year, month + 1, 1));

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

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <Modal visible={visible} onClose={onClose} title={title} height="auto">
      <View>
        {/* Month navigation */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.background }}
            onPress={prevMonth}
          >
            <ChevronLeft size={20} color={theme.text} />
          </TouchableOpacity>
          <Text
            className="text-base font-manrope-bold"
            style={{ color: theme.text }}
          >
            {monthName}
          </Text>
          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.background }}
            onPress={nextMonth}
          >
            <ChevronRight size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View className="flex-row mb-2">
          {DAYS.map((d) => (
            <View key={d} className="flex-1 items-center">
              <Text
                className="text-xs font-manrope-semibold"
                style={{ color: theme.textSecondary }}
              >
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
                style={{ width: "14.28%", height: 44 }}
                onPress={() => handleDayPress(d)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={[
                    selected && { backgroundColor: theme.accent.pink },
                    today && !selected && {
                      borderWidth: 1.5,
                      borderColor: theme.accent.pink,
                    },
                  ]}
                >
                  <Text
                    className="text-sm font-manrope-semibold"
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
          <View className="mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            <View className="flex-row items-center justify-center gap-3">
              {/* Hour scroller */}
              <View
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: theme.background, height: 120, width: 70 }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingVertical: 40 }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / 40);
                    setSelectedHour(Math.max(0, Math.min(23, idx)));
                  }}
                  contentOffset={{ x: 0, y: selectedHour * 40 }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      className="h-10 items-center justify-center"
                      onPress={() => setSelectedHour(i)}
                    >
                      <Text
                        className="text-lg font-manrope-bold"
                        style={{
                          color:
                            selectedHour === i
                              ? theme.text
                              : theme.textSecondary,
                        }}
                      >
                        {pad(i)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text
                className="text-2xl font-manrope-bold"
                style={{ color: theme.text }}
              >
                :
              </Text>

              {/* Minute scroller */}
              <View
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: theme.background, height: 120, width: 70 }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingVertical: 40 }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / 40);
                    setSelectedMinute(Math.max(0, Math.min(59, idx)));
                  }}
                  contentOffset={{ x: 0, y: selectedMinute * 40 }}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      className="h-10 items-center justify-center"
                      onPress={() => setSelectedMinute(i)}
                    >
                      <Text
                        className="text-lg font-manrope-bold"
                        style={{
                          color:
                            selectedMinute === i
                              ? theme.text
                              : theme.textSecondary,
                        }}
                      >
                        {pad(i)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

        {/* Confirm button */}
        <Button
          title={confirmLabel}
          onPress={handleConfirm}
          variant="pink"
          style={{ marginTop: 20 }}
        />
      </View>
    </Modal>
  );
};

export default DatePicker;
