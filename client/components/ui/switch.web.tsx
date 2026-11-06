import { Switch as GlassSwitch } from "glisse";
import type { FC } from "react";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Web version of Switch, on Liquid Glass. Same props as switch.tsx. */
const Switch: FC<SwitchProps> = ({ value, onValueChange, disabled = false }) => (
  <GlassSwitch checked={value} onCheckedChange={onValueChange} disabled={disabled} />
);

export default Switch;
