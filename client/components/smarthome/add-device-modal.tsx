import type { FC, ReactNode } from "react";
import { View } from "react-native";
import { Button, Input, ListItem, Modal, Spinner, Text, TextLink } from "@/components/ui";
import type { HAState } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

interface AddDeviceModalProps {
  visible: boolean;
  onClose: () => void;
  description: string;
  discovering: boolean;
  discoveredDevices: HAState[];
  selectedEntity: string | null;
  onSelectEntity: (entityId: string | null, suggestedName: string) => void;
  deviceName: string;
  onDeviceNameChange: (name: string) => void;
  namePlaceholder: string;
  adding: boolean;
  onAdd: () => void;
  /** Extra fields between the name and the submit button, for example a room choice. */
  children?: ReactNode;
}

const AddDeviceModal: FC<AddDeviceModalProps> = ({
  visible,
  onClose,
  description,
  discovering,
  discoveredDevices,
  selectedEntity,
  onSelectEntity,
  deviceName,
  onDeviceNameChange,
  namePlaceholder,
  adding,
  onAdd,
  children,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Modal visible={visible} onClose={onClose} title={t.smartHome.addDevice}>
      {selectedEntity ? (
        <>
          <TextLink
            subtle
            title={t.smartHome.backToList}
            onPress={() => onSelectEntity(null, deviceName)}
            className="mb-4"
          />
          <Input
            label={t.smartHome.deviceNameLabel}
            value={deviceName}
            onChangeText={onDeviceNameChange}
            placeholder={namePlaceholder}
          />
          {children}
          <Text variant="bodySmall" color="secondary" className="mb-2">
            Entity: {selectedEntity}
          </Text>
          <Button title={t.common.add || "Add"} onPress={onAdd} loading={adding} />
        </>
      ) : (
        <>
          <Text variant="bodySmall" color="secondary" className="mb-4">
            {description}
          </Text>
          {discovering ? (
            <Spinner color={theme.accent.cyan} />
          ) : discoveredDevices.length === 0 ? (
            <Text variant="bodySmall" color="secondary" className="text-center py-5">
              {t.smartHome.noNewDevicesFound}
            </Text>
          ) : (
            <View className="gap-2.5">
              {discoveredDevices.map((item) => {
                const friendlyName = item.attributes.friendlyName || item.entityId;
                return (
                  <ListItem
                    key={item.entityId}
                    title={friendlyName}
                    subtitle={item.entityId}
                    onPress={() => onSelectEntity(item.entityId, friendlyName)}
                  />
                );
              })}
            </View>
          )}
        </>
      )}
    </Modal>
  );
};

export default AddDeviceModal;
