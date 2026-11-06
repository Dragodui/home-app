import { useRouter } from "expo-router";
import { Globe, Moon, Sun, Trash2, Tv, Wifi } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import {
  Button,
  Card,
  ConfirmModal,
  InfoRow,
  Input,
  ListItem,
  Modal,
  Screen,
  ScreenHeader,
  Section,
  SegmentedControl,
  Spinner,
  Text,
  useAlert,
} from "@/components/ui";
import { smarthomeApi } from "@/lib/api";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function SettingsScreen() {
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

  const handleConnectHA = async () => {
    if (!home) return;
    setHaLoading(true);
    try {
      await smarthomeApi.connect(home.id, haUrl, haToken);
      await fetchHAStatus();
      alert(t.common.success, t.smartHome.connectedSuccess);
    } catch (_error) {
      alert(t.common.error, t.smartHome.failedToConnect);
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
      alert(t.common.success, t.smartHome.disconnectedSuccess);
    } catch (_error) {
      alert(t.common.error, t.smartHome.failedToDisconnect);
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
    <Screen width="md">
      <ScreenHeader title={t.profile.settings} />

      <Section title={t.settings.appearance || "APPEARANCE"}>
        <Card size="md">
          <Text variant="subtitle" className="mb-4">
            {t.profile.theme}
          </Text>
          <SegmentedControl
            value={themeMode}
            onChange={setThemeMode}
            options={[
              { value: "light", label: t.profile.light, icon: Sun, activeTone: "yellow" },
              { value: "dark", label: t.profile.dark, icon: Moon, activeTone: "purple" },
            ]}
          />
        </Card>
      </Section>

      <Section title={t.settings.language || "LANGUAGE"}>
        <ListItem
          icon={Globe}
          iconTone="purple"
          title={languageNames[language]}
          onPress={() => setShowLanguageModal(true)}
        />
      </Section>

      {home && (
        <Section title={t.settings.homeSettings || "HOME SETTINGS"}>
          {isAdmin && (
            <View className="gap-3 mb-3">
              <ListItem
                icon={Wifi}
                iconTone="cyan"
                title={t.smartHome.connection}
                onPress={() => setShowSmartHomeModal(true)}
              />
              <ListItem
                icon={Tv}
                iconTone="cyan"
                title={t.smartHome.dashboard}
                onPress={() => router.push("/smarthome")}
              />
            </View>
          )}

          <Card size="md">
            <InfoRow label={t.settings.homeName || "Home Name"} value={home.name} />
            <InfoRow
              label={t.settings.yourRole || "Your Role"}
              value={isAdmin ? t.profile.homeAdmin : t.profile.member}
            />
          </Card>

          <Button
            title={isAdmin ? t.settings.deleteHome || "Delete Home" : t.settings.leaveHome || "Leave Home"}
            icon={<Trash2 size={20} color={theme.onDanger} />}
            onPress={() => setShowDeleteConfirm(true)}
            variant="danger"
            className="mt-4"
          />
        </Section>
      )}

      <Modal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title={t.settings.selectLanguage || "Select Language"}
      >
        <View className="gap-2.5">
          {availableLanguages.map((lang) => (
            <ListItem
              key={lang}
              title={languageNames[lang]}
              selected={language === lang}
              showChevron={false}
              onPress={() => {
                setLanguage(lang);
                setShowLanguageModal(false);
              }}
            />
          ))}
        </View>
      </Modal>

      <Modal visible={showSmartHomeModal} onClose={() => setShowSmartHomeModal(false)} title={t.smartHome.title}>
        {haLoading ? (
          <Spinner color={theme.accent.cyan} />
        ) : haStatus?.connected ? (
          <>
            <Card size="md" className="mb-5">
              <Text variant="heading" className="mb-2">
                {t.smartHome.statusConnected}
              </Text>
              <Text variant="bodySmall" color="secondary" className="mb-2">
                {t.smartHome.urlPrefix} {haStatus.url}
              </Text>
              {haStatus.error && (
                <Text variant="bodySmall" color="danger">
                  {t.smartHome.errorPrefix} {haStatus.error}
                </Text>
              )}
            </Card>
            <Button title={t.smartHome.disconnect} onPress={handleDisconnectHA} variant="danger" className="mt-5" />
          </>
        ) : (
          <>
            <Text variant="bodySmall" color="secondary" className="mb-5">
              {t.smartHome.connectDescription}
            </Text>
            <Input
              label={t.smartHome.urlFieldLabel}
              placeholder="http://homeassistant.local:8123"
              value={haUrl}
              onChangeText={setHaUrl}
              autoCapitalize="none"
            />
            <Input
              label={t.smartHome.tokenFieldLabel}
              placeholder="eyJhbGciOi..."
              value={haToken}
              onChangeText={setHaToken}
              secureTextEntry
            />
            <Button
              title={t.smartHome.connect}
              onPress={handleConnectHA}
              className="mt-5"
              disabled={!haUrl || !haToken}
            />
          </>
        )}
      </Modal>

      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleLeaveHome}
        title={
          isAdmin
            ? t.settings.deleteHomeConfirmTitle || "Delete Home?"
            : t.settings.leaveHomeConfirmTitle || "Leave Home?"
        }
        message={
          isAdmin
            ? t.settings.deleteHomeConfirmText || "This action cannot be undone. All data will be permanently deleted."
            : t.settings.leaveHomeConfirmText || "You will no longer have access to this home."
        }
        confirmLabel={isAdmin ? t.common.delete || "Delete" : t.settings.leave || "Leave"}
        cancelLabel={t.common.cancel}
        loading={isLeaving}
        destructive
      />
    </Screen>
  );
}
