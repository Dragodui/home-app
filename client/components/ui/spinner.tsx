import type { FC } from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "@/stores/themeStore";

interface SpinnerProps {
  size?: "small" | "large";
  /** Defaults to the theme text color. */
  color?: string;
  className?: string;
}

const Spinner: FC<SpinnerProps> = ({ size = "large", color, className }) => {
  const { theme } = useTheme();

  return <ActivityIndicator size={size} color={color ?? theme.text} className={className} />;
};

export default Spinner;
