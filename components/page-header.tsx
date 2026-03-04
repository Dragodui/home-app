import type { FC, ReactNode } from "react";
import { Image, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";

interface PageHeaderProps {
  title: string;
  description?: string;
  style?: ViewStyle;
  rightAction?: ReactNode;
  avatar?: string;
  onAvatarPress?: () => void;
  dark?: boolean;
  className?: string;
}

const PageHeader: FC<PageHeaderProps> = ({
  title,
  description,
  style,
  rightAction,
  avatar,
  onAvatarPress,
  dark = false,
  className,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const isDarkMode = dark || theme.isDark;

  return (
    <View
      className={`flex-row justify-between items-end px-6 pb-4 ${
        isDarkMode ? "bg-background-dark" : "bg-white"
      } ${className || ""}`}
      style={[{ paddingTop: insets.top + 12 }, style]}
    >
      <View className="flex-1">
        {description && <Text className="text-base font-manrope text-muted mb-1">{description}</Text>}
        <Text className={`text-3xl font-manrope-bold ${isDarkMode ? "text-white" : "text-primary"}`}>{title}</Text>
      </View>
      <View className="flex-row items-center gap-3">
        {rightAction}
        {avatar && (
          <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
            <View className="w-14 h-14 rounded-28 overflow-hidden bg-gray-200">
              <Image source={{ uri: avatar }} className="w-full h-full" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default PageHeader;
