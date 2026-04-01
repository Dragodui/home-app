import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Globe, Moon, Sun, Trash2, Tv, Wifi } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { smarthomeApi } from "@/lib/api";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage, languageNames, availableLanguages } = useI18n();
  const { home, leaveHome, isAdmin } = useHome();
  const { alert } = useAlert();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Smart Home State
  const [showSmartHomeModal, setShowSmartHomeModal] = useState(false);
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [haStatus, setHaStatus] = useState<{ connected: boolean; url?: string; error?: string } | null>(null);
  const [haLoading, setHaLoading] = useState(false);

  const fetchHAStatus = async () => {
    if (!home) return;
    setHaLoading(true);
    try {
      const status = await smarthomeApi.getStatus(home.id);
      setHaStatus(status);
      if (status.url) setHaUrl(status.url);
    } catch (error) {
      console.error(error);
    } finally {
      setHaLoading(false);
    }
  };

  useEffect(() => {
    if (showSmartHomeModal) {
      fetchHAStatus();
    }
  }, [showSmartHomeModal, fetchHAStatus]);

  const handleConnectHA = async () => {
    if (!home) return;
    setHaLoading(true);
    try {
      await smarthomeApi.connect(home.id, haUrl, haToken);
      await fetchHAStatus();
      alert(t.common.success || "Success", "Home Assistant connected successfully");
    } catch (_error) {
      alert(t.common.error, "Failed to connect to Home Assistant");
    } finally {
      setHaLoading(false);
    }
  };

  const handleDisconnectHA = async () => {
    if (!home) return;
    setHaLoading(true);
    try {
      await smarthomeApi.disconnect(home.id);
      await fetchHAStatus();
      setHaToken("");
      alert(t.common.success || "Success", "Disconnected from Home Assistant");
    } catch (_error) {
      alert(t.common.error, "Failed to disconnect");
    } finally {
      setHaLoading(false);
    }
  };

  const handleLeaveHome = async () => {
    if (!home) return;

    setIsLeaving(true);
    try {
      const result = await leaveHome();
      if (result.success) {
        setShowDeleteConfirm(false);
        router.replace("/(tabs)/profile");
      } else {
        alert(t.common.error, result.error || t.settings.leaveHomeFailed);
      }
    } catch (_error) {
      alert(t.common.error, t.settings.leaveHomeFailed);
    } finally {
      setIsLeaving(false);
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
            {t.profile.settings}
          </Text>
          <View className="w-12" />
        </View>

        {/* Appearance Section */}
        <View className="mb-8">
          <Text
            className="text-xs font-manrope-bold mb-3 ml-1"
            style={{ color: theme.textSecondary, letterSpacing: 1 }}
          >
            {t.settings.appearance || "APPEARANCE"}
          </Text>

          {/* Theme Toggle */}
          <View className="p-5 rounded-20" style={{ backgroundColor: theme.surface }}>
            <Text className="text-base font-manrope-semibold mb-4" style={{ color: theme.text }}>
              {t.profile.theme}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-14"
                style={{
                  backgroundColor: themeMode === "light" ? theme.accent.yellow : theme.background,
                }}
                onPress={() => setThemeMode("light")}
              >
                <Sun size={20} color={themeMode === "light" ? "#1C1C1E" : theme.textSecondary} />
                <Text
                  className="text-sm font-manrope-semibold"
                  style={{ color: themeMode === "light" ? "#1C1C1E" : theme.textSecondary }}
                >
                  {t.profile.light}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-14"
                style={{
                  backgroundColor: themeMode === "dark" ? theme.accent.purple : theme.background,
                }}
                onPress={() => setThemeMode("dark")}
              >
                <Moon size={20} color={themeMode === "dark" ? "#1C1C1E" : theme.textSecondary} />
                <Text
                  className="text-sm font-manrope-semibold"
                  style={{ color: themeMode === "dark" ? "#1C1C1E" : theme.textSecondary }}
                >
                  {t.profile.dark}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View className="mb-8">
          <Text
            className="text-xs font-manrope-bold mb-3 ml-1"
            style={{ color: theme.textSecondary, letterSpacing: 1 }}
          >
            {t.settings.language || "LANGUAGE"}
          </Text>
          <TouchableOpacity
            className="flex-row items-center p-4 rounded-20 gap-3.5"
            style={{ backgroundColor: theme.surface }}
            onPress={() => setShowLanguageModal(true)}
          >
            <View
              className="w-11 h-11 rounded-14 justify-center items-center"
              style={{ backgroundColor: theme.accent.purple }}
            >
              <Globe size={20} color="#1C1C1E" />
            </View>
            <Text className="flex-1 text-base font-manrope-semibold" style={{ color: theme.text }}>
              {languageNames[language]}
            </Text>
            <ChevronRight size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Home Settings Section */}
        {home && (
          <View className="mb-8">
            <Text
              className="text-xs font-manrope-bold mb-3 ml-1"
              style={{ color: theme.textSecondary, letterSpacing: 1 }}
            >
              {t.settings.homeSettings || "HOME SETTINGS"}
            </Text>

            {isAdmin && (
              <>
                <TouchableOpacity
                  className="flex-row items-center p-4 rounded-20 gap-3.5 mb-3"
                  style={{ backgroundColor: theme.surface }}
                  onPress={() => setShowSmartHomeModal(true)}
                >
                  <View
                    className="w-11 h-11 rounded-14 justify-center items-center"
                    style={{ backgroundColor: theme.accent.cyan }}
                  >
                    <Wifi size={20} color="#FFFFFF" />
                  </View>
                  <Text className="flex-1 text-base font-manrope-semibold" style={{ color: theme.text }}>
                    Smart Home Connection
                  </Text>
                  <ChevronRight size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center p-4 rounded-20 gap-3.5 mb-3"
                  style={{ backgroundColor: theme.surface }}
                  onPress={() => router.push("/smarthome")}
                >
                  <View
                    className="w-11 h-11 rounded-14 justify-center items-center"
                    style={{ backgroundColor: theme.accent.cyan }}
                  >
                    <Tv size={20} color="#FFFFFF" />
                  </View>
                  <Text className="flex-1 text-base font-manrope-semibold" style={{ color: theme.text }}>
                    Smart Home Dashboard
                  </Text>
                  <ChevronRight size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </>
            )}

            <View className="p-5 rounded-20" style={{ backgroundColor: theme.surface }}>
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-15 font-manrope-medium" style={{ color: theme.text }}>
                  {t.settings.homeName || "Home Name"}
                </Text>
                <Text className="text-15 font-manrope" style={{ color: theme.textSecondary }}>
                  {home.name}
                </Text>
              </View>
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-15 font-manrope-medium" style={{ color: theme.text }}>
                  {t.settings.yourRole || "Your Role"}
                </Text>
                <Text className="text-15 font-manrope" style={{ color: theme.textSecondary }}>
                  {isAdmin ? t.profile.homeAdmin : t.profile.member}
                </Text>
              </View>
            </View>

            {/* Leave/Delete Home */}
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2.5 py-4 rounded-16 mt-4"
              style={{ backgroundColor: theme.accent.dangerLight }}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text className="text-base font-manrope-semibold text-white">
                {isAdmin ? t.settings.deleteHome || "Delete Home" : t.settings.leaveHome || "Leave Home"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title={t.settings.selectLanguage || "Select Language"}
        height="full"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {availableLanguages.map((lang) => (
            <TouchableOpacity
              key={lang}
              className="p-4.5 rounded-16 mb-2.5"
              style={{
                backgroundColor: language === lang ? theme.accent.purple : theme.surface,
              }}
              onPress={() => {
                setLanguage(lang);
                setShowLanguageModal(false);
              }}
            >
              <Text
                className="text-17 font-manrope-semibold"
                style={{ color: language === lang ? "#1C1C1E" : theme.text }}
              >
                {languageNames[lang]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>

      {/* Smart Home Modal */}
      <Modal visible={showSmartHomeModal} onClose={() => setShowSmartHomeModal(false)} title="Smart Home" height="full">
        <View className="flex-1">
          {haLoading ? (
            <ActivityIndicator size="large" color={theme.accent.cyan} />
          ) : haStatus?.connected ? (
            <View>
              <View className="p-5 rounded-16 mb-5" style={{ backgroundColor: theme.surface }}>
                <Text className="text-lg font-manrope-bold mb-2" style={{ color: theme.text }}>
                  Status: Connected
                </Text>
                <Text className="mb-2" style={{ color: theme.textSecondary }}>
                  URL: {haStatus.url}
                </Text>
                {haStatus.error && <Text style={{ color: theme.accent.danger }}>Error: {haStatus.error}</Text>}
              </View>
              <Button title="Disconnect" onPress={handleDisconnectHA} variant="danger" style={{ marginTop: 20 }} />
            </View>
          ) : (
            <View>
              <Text className="mb-5" style={{ color: theme.textSecondary }}>
                Connect your Home Assistant instance to control devices.
              </Text>
              <Input
                label="Home Assistant URL"
                placeholder="http://homeassistant.local:8123"
                value={haUrl}
                onChangeText={setHaUrl}
                autoCapitalize="none"
              />
              <Input
                label="Long-Lived Access Token"
                placeholder="eyJhbGciOi..."
                value={haToken}
                onChangeText={setHaToken}
                secureTextEntry
              />
              <Button
                title="Connect"
                onPress={handleConnectHA}
                variant="primary"
                style={{ marginTop: 20 }}
                disabled={!haUrl || !haToken}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* Delete/Leave Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={
          isAdmin
            ? t.settings.deleteHomeConfirmTitle || "Delete Home?"
            : t.settings.leaveHomeConfirmTitle || "Leave Home?"
        }
      >
        <View className="pt-2.5">
          <Text className="text-15 font-manrope mb-6" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            {isAdmin
              ? t.settings.deleteHomeConfirmText ||
                "This action cannot be undone. All data will be permanently deleted."
              : t.settings.leaveHomeConfirmText || "You will no longer have access to this home."}
          </Text>
          <View className="flex-row gap-3">
            <Button
              title={t.common.cancel}
              onPress={() => setShowDeleteConfirm(false)}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <Button
              title={isAdmin ? t.common.delete || "Delete" : t.settings.leave || "Leave"}
              onPress={handleLeaveHome}
              variant="danger"
              loading={isLeaving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
