import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  LogOut,
  Home as HomeIcon,
  Settings,
  Bell,
  Shield,
  ChevronRight,
  User,
  Users,
  Sun,
  Moon,
  Copy,
  Globe,
  Zap,
  Check,
  Plus,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useHome } from "@/contexts/HomeContext";
import { useTheme } from "@/contexts/ThemeContext";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";

import * as ImagePicker from "expo-image-picker";
import { imageApi } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { home, homes, isAdmin, createHome, joinHome, leaveHome, switchHome } = useHome();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage, languageNames, availableLanguages } = useI18n();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [homeName, setHomeName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      // @ts-ignore - React Native FormData expects specific format
      formData.append("image", {
        uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      });

      const response = await imageApi.upload(formData);
      if (response.url) {
        await updateUser({ avatar: response.url });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t.auth.logOut, t.auth.logOutConfirm, [
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
      Alert.alert("Error", result.error || "Failed to create home");
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
    } else {
      Alert.alert("Error", result.error || "Failed to join home");
    }
  };

  const getUsername = () => {
    if (user?.name) {
      const names = user.name.split(" ");
      return `@${names[0].toLowerCase()}_${names[names.length - 1]?.toLowerCase() || "user"}`;
    }
    return "@user";
  };

  const MENU_ITEMS = [
    {
      icon: HomeIcon,
      label: t.profile.homeSettings,
      color: theme.accent.yellow,
      onPress: () => router.push("/rooms"),
    },
    ...(isAdmin
      ? [
          {
            icon: Users,
            label: t.members.title,
            color: theme.accent.mint,
            onPress: () => router.push("/members"),
          },
        ]
      : []),
    {
      icon: Zap,
      label: "Smart Home",
      color: theme.accent.cyan,
      onPress: () => router.push("/smarthome"),
    },
    {
      icon: Settings,
      label: t.profile.settings,
      color: theme.accent.purple,
      onPress: () => router.push("/settings"),
    },
    {
      icon: Bell,
      label: t.profile.notifications,
      color: theme.accent.cyan,
      onPress: () => router.push("/notifications"),
    },
    {
      icon: Shield,
      label: t.profile.security,
      color: theme.accent.pink,
      onPress: () => router.push("/security"),
    },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: insets.top + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <View className="items-center mb-10">
          <TouchableOpacity
            className="w-[140px] h-[140px] rounded-full border-[3px] overflow-hidden mb-5"
            style={{ borderColor: theme.accent.purple }}
            onPress={pickImage}
            activeOpacity={0.8}
            disabled={isUploading}
          >
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                className="w-full h-full"
                style={isUploading ? { opacity: 0.5 } : undefined}
              />
            ) : (
              <View
                className="w-full h-full justify-center items-center"
                style={{ backgroundColor: theme.surface }}
              >
                <User size={64} color={theme.textSecondary} />
              </View>
            )}
            {isUploading && (
              <View className="absolute inset-0 justify-center items-center">
                <ActivityIndicator size="small" color={theme.accent.purple} />
              </View>
            )}
          </TouchableOpacity>

          <Text
            className="text-[28px] font-manrope-bold mb-1"
            style={{ color: theme.text }}
          >
            {user?.name || "User"}
          </Text>
          <Text
            className="text-[16px] font-manrope mb-4"
            style={{ color: theme.textSecondary }}
          >
            {getUsername()}
          </Text>

          {home && (
            <View
              className="px-4 py-2 rounded-xl"
              style={{ backgroundColor: theme.surface }}
            >
              <Text
                className="text-[13px] font-manrope-semibold"
                style={{ color: theme.textSecondary }}
              >
                {isAdmin ? t.profile.homeAdmin : t.profile.member}
              </Text>
            </View>
          )}

          {home && home.invite_code && (
            <TouchableOpacity
              className="mt-4 px-5 py-3.5 rounded-2xl items-center"
              style={{ backgroundColor: theme.surface }}
              onPress={async () => {
                await Clipboard.setStringAsync(home.invite_code);
                Alert.alert(t.common.copied, t.profile.inviteCodeCopied);
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-[11px] font-manrope-semibold tracking-wide mb-1"
                style={{ color: theme.textSecondary }}
              >
                {t.profile.homeCode}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-[18px] font-manrope-bold tracking-widest"
                  style={{ color: theme.text }}
                >
                  {home.invite_code}
                </Text>
                <Copy size={16} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Items */}
        <View className="gap-3 mb-8">
          {MENU_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                className="flex-row items-center p-4 rounded-[20px] gap-3.5"
                style={{ backgroundColor: theme.surface }}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View
                  className="w-11 h-11 rounded-[14px] justify-center items-center"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon size={22} color="#1C1C1E" />
                </View>
                <Text
                  className="flex-1 text-[16px] font-manrope-semibold"
                  style={{ color: theme.text }}
                >
                  {item.label}
                </Text>
                <ChevronRight size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Theme Toggle */}
        <View className="mb-8">
          <Text
            className="text-[12px] font-manrope-bold tracking-widest mb-3 ml-1"
            style={{ color: theme.textSecondary }}
          >
            {t.profile.theme}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl"
              style={{
                backgroundColor: themeMode === "light" ? theme.accent.yellow : theme.surface,
              }}
              onPress={() => setThemeMode("light")}
            >
              <Sun size={20} color={themeMode === "light" ? "#1C1C1E" : theme.textSecondary} />
              <Text
                className="text-[14px] font-manrope-semibold"
                style={{ color: themeMode === "light" ? "#1C1C1E" : theme.textSecondary }}
              >
                {t.profile.light}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-2xl"
              style={{
                backgroundColor: themeMode === "dark" ? theme.accent.purple : theme.surface,
              }}
              onPress={() => setThemeMode("dark")}
            >
              <Moon size={20} color={themeMode === "dark" ? "#1C1C1E" : theme.textSecondary} />
              <Text
                className="text-[14px] font-manrope-semibold"
                style={{ color: themeMode === "dark" ? "#1C1C1E" : theme.textSecondary }}
              >
                {t.profile.dark}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Selector */}
        <View className="mb-8">
          <Text
            className="text-[12px] font-manrope-bold tracking-widest mb-3 ml-1"
            style={{ color: theme.textSecondary }}
          >
            <Globe size={12} color={theme.textSecondary} /> LANGUAGE
          </Text>
          <TouchableOpacity
            className="flex-row items-center justify-between p-4 rounded-2xl"
            style={{ backgroundColor: theme.surface }}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <Text
                className="text-[16px] font-manrope-semibold"
                style={{ color: theme.text }}
              >
                {languageNames[language]}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* My Homes */}
        <View className="mb-8">
          <Text
            className="text-[12px] font-manrope-bold tracking-widest mb-3 ml-1"
            style={{ color: theme.textSecondary }}
          >
            {t.profile.myHomes || "MY HOMES"}
          </Text>

          {homes.length > 0 && (
            <View className="gap-2.5 mb-4">
              {homes.map((h) => {
                const isCurrent = h.id === home?.id;
                return (
                  <TouchableOpacity
                    key={h.id}
                    className="flex-row items-center p-4 rounded-[20px] gap-3.5"
                    style={{
                      backgroundColor: isCurrent ? theme.accent.purple : theme.surface,
                    }}
                    onPress={() => switchHome(h.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      className="w-11 h-11 rounded-[14px] justify-center items-center"
                      style={{
                        backgroundColor: isCurrent ? "rgba(0,0,0,0.15)" : theme.accent.yellow,
                      }}
                    >
                      <HomeIcon size={22} color={isCurrent ? "#FFFFFF" : "#1C1C1E"} />
                    </View>
                    <Text
                      className="flex-1 text-[16px] font-manrope-semibold"
                      style={{ color: isCurrent ? "#1C1C1E" : theme.text }}
                    >
                      {h.name}
                    </Text>
                    {isCurrent && <Check size={20} color="#1C1C1E" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View className="flex-row gap-3">
            <Button
              title={t.profile.createHome}
              onPress={() => setShowCreateModal(true)}
              variant="yellow"
              style={{ flex: 1 }}
              icon={<Plus size={18} color="#1C1C1E" />}
            />
            <Button
              title={t.profile.joinHome}
              onPress={() => setShowJoinModal(true)}
              variant="purple"
              style={{ flex: 1 }}
              icon={<Plus size={18} color="#1C1C1E" />}
            />
          </View>
        </View>

        {/* Leave Home Button */}
        {home && (
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2.5 mb-3 py-[18px] rounded-[20px]"
            style={{ backgroundColor: theme.accent.dangerLight }}
            onPress={leaveHome}
            activeOpacity={0.8}
          >
            <Text className="text-[16px] font-manrope-bold text-white">
              {t.auth.leaveHome}
            </Text>
            <LogOut size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2.5 py-[18px] rounded-[20px]"
          style={{ backgroundColor: theme.accent.dangerLight }}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text className="text-[16px] font-manrope-bold text-white">
            {t.auth.logOut}
          </Text>
          <LogOut size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Create Home Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t.profile.createHome}
        height="full"
      >
        <View className="flex-1">
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
            style={{ marginTop: "auto" }}
          />
        </View>
      </Modal>

      {/* Join Home Modal */}
      <Modal height="full" visible={showJoinModal} onClose={() => setShowJoinModal(false)} title={t.profile.joinHome}>
        <View className="flex-1">
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
            style={{ marginTop: "auto" }}
          />
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        title="Select Language"
        height="full"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {availableLanguages.map((lang) => (
            <TouchableOpacity
              key={lang}
              className="flex-row items-center p-[18px] rounded-2xl mb-2.5"
              style={{
                backgroundColor: language === lang ? theme.accent.purple : theme.surface,
              }}
              onPress={() => {
                setLanguage(lang);
                setShowLanguageModal(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                className="flex-1 text-[17px] font-manrope-semibold"
                style={{ color: language === lang ? "#1C1C1E" : theme.text }}
              >
                {languageNames[lang]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
}
