import { User } from "lucide-react-native";
import type { FC } from "react";
import { Image, View } from "react-native";
import { useTheme } from "@/stores/themeStore";

interface AvatarProps {
  uri?: string | null;
  size?: number;
  className?: string;
}

const Avatar: FC<AvatarProps> = ({ uri, size = 48, className }) => {
  const { theme } = useTheme();

  return (
    <View
      className={`rounded-full overflow-hidden justify-center items-center ${className || ""}`}
      style={{ width: size, height: size, backgroundColor: theme.background }}
    >
      {uri ? (
        <Image source={{ uri }} className="w-full h-full" />
      ) : (
        <User size={size / 2} color={theme.textSecondary} />
      )}
    </View>
  );
};

export default Avatar;
