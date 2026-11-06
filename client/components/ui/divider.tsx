import type { FC } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";

interface DividerProps {
  label?: string;
  className?: string;
}

const Divider: FC<DividerProps> = ({ label, className }) => {
  const { theme } = useTheme();

  return (
    <View className={`flex-row items-center ${className || ""}`}>
      <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
      {label && (
        <>
          <Text variant="bodySmall" color="secondary" className="mx-4">
            {label}
          </Text>
          <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
        </>
      )}
    </View>
  );
};

export default Divider;
