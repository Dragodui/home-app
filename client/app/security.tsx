import { AlertCircle, CheckCircle, Key, Mail, Shield } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import {
  Badge,
  Button,
  Card,
  Input,
  ListItem,
  Modal,
  Screen,
  ScreenHeader,
  Section,
  Text,
  useAlert,
} from "@/components/ui";
import { authApi } from "@/lib/api";
import { useAuth } from "@/stores/authStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function SecurityScreen() {
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

  const tips = [
    t.security.tip1 || "Use a strong, unique password",
    t.security.tip2 || "Never share your password with others",
    t.security.tip3 || "Enable email verification for extra security",
  ];

  return (
    <Screen width="md">
      <ScreenHeader title={t.profile.security} />

      <Section title={t.security.account || "ACCOUNT"}>
        <ListItem
          icon={Mail}
          iconTone="purple"
          title={t.security.email || "Email"}
          subtitle={user?.email || "Not set"}
          right={
            user?.emailVerified ? (
              <Badge label={t.security.verified || "Verified"} tone="green" icon={CheckCircle} />
            ) : (
              <Badge label={t.security.unverified || "Unverified"} tone="warning" icon={AlertCircle} />
            )
          }
        />
      </Section>

      <Section title={t.security.password || "PASSWORD"}>
        <ListItem
          icon={Key}
          iconTone="pink"
          title={t.security.changePassword || "Change Password"}
          subtitle={t.security.lastChanged || "Update your password regularly for security"}
          showChevron={false}
          onPress={() => setShowPasswordModal(true)}
        />
      </Section>

      <Section title={t.security.tips || "SECURITY TIPS"}>
        <Card size="md" className="gap-4">
          {tips.map((tip) => (
            <View key={tip} className="flex-row items-center gap-3">
              <Shield size={18} color={theme.accent.purple} />
              <Text variant="label" className="flex-1 font-manrope-medium">
                {tip}
              </Text>
            </View>
          ))}
        </Card>
      </Section>

      <Modal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t.security.changePassword || "Change Password"}
      >
        <Input
          label={t.security.currentPassword || "Current Password"}
          placeholder={t.security.currentPasswordPlaceholder}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Input
          label={t.security.newPassword || "New Password"}
          placeholder={t.security.newPasswordPlaceholder}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Input
          label={t.security.confirmPassword || "Confirm Password"}
          placeholder={t.security.confirmPasswordPlaceholder}
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
          className="mt-4"
        />
      </Modal>
    </Screen>
  );
}
