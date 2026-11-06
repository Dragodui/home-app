import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import GoogleSignInButton from "@/components/auth/google-sign-in-button";
import { AuthScreen, Button, Input, TextLink, useToast } from "@/components/ui";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleSignIn } = useAuth();
  const { t } = useI18n();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const { response, promptAsync, isReady } = useGoogleAuth();

  const handleGoogleResponse = useCallback(async () => {
    if (response?.type === "success") {
      setIsGoogleLoading(true);
      setError("");

      const { authentication } = response;
      if (authentication?.accessToken) {
        const result = await googleSignIn(authentication.accessToken);

        if (result.success) {
          show({ title: "Success", message: "You are logged in." });
          router.replace("/(tabs)/home");
        } else {
          setError(result.error || t.auth.googleSignInFailed);
        }
      }
      setIsGoogleLoading(false);
    } else if (response?.type === "error") {
      setError(t.auth.googleSignInCancelled);
    }
  }, [googleSignIn, response, router, show, t.auth.googleSignInCancelled, t.auth.googleSignInFailed]);

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
      show({ title: "Success", message: "You are logged in." });
      router.replace("/(tabs)/home");
    } else if (result.needsVerification) {
      router.push({ pathname: "/verify", params: { email } });
    } else {
      setError(result.error || t.auth.loginFailed);
    }
  };

  return (
    <AuthScreen
      hero="brand"
      title={t.auth.brand}
      description={t.auth.tagline}
      footerPrompt={t.auth.newHere}
      footerActionTitle={t.auth.createAccount}
      onFooterAction={() => router.push("/register")}
    >
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

      <TextLink
        subtle
        title={t.auth.forgotPassword || "Forgot Password?"}
        onPress={() => router.push("/forgot-password")}
        className="self-center mt-1"
      />

      <Button
        title={t.auth.getStarted}
        onPress={handleLogin}
        loading={isLoading}
        disabled={isLoading || isGoogleLoading}
        variant="purple"
        className="mt-6"
      />

      <GoogleSignInButton
        onPress={handleGoogleSignIn}
        isSigningIn={isGoogleLoading}
        disabled={isLoading || isGoogleLoading || !isReady}
      />
    </AuthScreen>
  );
}
