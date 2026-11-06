import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { Check, Copy, DoorOpen, House, Pencil, RotateCcw, Users } from "lucide-react-native";
import { useRef, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import {
  BackButton,
  Card,
  EmptyState,
  IconButton,
  ListItem,
  Modal,
  Screen,
  ScreenHeader,
  Section,
  Spinner,
  Text,
  useAlert,
} from "@/components/ui";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "PLN", "UAH", "BYN"];

export default function HomeSettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();
  const { home, isAdmin, updateHome, regenerateInviteCode } = useHome();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(home?.name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingCurrency, setIsSavingCurrency] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isRotatingCode, setIsRotatingCode] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === home?.name) {
      setIsEditingName(false);
      setNameInput(home?.name || "");
      return;
    }
    setIsSavingName(true);
    const result = await updateHome({ name: trimmed });
    setIsSavingName(false);
    if (result.success) {
      setIsEditingName(false);
    } else {
      alert(t.common.error, result.error || "Failed to update home name");
      setNameInput(home?.name || "");
    }
  };

  const handleRotateCode = () => {
    alert(t.profile.homeCode, t.profile.rotateCodeConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.profile.rotate,
        onPress: async () => {
          setIsRotatingCode(true);
          const result = await regenerateInviteCode();
          setIsRotatingCode(false);
          if (!result.success) {
            alert(t.common.error, result.error || "Failed to regenerate invite code");
          }
        },
      },
    ]);
  };

  const handleSelectCurrency = async (currency: string) => {
    if (!isAdmin || currency === home?.currency || isSavingCurrency) return;
    setShowCurrencyModal(false);
    setIsSavingCurrency(currency);
    const result = await updateHome({ currency });
    setIsSavingCurrency(null);
    if (!result.success) {
      alert(t.common.error, result.error || "Failed to update currency");
    }
  };

  if (!home) {
    return (
      <Screen width="md">
        <BackButton />
        <EmptyState icon={House} title={t.rooms.joinHomeToManage} />
      </Screen>
    );
  }

  const currentCurrency = (home.currency || "USD").toUpperCase();

  return (
    <Screen width="md">
      <ScreenHeader title={t.profile.homeSettings} />

      <Section title={t.settings.homeName || "Home Name"}>
        <Card size="md" className="flex-row items-center gap-3">
          {isEditingName ? (
            <>
              <TextInput
                ref={nameInputRef}
                className="flex-1 text-base font-manrope-semibold"
                style={{ color: theme.text }}
                value={nameInput}
                onChangeText={setNameInput}
                onSubmitEditing={saveName}
                onBlur={saveName}
                autoFocus
                maxLength={100}
                editable={!isSavingName}
              />
              {isSavingName ? (
                <Spinner size="small" color={theme.accent.purple} />
              ) : (
                <IconButton icon={Check} size="sm" tone="mint" onPress={saveName} accessibilityLabel={t.common.save} />
              )}
            </>
          ) : (
            <>
              <Text variant="subtitle" className="flex-1">
                {home.name}
              </Text>
              {isAdmin && (
                <IconButton
                  icon={Pencil}
                  size="sm"
                  style={{ backgroundColor: theme.background }}
                  onPress={() => {
                    setNameInput(home.name);
                    setIsEditingName(true);
                  }}
                />
              )}
            </>
          )}
        </Card>
      </Section>

      <Section title={t.settings.currency || "CURRENCY"}>
        <ListItem
          title={currentCurrency}
          disabled={!isAdmin}
          showChevron={isAdmin && !isSavingCurrency}
          right={isSavingCurrency ? <Spinner size="small" color={theme.accent.purple} /> : undefined}
          onPress={() => setShowCurrencyModal(true)}
        />
      </Section>

      {home.inviteCode && (
        <Section title={t.profile.homeCode}>
          <Card size="md" className="flex-row items-center gap-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center gap-2"
              onPress={async () => {
                await Clipboard.setStringAsync(home.inviteCode);
                alert(t.common.copied, t.profile.inviteCodeCopied);
              }}
              activeOpacity={0.7}
            >
              <Text variant="subtitle" className="font-manrope-bold tracking-widest">
                {home.inviteCode}
              </Text>
              <Copy size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            {isAdmin &&
              (isRotatingCode ? (
                <Spinner size="small" color={theme.accent.purple} />
              ) : (
                <IconButton
                  icon={RotateCcw}
                  size="sm"
                  style={{ backgroundColor: theme.background }}
                  onPress={handleRotateCode}
                  accessibilityLabel={t.profile.rotate}
                />
              ))}
          </Card>
        </Section>
      )}

      <View className="mb-8 gap-3">
        <ListItem icon={Users} iconTone="mint" title={t.members.title} onPress={() => router.push("/members")} />
        <ListItem icon={DoorOpen} iconTone="yellow" title={t.rooms.title} onPress={() => router.push("/rooms")} />
      </View>

      <Modal
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        title={t.settings.currency || "Currency"}
      >
        <View className="gap-2.5">
          {CURRENCY_OPTIONS.map((currency) => (
            <ListItem
              key={currency}
              title={currency}
              selected={currency === currentCurrency}
              showChevron={false}
              onPress={() => handleSelectCurrency(currency)}
            />
          ))}
        </View>
      </Modal>
    </Screen>
  );
}
