import { User } from "lucide-react-native";
import type { FC } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";

interface AvatarProps {
  uri?: string | null;
  /** Without an image, shows the first two letters instead of the generic icon. */
  name?: string;
  size?: number;
  className?: string;
  style?: ViewStyle;
}

const Avatar: FC<AvatarProps> = ({ uri, name, size = 48, className, style }) => {
  const { theme } = useTheme();

  return (
    <View
      className={`rounded-full overflow-hidden justify-center items-center ${className || ""}`}
      style={[{ width: size, height: size, backgroundColor: theme.background }, style]}
    >
      {uri ? (
        <Image source={{ uri }} className="w-full h-full" />
      ) : name ? (
        <Text variant={size < 40 ? "micro" : "caption"} className="font-manrope-bold">
          {name.slice(0, 2).toUpperCase()}
        </Text>
      ) : (
        <User size={size / 2} color={theme.textSecondary} />
      )}
    </View>
  );
};

export default Avatar;
