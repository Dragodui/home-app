import type { FC } from "react";
import { View } from "react-native";
import Button from "./button";
import Modal from "./modal";
import Text from "./text";

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
}

const ConfirmModal: FC<ConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
}) => (
  <Modal visible={visible} onClose={onClose} title={title} height="auto">
    <Text variant="body" color="secondary" className="mb-6">
      {message}
    </Text>
    <View className="flex-row gap-3">
      <Button title={cancelLabel} onPress={onClose} variant="secondary" className="flex-1" />
      <Button
        title={confirmLabel}
        onPress={onConfirm}
        variant={destructive ? "danger" : "primary"}
        loading={loading}
        className="flex-1"
      />
    </View>
  </Modal>
);

export default ConfirmModal;
