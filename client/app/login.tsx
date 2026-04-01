import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, googleSignIn } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const { response, promptAsync, isReady } = useGoogleAuth();

  const handleGoogleResponse = async () => {
    if (response?.type === "success") {
      setIsGoogleLoading(true);
      setError("");

      const { authentication } = response;
      if (authentication?.accessToken) {
        const result = await googleSignIn(authentication.accessToken);

        if (result.success) {
          router.replace("/(tabs)/home");
        } else {
          setError(result.error || t.auth.googleSignInFailed);
        }
      }
      setIsGoogleLoading(false);
    } else if (response?.type === "error") {
      setError(t.auth.googleSignInCancelled);
    }
  };

  useEffect(() => {
    handleGoogleResponse();
  }, [handleGoogleResponse]);

  const handleGoogleSignIn = async () => {
    if (!isReady) {
      setError(t.auth.googleSignInNotReady);
      return;
    }
    await promptAsync();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t.auth.fillAllFields);
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      router.replace("/(tabs)/home");
    } else if (result.needsVerification) {
      router.push({ pathname: "/verify", params: { email } });
    } else {
      setError(result.error || t.auth.loginFailed);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header - matches PDF exactly */}
        <View className="mb-12">
          <Text className="text-[64px] font-manrope-extrabold mb-2 tracking-tighter" style={{ color: theme.text }}>
            {t.auth.brand}
          </Text>
          <Text className="text-xl font-manrope" style={{ color: theme.textSecondary }}>
            {t.auth.tagline}
          </Text>
        </View>

        {/* Form */}
        <View className="flex-1 justify-center gap-2">
          <Input
            label={t.auth.email}
            placeholder={t.auth.emailPlaceholder}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label={t.auth.password}
            placeholder={t.auth.passwordPlaceholder}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError("");
            }}
            secureTextEntry
            autoComplete="password"
            error={error || undefined}
          />

          <TouchableOpacity onPress={() => router.push("/forgot-password")} className="self-center mt-1">
            <Text className="text-sm font-manrope-semibold" style={{ color: theme.textSecondary }}>
              {t.auth.forgotPassword || "Forgot Password?"}
            </Text>
          </TouchableOpacity>

          <Button
            title={t.auth.getStarted}
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading || isGoogleLoading}
            variant="purple"
            className="mt-6"
          />
          <View className="flex-row items-center my-5">
            <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
            <Text className="mx-4 text-sm font-manrope" style={{ color: theme.textSecondary }}>
              {t.common.or}
            </Text>
            <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center py-3.5 px-6 rounded-xl border gap-3"
            style={{ borderColor: theme.border }}
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading || !isReady}
          >
            <Ionicons name="logo-google" size={20} color={theme.text} />
            <Text className="text-base font-manrope-semibold" style={{ color: theme.text }}>
              {isGoogleLoading ? t.auth.signingIn : t.auth.continueWithGoogle}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center items-center pt-8" style={{ paddingBottom: insets.bottom + 24 }}>
          <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
            {t.auth.newHere}{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text className="text-sm font-manrope-bold underline" style={{ color: theme.text }}>
              {t.auth.createAccount}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
