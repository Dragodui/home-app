import type { FC, ReactNode } from "react";
import { View } from "react-native";
import Text from "./text";

type SectionTitleVariant = "overline" | "heading";

interface SectionProps {
  title: string;
  titleVariant?: SectionTitleVariant;
  /** Shown on the right of the title, for example a "see all" link. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const Section: FC<SectionProps> = ({ title, titleVariant = "overline", action, children, className }) => (
  <View className={`mb-8 ${className || ""}`}>
    <View className={`flex-row items-center justify-between mb-3 ${titleVariant === "overline" ? "ml-1" : ""}`}>
      <Text variant={titleVariant} className="flex-1">
        {title}
      </Text>
      {action}
    </View>
    {children}
  </View>
);

export default Section;
