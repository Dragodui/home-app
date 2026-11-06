import { Eye, EyeOff } from "lucide-react-native";
import { type FC, useState } from "react";
import { TextInput, type TextInputProps, type TextStyle, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";
import { GlassSurface } from "./glass-surface.web";
import Text from "./text";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  focused?: boolean;
  className?: string;
}

const NO_OUTLINE = { outlineStyle: "none", outlineWidth: 0, boxShadow: "none" } as unknown as TextStyle;

/** Web version of Input, on glass. Same props as input.tsx. Keeps React Native's input for multiline and passwords. */
const Input: FC<InputProps> = ({ label, error, style, secureTextEntry, className, multiline, ...rest }) => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  const ringColor = error ? theme.status.error : isFocused ? theme.inputBorderFocused : undefined;

  return (
    <View className={`gap-2 mb-4 ${className || ""}`}>
      {label && (
        <Text variant="overline" className="ml-1">
          {label}
        </Text>
      )}
      <GlassSurface
        style={{
          borderRadius: multiline ? 24 : 28,
          minHeight: 56,
          justifyContent: "center",
          ...(ringColor ? { outline: `1.5px solid ${ringColor}`, outlineOffset: -1.5 } : null),
        }}
      >
        <TextInput
          className={`text-base font-manrope-medium px-6 ${isPassword ? "pr-14" : ""}`}
          style={[{ color: theme.inputText, minHeight: 56, backgroundColor: "transparent" }, NO_OUTLINE, style]}
          placeholderTextColor={theme.inputPlaceholder}
          secureTextEntry={isPassword && !showPassword}
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            className="absolute right-5 top-0 bottom-0 justify-center"
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={20} color={theme.textSecondary} />
            ) : (
              <Eye size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </GlassSurface>
      {error && (
        <Text variant="caption" color="danger" className="ml-1 font-manrope-medium">
          {error}
        </Text>
      )}
    </View>
  );
};

export default Input;
