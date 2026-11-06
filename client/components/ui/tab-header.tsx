import type { FC, ReactNode } from "react";
import { View } from "react-native";
import Text from "./text";

interface TabHeaderProps {
  title: string;
  /** Small line above the title, for example a greeting. */
  eyebrow?: string;
  /** Extra content under the title. */
  children?: ReactNode;
}

/** Large left-aligned title of a tab. Leaves room on the right for the floating profile menu. */
const TabHeader: FC<TabHeaderProps> = ({ title, eyebrow, children }) => (
  <View className="mb-6 pr-32">
    {eyebrow && (
      <Text variant="heading" color="secondary" className="font-manrope italic">
        {eyebrow}
      </Text>
    )}
    <Text variant="largeTitle" numberOfLines={1}>
      {title}
    </Text>
    {children}
  </View>
);

export default TabHeader;
