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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register, googleSignIn } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
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

  const handleRegister = async () => {
    if (!name || !username || !email || !password) {
      setError(t.auth.fillAllFields);
      return;
    }

    if (!/^[a-z][a-z0-9_]{2,31}$/.test(username)) {
      setError(t.auth.usernameInvalid || "Username: 3-32 chars, starts with letter, only a-z, 0-9, _");
      return;
    }

    if (password.length < 8) {
      setError(t.auth.passwordMinLength);
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await register(email, password, name, username);
    setIsLoading(false);

    if (result.success) {
      router.push({ pathname: "/verify", params: { email } });
    } else {
      setError(result.error || t.auth.registrationFailed);
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
        {/* Header - matches PDF */}
        <View className="mb-12">
          <Text className="text-5xl font-manrope-extrabold mb-2" style={{ color: theme.text }}>
            {t.auth.joinHome}
          </Text>
          <Text className="text-xl font-manrope" style={{ color: theme.textSecondary }}>
            {t.auth.joinTagline}
          </Text>
        </View>

        {/* Form */}
        <View className="flex-1 justify-center gap-2">
          <Input
            label={t.auth.fullName}
            placeholder={t.auth.fullNamePlaceholder}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError("");
            }}
            autoCapitalize="words"
            autoComplete="name"
          />

          <Input
            label={t.auth.username || "Username"}
            placeholder={t.auth.usernamePlaceholder || "your_username"}
            value={username}
            onChangeText={(text: string) => {
              setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ""));
              setError("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
          />

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
            placeholder={t.auth.createPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError("");
            }}
            secureTextEntry
            autoComplete="password-new"
            error={error || undefined}
          />

          <Button
            title={t.auth.createAccount}
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading || isGoogleLoading}
            variant="yellow"
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
            {t.auth.alreadyMember}{" "}
          </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text className="text-sm font-manrope-bold underline" style={{ color: theme.text }}>
              {t.auth.logIn}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
