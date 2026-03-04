import { createContext, type FC, type ReactNode, useCallback, useContext, useState } from "react";
import { Modal as RNModal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useTheme } from "@/stores/themeStore";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextValue {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within AlertProvider");
  return ctx;
}

export const AlertProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: "",
    message: undefined,
    buttons: [],
  });

  const close = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const alert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setState({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK" }],
    });
  }, []);

  const handlePress = (button: AlertButton) => {
    close();
    setTimeout(() => button.onPress?.(), 200);
  };

  const getButtonStyle = (style?: string, _index?: number, _total?: number) => {
    if (style === "destructive") {
      return {
        bg: theme.accent.pink,
        text: "#FFFFFF",
      };
    }
    if (style === "cancel") {
      return {
        bg: theme.background,
        text: theme.text,
      };
    }
    // default
    return {
      bg: theme.text,
      text: theme.background,
    };
  };

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      <RNModal visible={state.visible} animationType="fade" transparent statusBarTranslucent onRequestClose={close}>
        <TouchableWithoutFeedback onPress={close}>
          <View
            className="flex-1 justify-center items-center px-8"
            style={{
              backgroundColor: theme.isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.5)",
            }}
          >
            <TouchableWithoutFeedback>
              <View className="w-full rounded-3xl p-6" style={{ backgroundColor: theme.surface, maxWidth: 340 }}>
                <Text className="text-lg font-manrope-bold text-center mb-2" style={{ color: theme.text }}>
                  {state.title}
                </Text>

                {state.message && (
                  <Text className="text-sm font-manrope text-center mb-5" style={{ color: theme.textSecondary }}>
                    {state.message}
                  </Text>
                )}

                <View className={state.buttons.length <= 2 ? "flex-row gap-3" : "gap-2.5"}>
                  {state.buttons.map((btn, i) => {
                    const colors = getButtonStyle(btn.style, i, state.buttons.length);
                    return (
                      <TouchableOpacity
                        key={i}
                        className={`py-3.5 rounded-xl items-center justify-center ${
                          state.buttons.length <= 2 ? "flex-1" : ""
                        }`}
                        style={{ backgroundColor: colors.bg }}
                        onPress={() => handlePress(btn)}
                        activeOpacity={0.8}
                      >
                        <Text className="text-sm font-manrope-semibold" style={{ color: colors.text }}>
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </AlertContext.Provider>
  );
};
