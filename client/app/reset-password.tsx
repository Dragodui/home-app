import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AuthScreen, Button, EmptyState, Input, Screen } from "@/components/ui";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { t } = useI18n();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t.auth.invalidResetToken);
    }
  }, [token, t]);

  const handleSubmit = async () => {
    setError("");

    // Validation
    if (!password || !confirmPassword) {
      setError(t.auth.fillAllFields);
      return;
    }

    if (password.length < 8) {
      setError(t.auth.passwordMinLength8);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.security.passwordsMismatch);
      return;
    }

    if (!token) {
      setError(t.auth.invalidResetToken);
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(token, password);
    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || t.auth.failedToResetPassword);
    }
  };

  if (success) {
    return (
      <Screen width="sm">
        <EmptyState
          icon={CheckCircle}
          tone="green"
          size="lg"
          title={t.auth.passwordResetTitle}
          description={t.auth.passwordResetSuccessText}
          action={<Button title={t.auth.goToLogin} onPress={() => router.replace("/login")} variant="purple" />}
        />
      </Screen>
    );
  }

  return (
    <AuthScreen
      icon={Lock}
      iconTone="purple"
      title={t.auth.resetPasswordTitle}
      description={t.auth.resetPasswordDescription}
      footerPrompt={t.auth.rememberYourPassword}
      footerActionTitle={t.auth.logIn}
      onFooterAction={() => router.replace("/login")}
    >
      <Input
        label={t.security.newPassword}
        placeholder={t.security.newPasswordPlaceholder}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError("");
        }}
        secureTextEntry
        autoCapitalize="none"
        error={error && !confirmPassword ? error : undefined}
      />

      <Input
        label={t.security.confirmPassword}
        placeholder={t.security.confirmPasswordPlaceholder}
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setError("");
        }}
        secureTextEntry
        autoCapitalize="none"
        error={error && confirmPassword ? error : undefined}
      />

      <Button
        title={t.auth.resetPasswordTitle}
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading || !password || !confirmPassword || !token}
        variant="purple"
        className="mt-4"
      />
    </AuthScreen>
  );
}
