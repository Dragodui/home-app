import { Fan, Lightbulb, type LucideIcon, Pencil, Power, Trash2, Tv } from "lucide-react-native";
import type { FC } from "react";
import { View } from "react-native";
import { Card, IconButton, Switch, Text } from "@/components/ui";
import type { HAState, SmartDevice } from "@/lib/types";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

const DEVICE_ICONS: Record<string, LucideIcon> = {
  light: Lightbulb,
  switch: Power,
  fan: Fan,
  media_player: Tv,
};

interface DeviceRowProps {
  device: SmartDevice;
  state?: HAState;
  roomName?: string;
  onToggle: (value: boolean) => void;
  /** Admin actions go on their own row, so the name keeps its width on a phone. */
  onEdit?: () => void;
  onDelete?: () => void;
}

const DeviceRow: FC<DeviceRowProps> = ({ device, state, roomName, onToggle, onEdit, onDelete }) => {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isOn = state?.state === "on";
  const isOffline = state?.state === "unavailable" || state?.state === "unknown";
  const DeviceIcon = DEVICE_ICONS[device.type] ?? Power;
  const stateLabel = state?.state || t.smartHome.unknownState;

  return (
    <Card size="sm">
      <View className="flex-row items-center gap-3.5">
        <View className="w-10 h-10 justify-center items-center bg-black/5 rounded-xl">
          <DeviceIcon size={24} color={isOn ? theme.accent.yellow : theme.text} />
        </View>
        <View className="flex-1">
          <Text variant="subtitle" numberOfLines={1}>
            {device.name}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {roomName ? `${stateLabel} · ${roomName}` : stateLabel}
          </Text>
        </View>
        <Switch value={isOn} onValueChange={onToggle} disabled={isOffline} />
      </View>

      {(onEdit || onDelete) && (
        <View className="flex-row justify-end gap-2 mt-3">
          {onEdit && (
            <IconButton
              icon={Pencil}
              size="sm"
              onPress={onEdit}
              accessibilityLabel={t.common.edit}
              style={{ backgroundColor: theme.background }}
            />
          )}
          {onDelete && (
            <IconButton icon={Trash2} size="sm" tone="danger" onPress={onDelete} accessibilityLabel={t.common.delete} />
          )}
        </View>
      )}
    </Card>
  );
};

export default DeviceRow;
