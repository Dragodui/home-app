import { Ionicons } from "@expo/vector-icons";
import type { FC } from "react";
import { Button, Divider } from "@/components/ui";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

interface GoogleSignInButtonProps {
  onPress: () => void;
  isSigningIn: boolean;
  disabled: boolean;
}

/** "or" divider followed by the Google button, shown under the email form. */
const GoogleSignInButton: FC<GoogleSignInButtonProps> = ({ onPress, isSigningIn, disabled }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <>
      <Divider label={t.common.or} className="my-5" />
      <Button
        title={isSigningIn ? t.auth.signingIn : t.auth.continueWithGoogle}
        icon={<Ionicons name="logo-google" size={20} color={theme.text} />}
        onPress={onPress}
        disabled={disabled}
        variant="bordered"
      />
    </>
  );
};

export default GoogleSignInButton;
