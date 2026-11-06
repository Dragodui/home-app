import type { LucideIcon } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { View } from "react-native";
import BackButton from "./back-button";
import IconTile from "./icon-tile";
import Screen from "./screen";
import Text from "./text";
import TextLink from "./text-link";
import type { Tone } from "./tone";

interface AuthScreenProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconTone?: Tone;
  showBack?: boolean;
  footerPrompt?: string;
  footerActionTitle?: string;
  onFooterAction?: () => void;
  children: ReactNode;
}

const AuthScreen: FC<AuthScreenProps> = ({
  title,
  description,
  icon,
  iconTone = "yellow",
  showBack = true,
  footerPrompt,
  footerActionTitle,
  onFooterAction,
  children,
}) => (
  <Screen width="sm" keyboardAvoiding>
    {showBack && <BackButton className="mb-8" />}

    <View className="mb-12">
      {icon && <IconTile icon={icon} tone={iconTone} size="lg" className="mb-6" />}
      <Text variant="display" className="mb-3">
        {title}
      </Text>
      {description && (
        <Text variant="body" color="secondary">
          {description}
        </Text>
      )}
    </View>

    <View className="flex-1">{children}</View>

    {footerActionTitle && onFooterAction && (
      <View className="flex-row justify-center items-center pt-6">
        {footerPrompt && (
          <Text variant="bodySmall" color="secondary">
            {footerPrompt}{" "}
          </Text>
        )}
        <TextLink title={footerActionTitle} onPress={onFooterAction} />
      </View>
    )}
  </Screen>
);

export default AuthScreen;
