import type { LucideIcon } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Text from "./text";

interface InfoRowProps {
  label: string;
  icon?: LucideIcon;
  /** Text, or any node such as a Badge. */
  value: ReactNode;
  className?: string;
}

const InfoRow: FC<InfoRowProps> = ({ label, icon: Icon, value, className }) => {
  const { theme } = useTheme();

  return (
    <View className={`flex-row justify-between items-center gap-3 py-3 ${className || ""}`}>
      <View className="flex-row items-center gap-2 shrink">
        {Icon && <Icon size={16} color={theme.textSecondary} />}
        <Text variant="label" className="shrink">
          {label}
        </Text>
      </View>
      {typeof value === "string" || typeof value === "number" ? (
        <Text variant="bodySmall" color="secondary" className="flex-1 text-right">
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
};

export default InfoRow;
