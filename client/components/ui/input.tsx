import { Eye, EyeOff } from "lucide-react-native";
import { type FC, useState } from "react";
import { Platform, Text, TextInput, type TextInputProps, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/stores/themeStore";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  focused?: boolean;
  className?: string;
}

const Input: FC<InputProps> = ({ label, error, style, secureTextEntry, className, ...rest }) => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = secureTextEntry !== undefined;
  const webInputResetStyle =
    Platform.OS === "web"
      ? ({
          outlineStyle: "none",
          outlineWidth: 0,
          boxShadow: "none",
        } as const)
      : null;

  const getInputBorderStyle = () => {
    if (error) {
      return { borderColor: theme.status.error, borderWidth: 2 };
    }
    if (isFocused) {
      return { borderColor: theme.inputBorderFocused, borderWidth: 2 };
    }
    return { borderWidth: 0 };
  };

  return (
    <View className={`gap-2 mb-4 ${className || ""}`}>
      {label && (
        <Text
          className="text-xs font-manrope-bold uppercase tracking-widest ml-1"
          style={{ color: theme.textSecondary }}
        >
          {label}
        </Text>
      )}
      <View className="relative">
        <TextInput
          className={`h-16 rounded-20 px-6 text-base font-manrope-medium ${isPassword ? "pr-14" : ""}`}
          style={[
            {
              backgroundColor: theme.inputBackground,
              color: theme.inputText,
            },
            webInputResetStyle,
            getInputBorderStyle(),
            style,
          ]}
          placeholderTextColor={theme.inputPlaceholder}
          secureTextEntry={isPassword && !showPassword}
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
      </View>
      {error && (
        <Text className="text-xs ml-1 font-manrope-medium" style={{ color: theme.status.error }}>
          {error}
        </Text>
      )}
    </View>
  );
};

export default Input;
