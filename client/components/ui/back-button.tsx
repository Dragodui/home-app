import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import type { FC } from "react";
import { useI18n } from "@/stores/i18nStore";
import IconButton from "./icon-button";

interface BackButtonProps {
  /** Defaults to router.back(). */
  onPress?: () => void;
  className?: string;
}

const BackButton: FC<BackButtonProps> = ({ onPress, className }) => {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <IconButton
      icon={ArrowLeft}
      onPress={onPress ?? (() => router.back())}
      accessibilityLabel={t.common.back}
      className={className}
    />
  );
};

export default BackButton;
