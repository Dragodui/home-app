import type { LucideIcon } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { View } from "react-native";
import BackButton from "./back-button";
import IconTile from "./icon-tile";
import Screen from "./screen";
import Text from "./text";
import TextLink from "./text-link";
import type { Tone } from "./tone";

type AuthHero = "brand" | "page";

interface AuthScreenProps {
  title: string;
  description?: string;
  /** Oversized header for entry screens: no back button, form centered in the free space. */
  hero?: AuthHero;
  icon?: LucideIcon;
  iconTone?: Tone;
  footerPrompt?: string;
  footerActionTitle?: string;
  onFooterAction?: () => void;
  children: ReactNode;
}

const HERO_TITLE_STYLES = {
  brand: { fontFamily: "Manrope_800ExtraBold", fontSize: 64, lineHeight: 72, letterSpacing: -3.2 },
  page: { fontFamily: "Manrope_800ExtraBold", fontSize: 48, lineHeight: 56 },
};

const AuthScreen: FC<AuthScreenProps> = ({
  title,
  description,
  hero,
  icon,
  iconTone = "yellow",
  footerPrompt,
  footerActionTitle,
  onFooterAction,
  children,
}) => (
  <Screen width="sm" keyboardAvoiding>
    {hero ? <View className="h-11" /> : <BackButton className="mb-8" />}

    <View className="mb-12">
      {icon && <IconTile icon={icon} tone={iconTone} size="lg" className="mb-6" />}
      <Text variant="display" className={hero ? "mb-2" : "mb-3"} style={hero && HERO_TITLE_STYLES[hero]}>
        {title}
      </Text>
      {description && (
        <Text variant="body" color="secondary" style={hero && { fontSize: 22, lineHeight: 28 }}>
          {description}
        </Text>
      )}
    </View>

    <View className={hero ? "flex-1 justify-center gap-2" : "flex-1"}>{children}</View>

    {footerActionTitle && onFooterAction && (
      <View className="flex-row flex-wrap justify-center items-center pt-6">
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
