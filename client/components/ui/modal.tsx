import { X } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "@/lib/useResponsiveLayout";
import { useTheme } from "@/stores/themeStore";
import IconButton from "./icon-button";
import { ModalSurfaceProvider } from "./surface";
import Text from "./text";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: "auto" | "full" | number;
}

const Modal: FC<ModalProps> = ({ visible, onClose, title, children, height = "full" }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { isDesktop } = useResponsiveLayout();

  const getHeightStyle = () => {
    if (isDesktop) {
      if (height === "full") {
        return { maxHeight: "88%" as const };
      }
      if (height === "auto") {
        return { maxHeight: "85%" as const };
      }
      return { height: `${height}%` as const, maxHeight: "88%" as const };
    }

    if (height === "full") {
      return { height: "95%" as const };
    }
    if (height === "auto") {
      return { maxHeight: "85%" as const };
    }
    return { height: `${height}%` as const };
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: theme.isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
          }}
        />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className={`flex-1 ${isDesktop ? "justify-center items-center px-5" : "justify-end"}`}
      >
        <View
          className={isDesktop ? "rounded-40 pt-8 px-6" : "rounded-t-40 pt-8 px-6"}
          style={[
            getHeightStyle(),
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: theme.surface,
              width: "100%",
              maxWidth: isDesktop ? 760 : undefined,
              alignSelf: isDesktop ? "center" : undefined,
              marginHorizontal: isDesktop ? 20 : undefined,
            },
          ]}
        >
          <View className="flex-row items-center gap-3 mb-6">
            <View className="flex-1">{title && <Text variant="title">{title}</Text>}</View>
            <IconButton icon={X} onPress={onClose} style={{ backgroundColor: theme.background }} />
          </View>

          <ScrollView
            // A flex-1 child collapses to zero height inside a parent that only has maxHeight.
            style={height === "auto" ? { flexGrow: 0, flexShrink: 1 } : { flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ModalSurfaceProvider value>{children}</ModalSurfaceProvider>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

export default Modal;
