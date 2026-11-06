import type { FC } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/stores/themeStore";

interface SpinnerProps {
  size?: "small" | "large";
  /** Defaults to the theme text color. */
  color?: string;
  /** Centers the spinner in all the available space. */
  fill?: boolean;
  className?: string;
}

const Spinner: FC<SpinnerProps> = ({ size = "large", color, fill = false, className }) => {
  const { theme } = useTheme();
  const indicator = <ActivityIndicator size={size} color={color ?? theme.text} className={className} />;

  return fill ? <View className="flex-1 justify-center items-center">{indicator}</View> : indicator;
};

export default Spinner;
