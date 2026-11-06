import type { FC } from "react";
import { View } from "react-native";
import Text from "./text";

interface InfoRowProps {
  label: string;
  value: string;
  className?: string;
}

const InfoRow: FC<InfoRowProps> = ({ label, value, className }) => (
  <View className={`flex-row justify-between items-center py-3 ${className || ""}`}>
    <Text variant="label">{label}</Text>
    <Text variant="bodySmall" color="secondary" className="flex-1 text-right ml-3">
      {value}
    </Text>
  </View>
);

export default InfoRow;
