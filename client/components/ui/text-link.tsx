import type { FC } from "react";
import { TouchableOpacity } from "react-native";
import Text from "./text";

interface TextLinkProps {
  title: string;
  onPress: () => void;
  /** Secondary color without underline, for links that are not the main action. */
  subtle?: boolean;
  className?: string;
}

const TextLink: FC<TextLinkProps> = ({ title, onPress, subtle = false, className }) => (
  <TouchableOpacity accessibilityRole="link" onPress={onPress} className={className}>
    <Text
      variant="label"
      color={subtle ? "secondary" : "primary"}
      className={subtle ? undefined : "font-manrope-bold underline"}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

export default TextLink;
