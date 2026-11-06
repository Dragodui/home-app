import type { FC } from "react";

interface ColorPickerProps {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

/** The black and white prototype shows no color, so there is nothing to pick. Stored colors are kept. */
const ColorPicker: FC<ColorPickerProps> = () => null;

export default ColorPicker;
