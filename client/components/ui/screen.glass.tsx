import { type FC, type ReactNode, useEffect } from "react";
import { KeyboardAvoidingView, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useTheme } from "@/stores/themeStore";

type ScreenWidth = "sm" | "md" | "lg";

interface ScreenProps {
  children: ReactNode;
  width?: ScreenWidth;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottomPadding?: number;
  overlay?: ReactNode;
}

const FIXED_WIDTHS = { sm: 640, md: 960 };

/** Web version of Screen: keeps the data-theme of glisse in sync with the app. */
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

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.isDark ? "dark" : "light";
    // glisse colors its "on" states with iOS green and blue. The prototype is black and white.
    root.style.setProperty("--lg-on", theme.text);
    root.style.setProperty("--lg-fill", theme.text);
    root.style.setProperty("--lg-segment-thumb", theme.text);
    root.style.setProperty("--lg-selection", theme.isDark ? "rgb(255 255 255 / 0.22)" : "rgb(0 0 0 / 0.1)");
  }, [theme.isDark, theme.text]);

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
      behavior="height"
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
