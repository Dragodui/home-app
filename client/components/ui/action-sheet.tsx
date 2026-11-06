import type { FC } from "react";
import { View } from "react-native";
import Button from "./button";
import Modal from "./modal";

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
  cancelLabel: string;
}

/** Closes itself before running the chosen action, so the action can open another modal. */
const ActionSheet: FC<ActionSheetProps> = ({ visible, onClose, title, actions, cancelLabel }) => (
  <Modal visible={visible} onClose={onClose} title={title} height="auto">
    <View className="gap-3">
      {actions.map(({ label, onPress, destructive }) => (
        <Button
          key={label}
          title={label}
          size="md"
          variant={destructive ? "danger" : "secondary"}
          onPress={() => {
            onClose();
            onPress();
          }}
        />
      ))}
      <Button title={cancelLabel} size="md" variant="secondary" onPress={onClose} />
    </View>
  </Modal>
);

export default ActionSheet;
