import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";
import { getToneColors, type Tone } from "./tone";

interface FabProps {
  icon: LucideIcon;
  onPress: () => void;
  tone?: Tone;
  /** Distance above the safe area. Raise it on screens with a tab bar. */
  bottomOffset?: number;
  accessibilityLabel?: string;
}

/** Floating action button. Pass it to the `overlay` prop of Screen so it stays fixed while content scrolls. */
const Fab: FC<FabProps> = ({ icon: Icon, onPress, tone = "yellow", bottomOffset = 24, accessibilityLabel }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="absolute right-6 w-14 h-14 rounded-[18px] justify-center items-center shadow-lg z-40"
      style={{ bottom: insets.bottom + bottomOffset, backgroundColor: colors.solid }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={28} color={colors.onSolid} strokeWidth={2.5} />
    </TouchableOpacity>
  );
};

export default Fab;
