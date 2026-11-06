import type { FC, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useTheme } from "@/stores/themeStore";

type ScreenWidth = "sm" | "md" | "lg";

interface ScreenProps {
  children: ReactNode;
  /** sm 640 for forms, md 960 for single-column pages, lg for wide content. */
  width?: ScreenWidth;
  keyboardAvoiding?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const FIXED_WIDTHS = { sm: 640, md: 960 };

const Screen: FC<ScreenProps> = ({
  children,
  width = "lg",
  keyboardAvoiding = false,
  refreshing = false,
  onRefresh,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsiveLayout();

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      enabled={keyboardAvoiding}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          width: "100%",
          maxWidth: width === "lg" ? contentMaxWidth : FIXED_WIDTHS[width],
          alignSelf: "center",
          paddingHorizontal: horizontalPadding,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Screen;
