import type { FC } from "react";
import { TouchableOpacity } from "react-native";
import Text from "./text";

interface TextLinkProps {
  title: string;
  onPress: () => void;
  className?: string;
}

const TextLink: FC<TextLinkProps> = ({ title, onPress, className }) => (
  <TouchableOpacity accessibilityRole="link" onPress={onPress} className={className}>
    <Text variant="label" className="font-manrope-bold underline">
      {title}
    </Text>
  </TouchableOpacity>
);

export default TextLink;
