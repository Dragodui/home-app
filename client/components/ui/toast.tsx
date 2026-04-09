import { createContext, type FC, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/stores/themeStore";

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

interface ToastState extends ToastOptions {
  visible: boolean;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    title: "",
    message: "",
    duration: 3000,
  });

  const show = useCallback(({ title, message, duration = 3000 }: ToastOptions) => {
    setToast({ visible: true, title, message, duration });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, duration);
  }, []);

  const contextValue = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast.visible && (
        <View className="absolute top-14 left-4 right-4 z-[100] rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
          <Text className="text-sm font-manrope-bold" style={{ color: theme.text }}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text className="mt-1 text-sm font-manrope" style={{ color: theme.textSecondary }}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      )}
    </ToastContext.Provider>
  );
};
