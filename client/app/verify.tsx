import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, Mail, XCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { BackButton, Button, EmptyState, Screen, Spinner, Text } from "@/components/ui";
import { userApi } from "@/lib/api";
import { useAuth } from "@/stores/authStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const {
    token,
    email: paramEmail,
    status,
  } = useLocalSearchParams<{ token?: string; email?: string; status?: string }>();
  const { verifyEmail, resendVerification } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(status === "success");
  const [error, setError] = useState(status === "error" ? t.verify.verificationFailed : "");
  const [sent, setSent] = useState(false);
  const email = paramEmail || "";
  const appState = useRef(AppState.currentState);

  // When app comes to foreground, check if email was verified in browser
  useEffect(() => {
    if (token) return; // Skip if we're doing token-based verification

    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        try {
          const user = await userApi.getMe();
          if (user.emailVerified) {
            setVerified(true);
          }
        } catch {
          // Not logged in or network error — ignore
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      setLoading(true);
      setError("");
      const result = await verifyEmail(token);
      setLoading(false);

      if (result.success) {
        setVerified(true);
      } else {
        setError(result.error || t.verify.verificationFailed);
      }
    };

    verify();
  }, [token, verifyEmail, t.verify.verificationFailed]);

  const handleResend = async () => {
    if (!email) {
      setError(t.verify.emailRequired);
      return;
    }

    setError("");
    setLoading(true);
    const result = await resendVerification(email);
    setLoading(false);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || t.verify.failedToSend);
    }
  };

  // Result of token-based verification, of a redirect, or of verifying in the browser
  if (token || status || verified) {
    return (
      <Screen width="sm">
        {loading ? (
          <Spinner fill color={theme.accent.purple} />
        ) : (
          <EmptyState
            icon={verified ? CheckCircle : XCircle}
            tone={verified ? "green" : "danger"}
            size="lg"
            title={verified ? t.verify.emailVerified : t.verify.verificationFailed}
            description={
              verified
                ? t.verify.verifiedMessage
                : error && error !== t.verify.verificationFailed
                  ? error
                  : t.verify.linkExpired
            }
            action={
              <Button
                title={verified ? t.verify.continueToLogin : t.verify.tryAgain}
                onPress={() => router.replace("/login")}
                variant={verified ? "purple" : "primary"}
              />
            }
          />
        )}
      </Screen>
    );
  }

  // Email verification pending screen
  return (
    <Screen width="sm">
      <BackButton />
      <EmptyState
        icon={Mail}
        tone="yellow"
        size="lg"
        title={t.verify.title}
        description={sent ? interpolate(t.verify.sentMessage, { email }) : interpolate(t.verify.checkInbox, { email })}
        action={
          <View className="gap-3">
            {error ? (
              <Text variant="label" color="danger" className="text-center">
                {error}
              </Text>
            ) : null}
            {!sent && (
              <Button
                title={t.verify.resendEmail}
                onPress={handleResend}
                loading={loading}
                disabled={loading}
                variant="outline"
              />
            )}
            <Button title={t.verify.backToLogin} onPress={() => router.replace("/login")} />
          </View>
        }
      />
    </Screen>
  );
}
