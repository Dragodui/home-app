import type { FC } from "react";
import { View } from "react-native";
import { useControlSurface } from "./surface";
import Text from "./text";

interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
  className?: string;
}

const StatCard: FC<StatCardProps> = ({ label, value, valueColor, className }) => {
  const backgroundColor = useControlSurface();

  return (
    <View className={`flex-1 rounded-20 p-4 ${className || ""}`} style={{ backgroundColor }}>
      <Text variant="caption" color="secondary" className="font-manrope-bold uppercase" numberOfLines={2}>
        {label}
      </Text>
      <Text variant="title" className="mt-1" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </Text>
    </View>
  );
};

export default StatCard;
