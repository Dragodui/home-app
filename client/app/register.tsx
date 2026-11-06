import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import GoogleSignInButton from "@/components/auth/google-sign-in-button";
import { AuthScreen, Button, Input } from "@/components/ui";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, googleSignIn } = useAuth();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
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
          router.replace("/(tabs)/home");
        } else {
          setError(result.error || t.auth.googleSignInFailed);
        }
      }
      setIsGoogleLoading(false);
    } else if (response?.type === "error") {
      setError(t.auth.googleSignInCancelled);
    }
  }, [googleSignIn, response, router, t.auth.googleSignInCancelled, t.auth.googleSignInFailed]);

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
    <AuthScreen
      hero="page"
      title={t.auth.joinHome}
      description={t.auth.joinTagline}
      footerPrompt={t.auth.alreadyMember}
      footerActionTitle={t.auth.logIn}
      onFooterAction={() => router.replace("/login")}
    >
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

      <GoogleSignInButton
        onPress={handleGoogleSignIn}
        isSigningIn={isGoogleLoading}
        disabled={isLoading || isGoogleLoading || !isReady}
      />
    </AuthScreen>
  );
}
