import { Button as GlassButton } from "glisse";
import type { LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";
import { getToneColors, type Tone } from "./tone";

interface FabProps {
  icon: LucideIcon;
  onPress: () => void;
  tone?: Tone;
  aboveTabBar?: boolean;
  accessibilityLabel?: string;
}

/** Web version of Fab, on Liquid Glass. Same props as fab.tsx. */
const Fab: FC<FabProps> = ({ icon: Icon, onPress, tone = "yellow", aboveTabBar = false, accessibilityLabel }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = getToneColors(theme, tone);

  return (
    <GlassButton
      variant="filled"
      tint={colors.solid}
      aria-label={accessibilityLabel}
      onClick={onPress}
      icon={<Icon size={26} color={colors.onSolid} strokeWidth={2.5} />}
      style={{
        position: "absolute",
        right: 20,
        bottom: aboveTabBar ? 108 : insets.bottom + 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        zIndex: 40,
      }}
    />
  );
};

export default Fab;
