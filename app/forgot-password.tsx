import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/stores/authStore";
import { useTheme } from "@/stores/themeStore";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { forgotPassword } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await forgotPassword(email);
    setIsLoading(false);

    if (result.success) {
      setEmailSent(true);
    } else {
      setError(result.error || "Failed to send reset email");
    }
  };

  if (emailSent) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background, paddingTop: insets.top }}>
        <TouchableOpacity
          className="w-12 h-12 rounded-2xl justify-center items-center ml-8 mb-8"
          style={{ backgroundColor: theme.surface }}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>

        <View className="flex-1 justify-center items-center px-8">
          <View
            className="w-[120px] h-[120px] rounded-full justify-center items-center mb-8"
            style={{ backgroundColor: `${theme.accent.purple}20` }}
          >
            <CheckCircle size={64} color={theme.accent.purple} />
          </View>
          <Text className="text-[28px] font-manrope-bold mb-4 text-center" style={{ color: theme.text }}>Check Your Email</Text>
          <Text className="text-base font-manrope text-center leading-6 mb-8" style={{ color: theme.textSecondary }}>
            We've sent a password reset link to{"\n"}
            <Text className="font-manrope-bold" style={{ color: theme.text }}>{email}</Text>
          </Text>
          <Button title="Back to Login" onPress={() => router.replace("/login")} variant="purple" className="w-full" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1" style={{ backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: insets.top + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          className="w-12 h-12 rounded-2xl justify-center items-center mb-8"
          style={{ backgroundColor: theme.surface }}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>

        <View className="mb-12">
          <View
            className="w-20 h-20 rounded-3xl justify-center items-center mb-6"
            style={{ backgroundColor: theme.accent.yellow }}
          >
            <Mail size={40} color="#1C1C1E" />
          </View>
          <Text className="text-[32px] font-manrope-bold mb-3" style={{ color: theme.text }}>Forgot Password?</Text>
          <Text className="text-base font-manrope leading-6" style={{ color: theme.textSecondary }}>
            No worries! Enter your email and we'll send you a reset link.
          </Text>
        </View>

        <View className="flex-1">
          <Input
            label="Email Address"
            placeholder="hello@home.app"
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
            title="Send Reset Link"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading || !email}
            variant="purple"
            className="mt-4"
          />
        </View>

        <View className="flex-row justify-center items-center pt-6" style={{ paddingBottom: insets.bottom + 24 }}>
          <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text className="text-sm font-manrope-bold underline" style={{ color: theme.text }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
