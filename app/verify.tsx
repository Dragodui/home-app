import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, Mail, XCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/ui/button";
import Colors from "@/constants/colors";
import { useAuth } from "@/stores/authStore";
import { interpolate, useI18n } from "@/stores/i18nStore";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, email: paramEmail } = useLocalSearchParams<{ token?: string; email?: string }>();
  const { verifyEmail, resendVerification } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const email = paramEmail || "";

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
        <View className="flex-1 bg-white px-8" style={{ paddingTop: insets.top + 40 }}>
          <View className="flex-1 justify-center items-center pb-20">
            {loading ? (
              <ActivityIndicator size="large" color={Colors.accentPurple} />
            ) : (
              <>
                <View
                  className="w-24 h-24 rounded-full justify-center items-center mb-6"
                  style={{ backgroundColor: verified ? Colors.green500 : Colors.red500 }}
                >
                  {verified ? (
                    <CheckCircle size={48} color={Colors.white} />
                  ) : (
                    <XCircle size={48} color={Colors.white} />
                  )}
                </View>
                <Text className="text-[28px] font-manrope-bold text-black mb-3 text-center">
                  {verified ? t.verify.emailVerified : t.verify.verificationFailed}
                </Text>
                <Text className="text-base font-manrope text-gray-500 text-center leading-6 mb-8 px-4">
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

  // Email verification pending screen
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white px-8" style={{ paddingTop: insets.top + 20 }}>
        <TouchableOpacity
          className="w-12 h-12 rounded-3xl bg-gray-50 justify-center items-center"
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.black} />
        </TouchableOpacity>

        <View className="flex-1 justify-center items-center pb-20">
          <View
            className="w-24 h-24 rounded-full justify-center items-center mb-6"
            style={{ backgroundColor: Colors.accentYellow }}
          >
            <Mail size={48} color={Colors.black} />
          </View>

          <Text className="text-[28px] font-manrope-bold text-black mb-3 text-center">{t.verify.title}</Text>
          <Text className="text-base font-manrope text-gray-500 text-center leading-6 mb-8 px-4">
            {sent ? interpolate(t.verify.sentMessage, { email }) : interpolate(t.verify.checkInbox, { email })}
          </Text>

          {error ? <Text className="text-red-500 text-sm font-manrope-medium mb-4 text-center">{error}</Text> : null}

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
