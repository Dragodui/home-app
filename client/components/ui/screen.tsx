import type { FC, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useTheme } from "@/stores/themeStore";

type ScreenWidth = "sm" | "md" | "lg";

interface ScreenProps {
  children: ReactNode;
  /** sm 640 for forms, md 960 for single-column pages, lg for wide content. */
  width?: ScreenWidth;
  /** Turn off for screens that own their list and bottom padding, such as a chat. */
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Space below the content, above the safe area. Raise it above a tab bar or Fab. */
  bottomPadding?: number;
  /** Rendered over the content and not scrolled with it, for example a Fab. */
  overlay?: ReactNode;
}

const FIXED_WIDTHS = { sm: 640, md: 960 };

const Screen: FC<ScreenProps> = ({
  children,
  width = "lg",
  scroll = true,
  keyboardAvoiding = false,
  refreshing = false,
  onRefresh,
  bottomPadding = 40,
  overlay,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsiveLayout();

  const frameStyle = {
    width: "100%" as const,
    maxWidth: width === "lg" ? contentMaxWidth : FIXED_WIDTHS[width],
    alignSelf: "center" as const,
    paddingHorizontal: horizontalPadding,
    paddingTop: insets.top + 16,
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      enabled={keyboardAvoiding}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={[frameStyle, { flexGrow: 1, paddingBottom: insets.bottom + bottomPadding }]}
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
      ) : (
        <View style={[frameStyle, { flex: 1 }]}>{children}</View>
      )}
      {overlay}
    </KeyboardAvoidingView>
  );
};

export default Screen;
