import type { LucideIcon } from "lucide-react-native";
import { Plus } from "lucide-react-native";
import { type FC, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Fab from "./fab";
import Text from "./text";
import type { Tone } from "./tone";

export interface FabMenuItem {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}

interface FabMenuProps {
  items: FabMenuItem[];
  tone?: Tone;
  accessibilityLabel?: string;
}

/** Fab above the tab bar that opens a short list of create actions. */
const FabMenu: FC<FabMenuProps> = ({ items, tone = "purple", accessibilityLabel }) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <View className="absolute bottom-[188px] right-6 z-40 gap-2.5 items-end">
          {items.map(({ icon: Icon, label, onPress }) => (
            <TouchableOpacity
              key={label}
              accessibilityRole="button"
              className="flex-row items-center gap-3 px-4 h-12 rounded-2xl shadow-lg"
              style={{ backgroundColor: theme.surface }}
              onPress={() => {
                setOpen(false);
                onPress();
              }}
              activeOpacity={0.85}
            >
              <Icon size={18} color={theme.text} />
              <Text variant="label" className="font-manrope-bold">
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Fab
        icon={Plus}
        tone={tone}
        aboveTabBar
        onPress={() => setOpen((value) => !value)}
        accessibilityLabel={accessibilityLabel}
      />
    </>
  );
};

export default FabMenu;
