import type { FC, ReactNode } from "react";
import { View } from "react-native";
import BackButton from "./back-button";
import Text from "./text";

interface ScreenHeaderProps {
  title: string;
  /** Defaults to router.back(). */
  onBack?: () => void;
  /** Keeps the title centered: without it, an empty slot balances the back button. */
  right?: ReactNode;
  /** Smaller gap below, for screens where the content starts right under the header. */
  compact?: boolean;
  className?: string;
}

const ScreenHeader: FC<ScreenHeaderProps> = ({ title, onBack, right, compact = false, className }) => (
  <View className={`flex-row items-center gap-3 ${compact ? "mb-4" : "mb-8"} ${className || ""}`}>
    <BackButton onPress={onBack} />
    <Text variant="title" className="flex-1 text-center" numberOfLines={1}>
      {title}
    </Text>
    {right ?? <View className="w-12" />}
  </View>
);

export default ScreenHeader;
