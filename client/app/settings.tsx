import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Globe, Moon, Sun, Trash2, Tv, Wifi } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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

const CURRENCY_OPTIONS = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "PLN", label: "Polish Zloty", symbol: "zl" },
  { code: "UAH", label: "Ukrainian Hryvnia", symbol: "грн" },
  { code: "BYN", label: "Belarusian Ruble", symbol: "Br" },
] as const;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage, languageNames, availableLanguages } = useI18n();
  const { home, leaveHome, isAdmin, updateHomeCurrency } = useHome();
  const { alert } = useAlert();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  // Smart Home State
  const [showSmartHomeModal, setShowSmartHomeModal] = useState(false);
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [haStatus, setHaStatus] = useState<{ connected: boolean; url?: string; error?: string } | null>(null);
  const [haLoading, setHaLoading] = useState(false);

  const fetchHAStatus = useCallback(async () => {
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
  }, [home]);

  useEffect(() => {
    if (showSmartHomeModal) {
      fetchHAStatus();
    }
  }, [showSmartHomeModal, fetchHAStatus]);

  useEffect(() => {
    setSelectedCurrency(home?.currency || "USD");
  }, [home?.currency]);

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

  const handleSaveCurrency = async () => {
    if (!home || selectedCurrency === (home.currency || "USD")) {
      setShowCurrencyModal(false);
      return;
    }

    setUpdatingCurrency(true);
    try {
      const result = await updateHomeCurrency(selectedCurrency);
      if (!result.success) {
        alert(t.common.error, result.error || "Failed to update currency");
        return;
      }
      setShowCurrencyModal(false);
    } finally {
      setUpdatingCurrency(false);
    }
  };

  const currentCurrency = CURRENCY_OPTIONS.find((option) => option.code === (home?.currency || "USD"));

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

                <TouchableOpacity
                  className="flex-row items-center p-4 rounded-20 gap-3.5 mb-3"
                  style={{ backgroundColor: theme.surface }}
                  onPress={() => setShowCurrencyModal(true)}
                >
                  <View
                    className="w-11 h-11 rounded-14 justify-center items-center"
                    style={{ backgroundColor: theme.accent.yellow }}
                  >
                    <Text className="text-base font-manrope-bold" style={{ color: "#1C1C1E" }}>
                      {currentCurrency?.symbol || "$"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-manrope-semibold" style={{ color: theme.text }}>
                      Home Currency
                    </Text>
                    <Text className="text-xs font-manrope" style={{ color: theme.textSecondary }}>
                      {currentCurrency?.code || "USD"} • {currentCurrency?.label || "US Dollar"}
                    </Text>
                  </View>
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

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        title="Home Currency"
        height="full"
      >
        <View className="flex-1">
          <Text className="text-sm mb-3" style={{ color: theme.textSecondary }}>
            Select the currency for all home expenses
          </Text>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {CURRENCY_OPTIONS.map((option) => {
              const isSelected = selectedCurrency === option.code;
              return (
                <TouchableOpacity
                  key={option.code}
                  className="p-4 rounded-16 mb-2.5 flex-row items-center"
                  style={{
                    backgroundColor: isSelected ? theme.accent.yellow : theme.surface,
                  }}
                  onPress={() => setSelectedCurrency(option.code)}
                >
                  <Text
                    className="text-lg font-manrope-bold mr-3"
                    style={{ color: isSelected ? "#1C1C1E" : theme.textSecondary }}
                  >
                    {option.symbol}
                  </Text>
                  <View className="flex-1">
                    <Text
                      className="text-17 font-manrope-semibold"
                      style={{ color: isSelected ? "#1C1C1E" : theme.text }}
                    >
                      {option.code}
                    </Text>
                    <Text
                      className="text-xs font-manrope"
                      style={{ color: isSelected ? "#1C1C1E" : theme.textSecondary }}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Button
            title={t.common.save}
            onPress={handleSaveCurrency}
            loading={updatingCurrency}
            disabled={!home || selectedCurrency === (home.currency || "USD")}
            style={{ marginTop: 16 }}
          />
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
