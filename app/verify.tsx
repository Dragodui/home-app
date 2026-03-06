import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, Mail, XCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/ui/button";
import { userApi } from "@/lib/api";
import { useAuth } from "@/stores/authStore";
import { interpolate, useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, email: paramEmail } = useLocalSearchParams<{ token?: string; email?: string }>();
  const { verifyEmail, resendVerification } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
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

  // Token-based verification result
  if (token) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 px-8" style={{ backgroundColor: theme.background, paddingTop: insets.top + 40 }}>
          <View className="flex-1 justify-center items-center pb-20">
            {loading ? (
              <ActivityIndicator size="large" color={theme.accent.purple} />
            ) : (
              <>
                <View
                  className="w-24 h-24 rounded-full justify-center items-center mb-6"
                  style={{ backgroundColor: verified ? theme.status.success : theme.status.error }}
                >
                  {verified ? (
                    <CheckCircle size={48} color="#FFFFFF" />
                  ) : (
                    <XCircle size={48} color="#FFFFFF" />
                  )}
                </View>
                <Text className="text-[28px] font-manrope-bold mb-3 text-center" style={{ color: theme.text }}>
                  {verified ? t.verify.emailVerified : t.verify.verificationFailed}
                </Text>
                <Text className="text-base font-manrope text-center leading-6 mb-8 px-4" style={{ color: theme.textSecondary }}>
                  {verified ? t.verify.verifiedMessage : error || t.verify.linkExpired}
                </Text>
              </>
            )}

            <Button
              title={verified ? t.verify.continueToLogin : t.verify.tryAgain}
              onPress={() => router.replace("/login")}
              variant={verified ? "purple" : "primary"}
              className="w-full mt-3"
            />
          </View>
        </View>
      </>
    );
  }

  // Email verified after returning from browser
  if (verified) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 px-8" style={{ backgroundColor: theme.background, paddingTop: insets.top + 40 }}>
          <View className="flex-1 justify-center items-center pb-20">
            <View
              className="w-24 h-24 rounded-full justify-center items-center mb-6"
              style={{ backgroundColor: theme.status.success }}
            >
              <CheckCircle size={48} color="#FFFFFF" />
            </View>
            <Text className="text-[28px] font-manrope-bold mb-3 text-center" style={{ color: theme.text }}>{t.verify.emailVerified}</Text>
            <Text className="text-base font-manrope text-center leading-6 mb-8 px-4" style={{ color: theme.textSecondary }}>
              {t.verify.verifiedMessage}
            </Text>
            <Button
              title={t.verify.continueToLogin}
              onPress={() => router.replace("/login")}
              variant="purple"
              className="w-full mt-3"
            />
          </View>
        </View>
      </>
    );
  }

  // Email verification pending screen
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-8" style={{ backgroundColor: theme.background, paddingTop: insets.top + 20 }}>
        <TouchableOpacity
          className="w-12 h-12 rounded-3xl justify-center items-center"
          style={{ backgroundColor: theme.surface }}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>

        <View className="flex-1 justify-center items-center pb-20">
          <View
            className="w-24 h-24 rounded-full justify-center items-center mb-6"
            style={{ backgroundColor: theme.accent.yellow }}
          >
            <Mail size={48} color="#1C1C1E" />
          </View>

          <Text className="text-[28px] font-manrope-bold mb-3 text-center" style={{ color: theme.text }}>{t.verify.title}</Text>
          <Text className="text-base font-manrope text-center leading-6 mb-8 px-4" style={{ color: theme.textSecondary }}>
            {sent ? interpolate(t.verify.sentMessage, { email }) : interpolate(t.verify.checkInbox, { email })}
          </Text>

          {error ? <Text className="text-sm font-manrope-medium mb-4 text-center" style={{ color: theme.status.error }}>{error}</Text> : null}

          {!sent && (
            <Button
              title={t.verify.resendEmail}
              onPress={handleResend}
              loading={loading}
              disabled={loading}
              variant="outline"
              className="w-full mt-3"
            />
          )}

          <Button
            title={t.verify.backToLogin}
            onPress={() => router.replace("/login")}
            variant="primary"
            className="w-full mt-3"
          />
        </View>
      </View>
    </>
  );
}
