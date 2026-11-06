import { useRouter } from "expo-router";
import { CheckCircle, Mail } from "lucide-react-native";
import { useState } from "react";
import { AuthScreen, BackButton, Button, EmptyState, Input, Screen, Text } from "@/components/ui";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError(t.auth.emailRequired);
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await forgotPassword(email);
    setIsLoading(false);

    if (result.success) {
      setEmailSent(true);
    } else {
      setError(result.error || t.auth.failedToSendResetEmail);
    }
  };

  if (emailSent) {
    return (
      <Screen width="sm">
        <BackButton />
        <EmptyState
          icon={CheckCircle}
          tone="purple"
          size="lg"
          title={t.auth.checkYourEmail}
          description={
            <>
              {t.auth.resetLinkSentTo}
              {"\n"}
              <Text variant="subtitle">{email}</Text>
            </>
          }
          action={<Button title={t.auth.backToLogin} onPress={() => router.replace("/login")} variant="purple" />}
        />
      </Screen>
    );
  }

  return (
    <AuthScreen
      icon={Mail}
      title={t.auth.forgotPassword}
      description={t.auth.forgotPasswordDescription}
      footerPrompt={t.auth.rememberYourPassword}
      footerActionTitle={t.auth.logIn}
      onFooterAction={() => router.replace("/login")}
    >
      <Input
        label={t.auth.emailAddressLabel}
        placeholder={t.auth.emailPlaceholder}
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={error || undefined}
      />

      <Button
        title={t.auth.sendResetLink}
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading || !email}
        variant="purple"
        className="mt-4"
      />
    </AuthScreen>
  );
}
