import { createContext, type FC, type ReactNode, useCallback, useContext, useState } from "react";
import { Modal as RNModal, TouchableWithoutFeedback, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import Button from "./button";
import { frostStyle } from "./surface";
import Text from "./text";

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

  const BUTTON_VARIANTS = { destructive: "danger", cancel: "secondary", default: "primary" } as const;

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
              <View
                className="w-full rounded-3xl p-6"
                style={[{ backgroundColor: theme.sheetBackground, maxWidth: 340 }, frostStyle]}
              >
                <Text variant="heading" className="text-center mb-2">
                  {state.title}
                </Text>

                {state.message && (
                  <Text variant="bodySmall" color="secondary" className="text-center mb-5">
                    {state.message}
                  </Text>
                )}

                <View className={state.buttons.length <= 2 ? "flex-row gap-3" : "gap-2.5"}>
                  {state.buttons.map((btn) => (
                    <Button
                      key={btn.text}
                      title={btn.text}
                      size="md"
                      variant={BUTTON_VARIANTS[btn.style ?? "default"]}
                      className={state.buttons.length <= 2 ? "flex-1" : undefined}
                      onPress={() => handlePress(btn)}
                    />
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </AlertContext.Provider>
  );
};
