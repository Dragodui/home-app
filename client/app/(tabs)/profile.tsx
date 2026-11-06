import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Bell,
  Check,
  Copy,
  DoorOpen,
  Home as HomeIcon,
  LogOut,
  Plus,
  Settings,
  Shield,
  User,
  Users,
  Zap,
} from "lucide-react-native";
import { useRef, useState } from "react";
import { Platform, TextInput, TouchableOpacity, View } from "react-native";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  ListItem,
  Modal,
  ResponsiveGrid,
  Section,
  Spinner,
  TabScreen,
  Text,
  type Tone,
  useAlert,
  useToast,
} from "@/components/ui";
import { imageApi } from "@/lib/api";
import { useAuth } from "@/stores/authStore";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { home, homes, isAdmin, createHome, joinHome, leaveHome, switchHome } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();
  const { show } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [homeName, setHomeName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user?.username || "");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const usernameInputRef = useRef<TextInput>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert(t.common.error, t.profile.failedToPick);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();

      // Web platform requires File/Blob, React Native requires object with uri
      if (Platform.OS === "web") {
        // Fetch the blob from the URI and create a File object
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append("image", blob, "avatar.jpg");
      } else {
        // React Native format
        // @ts-expect-error - React Native FormData expects specific format
        formData.append("image", {
          uri,
          name: "avatar.jpg",
          type: "image/jpeg",
        });
      }

      const result = await imageApi.upload(formData);
      if (result.url) {
        await updateUser({ avatar: result.url });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(t.common.error, t.profile.failedToUpload);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    alert(t.auth.logOut, t.auth.logOutConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.auth.logOut,
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleCreateHome = async () => {
    if (!homeName.trim()) return;

    setIsLoading(true);
    const result = await createHome(homeName);
    setIsLoading(false);

    if (result.success) {
      setShowCreateModal(false);
      setHomeName("");
    } else {
      alert(t.common.error, result.error || t.profile.failedToCreate);
    }
  };

  const handleJoinHome = async () => {
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    const result = await joinHome(inviteCode);
    setIsLoading(false);

    if (result.success) {
      setShowJoinModal(false);
      setInviteCode("");
      show({
        title: t.profile.joinRequestSentTitle,
        message: t.profile.joinRequestSentMessage,
      });
    } else {
      alert(t.common.error, result.error || t.profile.failedToJoin);
    }
  };

  const displayUsername = user?.username
    ? `@${user.username}`
    : user?.name
      ? `@${user.name.trim().toLowerCase().split(/\s+/).join("_")}`
      : "@user";

  const saveUsername = async () => {
    const trimmed = usernameInput.trim().toLowerCase();
    if (!trimmed) {
      setIsEditingUsername(false);
      return;
    }
    if (trimmed === user?.username) {
      setIsEditingUsername(false);
      return;
    }
    if (!/^[a-z][a-z0-9_]{2,31}$/.test(trimmed)) {
      setUsernameError(t.profile.usernameInvalid || "3-32 chars, starts with letter, only a-z, 0-9, _");
      return;
    }
    setIsSavingUsername(true);
    setUsernameError("");
    const result = await updateUser({ username: trimmed });
    setIsSavingUsername(false);
    if (result.success) {
      setIsEditingUsername(false);
    } else {
      setUsernameError(result.error || t.profile.failedToUpdateUsername);
    }
  };

  const MENU_ITEMS = [
    {
      icon: HomeIcon,
      label: t.profile.homeSettings,
      tone: "yellow" as Tone,
      onPress: () => router.push("/home-settings"),
    },
    {
      icon: DoorOpen,
      label: t.rooms.title,
      tone: "yellow" as Tone,
      onPress: () => router.push("/rooms"),
    },
    {
      icon: Users,
      label: t.members.title,
      tone: "mint" as Tone,
      onPress: () => router.push("/members"),
    },
    {
      icon: User,
      label: t.profile.myStats,
      tone: "purple" as Tone,
      onPress: () =>
        user &&
        router.push({
          pathname: "/member-profile",
          params: { userId: String(user.id) },
        }),
    },
    {
      icon: Zap,
      label: t.profile.smartHome,
      tone: "cyan" as Tone,
      onPress: () => router.push("/smarthome"),
    },
    {
      icon: Settings,
      label: t.profile.settings,
      tone: "purple" as Tone,
      onPress: () => router.push("/settings"),
    },
    {
      icon: Bell,
      label: t.profile.notifications,
      tone: "cyan" as Tone,
      onPress: () => router.push("/notifications"),
    },
    {
      icon: Shield,
      label: t.profile.security,
      tone: "pink" as Tone,
      onPress: () => router.push("/security"),
    },
  ];

  return (
    <TabScreen>
      <ResponsiveGrid>
        <View className="items-center mt-16 mb-10">
          <TouchableOpacity className="mb-5" onPress={pickImage} activeOpacity={0.8} disabled={isUploading}>
            <Avatar
              uri={user?.avatar}
              size={140}
              style={{
                borderWidth: 3,
                borderColor: theme.accent.purple,
                backgroundColor: theme.surface,
                opacity: isUploading ? 0.5 : 1,
              }}
            />
            {isUploading && (
              <View className="absolute inset-0 justify-center items-center">
                <Spinner size="small" color={theme.accent.purple} />
              </View>
            )}
          </TouchableOpacity>

          <Text variant="title" className="mb-1 text-center">
            {user?.name || "User"}
          </Text>
          {isEditingUsername ? (
            <View className="mb-4 items-center">
              <View className="flex-row items-center gap-2">
                <Text variant="body" color="secondary">
                  @
                </Text>
                <TextInput
                  ref={usernameInputRef}
                  className="text-base font-manrope px-3 py-1.5 rounded-xl min-w-[150px]"
                  style={{ color: theme.text, backgroundColor: theme.surface }}
                  value={usernameInput}
                  onChangeText={(text) => {
                    setUsernameInput(text.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                    setUsernameError("");
                  }}
                  onSubmitEditing={saveUsername}
                  onBlur={saveUsername}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={32}
                  editable={!isSavingUsername}
                />
                {isSavingUsername && <Spinner size="small" color={theme.accent.purple} />}
              </View>
              {usernameError ? (
                <Text variant="caption" className="mt-1" style={{ color: theme.accent.pink }}>
                  {usernameError}
                </Text>
              ) : null}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setUsernameInput(user?.username || "");
                setUsernameError("");
                setIsEditingUsername(true);
              }}
              className="mb-4"
            >
              <Text variant="body" color="secondary">
                {displayUsername}
              </Text>
            </TouchableOpacity>
          )}

          {home && <Badge label={isAdmin ? t.profile.homeAdmin : t.profile.member} />}

          {home?.inviteCode && (
            <Card
              size="sm"
              className="mt-4 items-center"
              onPress={async () => {
                await Clipboard.setStringAsync(home.inviteCode);
                alert(t.common.copied, t.profile.inviteCodeCopied);
              }}
            >
              <Text variant="micro" color="secondary" className="font-manrope-semibold tracking-wide mb-1">
                {t.profile.homeCode}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text variant="heading" className="tracking-widest">
                  {home.inviteCode}
                </Text>
                <Copy size={16} color={theme.textSecondary} />
              </View>
            </Card>
          )}
        </View>

        <View>
          <View className="gap-3 mb-8">
            {MENU_ITEMS.map((item) => (
              <ListItem
                key={item.label}
                icon={item.icon}
                iconTone={item.tone}
                title={item.label}
                onPress={item.onPress}
              />
            ))}
          </View>

          <Section title={t.profile.myHomes || "MY HOMES"}>
            {homes.length > 0 && (
              <View className="gap-2.5 mb-4">
                {homes.map((h) => {
                  const isCurrent = h.id === home?.id;
                  return (
                    <ListItem
                      key={h.id}
                      icon={HomeIcon}
                      iconTone="yellow"
                      title={h.name}
                      selected={isCurrent}
                      right={isCurrent ? <Check size={20} color={theme.onAccent} /> : undefined}
                      showChevron={false}
                      onPress={() => switchHome(h.id)}
                    />
                  );
                })}
              </View>
            )}

            <View className="flex-row gap-3">
              <Button
                title={t.profile.createHome}
                onPress={() => setShowCreateModal(true)}
                variant="yellow"
                className="flex-1"
                icon={<Plus size={18} color={theme.onAccent} />}
              />
              <Button
                title={t.profile.joinHome}
                onPress={() => setShowJoinModal(true)}
                variant="purple"
                className="flex-1"
                icon={<Plus size={18} color={theme.onAccent} />}
              />
            </View>
          </Section>

          {home && (
            <Button
              title={t.auth.leaveHome}
              onPress={leaveHome}
              variant="danger"
              icon={<LogOut size={20} color={theme.onDanger} />}
              className="mb-3"
            />
          )}

          <Button
            title={t.auth.logOut}
            onPress={handleLogout}
            variant="danger"
            icon={<LogOut size={20} color={theme.onDanger} />}
          />
        </View>
      </ResponsiveGrid>

      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t.profile.createHome}
        height="auto"
      >
        <Input
          label={t.profile.homeName}
          placeholder={t.profile.homeNamePlaceholder}
          value={homeName}
          onChangeText={setHomeName}
        />
        <Button
          title={t.profile.createHome}
          onPress={handleCreateHome}
          loading={isLoading}
          disabled={!homeName.trim() || isLoading}
          variant="yellow"
          className="mt-4"
        />
      </Modal>

      <Modal height="auto" visible={showJoinModal} onClose={() => setShowJoinModal(false)} title={t.profile.joinHome}>
        <Input
          label={t.profile.inviteCode}
          placeholder={t.profile.inviteCodePlaceholder}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />
        <Button
          title={t.profile.joinHome}
          onPress={handleJoinHome}
          loading={isLoading}
          disabled={!inviteCode.trim() || isLoading}
          variant="purple"
          className="mt-4"
        />
      </Modal>
    </TabScreen>
  );
}
