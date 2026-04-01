import { useRouter } from "expo-router";
import { AlertCircle, ArrowLeft, CheckCircle, Key, Mail, Shield } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { authApi } from "@/lib/api";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { alert } = useAlert();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert(t.common.error, t.security.fillAllFields || "Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert(t.common.error, t.security.passwordsMismatch || "Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      alert(t.common.error, t.security.passwordTooShort || "Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);

      alert(t.common.success || "Success", t.security.passwordChanged || "Password changed successfully");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const msg = error?.response?.data?.error || t.security.passwordChangeFailed || "Failed to change password";
      alert(t.common.error, msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity
            className="w-12 h-12 rounded-16 justify-center items-center"
            style={{ backgroundColor: theme.surface }}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <Text className="flex-1 text-2xl font-manrope-bold text-center" style={{ color: theme.text }}>
            {t.profile.security}
          </Text>
          <View className="w-12" />
        </View>

        {/* Email Verification Status */}
        <View className="mb-8">
          <Text
            className="text-xs font-manrope-bold mb-3 ml-1"
            style={{ color: theme.textSecondary, letterSpacing: 1 }}
          >
            {t.security.account || "ACCOUNT"}
          </Text>
          <View className="p-5 rounded-20" style={{ backgroundColor: theme.surface }}>
            <View className="flex-row items-center gap-3.5">
              <View
                className="w-11 h-11 rounded-14 justify-center items-center"
                style={{ backgroundColor: theme.accent.purple }}
              >
                <Mail size={20} color="#1C1C1E" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-manrope-semibold mb-0.5" style={{ color: theme.text }}>
                  {t.security.email || "Email"}
                </Text>
                <Text className="text-sm font-manrope" style={{ color: theme.textSecondary }}>
                  {user?.email || "Not set"}
                </Text>
              </View>
              {user?.emailVerified ? (
                <View
                  className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-20"
                  style={{ backgroundColor: `${theme.status.success}20` }}
                >
                  <CheckCircle size={16} color={theme.status.success} />
                  <Text className="text-xs font-manrope-semibold" style={{ color: theme.status.success }}>
                    {t.security.verified || "Verified"}
                  </Text>
                </View>
              ) : (
                <View
                  className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-20"
                  style={{ backgroundColor: `${theme.status.warning}20` }}
                >
                  <AlertCircle size={16} color={theme.status.warning} />
                  <Text className="text-xs font-manrope-semibold" style={{ color: theme.status.warning }}>
                    {t.security.unverified || "Unverified"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Password Section */}
        <View className="mb-8">
          <Text
            className="text-xs font-manrope-bold mb-3 ml-1"
            style={{ color: theme.textSecondary, letterSpacing: 1 }}
          >
            {t.security.password || "PASSWORD"}
          </Text>
          <TouchableOpacity
            className="flex-row items-center p-4 rounded-20 gap-3.5"
            style={{ backgroundColor: theme.surface }}
            onPress={() => setShowPasswordModal(true)}
          >
            <View
              className="w-11 h-11 rounded-14 justify-center items-center"
              style={{ backgroundColor: theme.accent.pink }}
            >
              <Key size={20} color="#1C1C1E" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-manrope-semibold mb-0.5" style={{ color: theme.text }}>
                {t.security.changePassword || "Change Password"}
              </Text>
              <Text className="text-13 font-manrope" style={{ color: theme.textSecondary }}>
                {t.security.lastChanged || "Update your password regularly for security"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Security Tips */}
        <View className="mb-8">
          <Text
            className="text-xs font-manrope-bold mb-3 ml-1"
            style={{ color: theme.textSecondary, letterSpacing: 1 }}
          >
            {t.security.tips || "SECURITY TIPS"}
          </Text>
          <View className="p-5 rounded-20 gap-4" style={{ backgroundColor: theme.surface }}>
            <View className="flex-row items-center gap-3">
              <Shield size={18} color={theme.accent.purple} />
              <Text className="flex-1 text-sm font-manrope-medium" style={{ color: theme.text }}>
                {t.security.tip1 || "Use a strong, unique password"}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Shield size={18} color={theme.accent.purple} />
              <Text className="flex-1 text-sm font-manrope-medium" style={{ color: theme.text }}>
                {t.security.tip2 || "Never share your password with others"}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Shield size={18} color={theme.accent.purple} />
              <Text className="flex-1 text-sm font-manrope-medium" style={{ color: theme.text }}>
                {t.security.tip3 || "Enable email verification for extra security"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t.security.changePassword || "Change Password"}
        height="full"
      >
        <View className="flex-1">
          <Input
            label={t.security.currentPassword || "Current Password"}
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <Input
            label={t.security.newPassword || "New Password"}
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <Input
            label={t.security.confirmPassword || "Confirm Password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button
            title={t.security.changePassword || "Change Password"}
            onPress={handleChangePassword}
            loading={isChangingPassword}
            disabled={!currentPassword || !newPassword || !confirmPassword}
            variant="pink"
            style={{ marginTop: "auto" }}
          />
        </View>
      </Modal>
    </View>
  );
}
