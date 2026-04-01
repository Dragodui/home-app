import { X } from "lucide-react-native";
import type { FC, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/stores/themeStore";

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

  const getHeightStyle = () => {
    if (height === "full") {
      return { height: "95%" as const };
    }
    if (height === "auto") {
      return { maxHeight: "85%" as const };
    }
    return { height: `${height}%` as const };
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: theme.isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
          }}
        />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
        <View
          className="rounded-t-40 pt-8 px-6"
          style={[
            getHeightStyle(),
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: theme.surface,
            },
          ]}
        >
          <View className="flex-row justify-between items-center mb-6">
            {title && (
              <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>
                {title}
              </Text>
            )}
            <TouchableOpacity
              className="w-12 h-12 rounded-24 justify-center items-center"
              style={{ backgroundColor: theme.background }}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

export default Modal;
