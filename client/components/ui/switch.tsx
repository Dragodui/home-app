import type { FC } from "react";
import { Switch as RNSwitch } from "react-native";
import { useTheme } from "@/stores/themeStore";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

const Switch: FC<SwitchProps> = ({ value, onValueChange, disabled = false }) => {
  const { theme } = useTheme();

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: theme.border, true: theme.accent.cyan }}
    />
  );
};

export default Switch;
