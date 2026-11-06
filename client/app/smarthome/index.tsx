import { useRouter } from "expo-router";
import { Plus, RefreshCw, Settings, Wifi, WifiOff } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import AddDeviceModal from "@/components/smarthome/add-device-modal";
import DeviceRow from "@/components/smarthome/device-row";
import {
  Banner,
  Button,
  ChipSelect,
  EmptyState,
  Fab,
  IconButton,
  Input,
  Modal,
  ResponsiveGrid,
  Screen,
  ScreenHeader,
  Section,
  Spinner,
  Text,
  useAlert,
} from "@/components/ui";
import { type HAState, type SmartDevice, smarthomeApi } from "@/lib/api";
import { useHome } from "@/stores/homeStore";
import { interpolate, useI18n } from "@/stores/i18nStore";

export default function SmartHomeDashboard() {
  const router = useRouter();
  const { home, isAdmin, rooms } = useHome();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [deviceStates, setDeviceStates] = useState<Record<string, HAState>>({});
  const [loading, setLoading] = useState(true);
  const [haStatus, setHaStatus] = useState<{ connected: boolean; url?: string } | null>(null);

  // Add/Discover Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<HAState[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);
  const [addingDevice, setAddingDevice] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<SmartDevice | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoomId, setEditRoomId] = useState<number | undefined>(undefined);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchDevicesAndStatus = useCallback(async () => {
    if (!home) return;
    setLoading(true);
    try {
      // Fetch status separately to handle "not found" (no config) gracefully
      let status = { connected: false };
      try {
        status = await smarthomeApi.getStatus(home.id);
      } catch (_) {}
      setHaStatus(status);

      // Fetch devices and states only if we might be connected, or just try anyway but handle errors
      try {
        const [devicesData, statesData] = await Promise.all([
          smarthomeApi.getDevices(home.id),
          smarthomeApi.getAllStates(home.id),
        ]);
        setDevices(devicesData);
        const stateMap: Record<string, HAState> = {};
        statesData.forEach((s) => (stateMap[s.entityId] = s));
        setDeviceStates(stateMap);
      } catch (_err) {
        console.error("Failed to fetch devices/states (likely not connected)");
        setDevices([]);
      }
    } catch (error) {
      console.error("Failed to load smart home data:", error);
    } finally {
      setLoading(false);
    }
  }, [home]);

  useEffect(() => {
    fetchDevicesAndStatus();
  }, [fetchDevicesAndStatus]);

  const handleDiscover = async () => {
    if (!home) return;
    setDiscovering(true);
    try {
      const results = await smarthomeApi.discover(home.id);
      // Filter out already added devices
      const addedEntityIds = new Set(devices.map((d) => d.entityId));
      const newDevices = results.filter((d) => !addedEntityIds.has(d.entityId));
      setDiscoveredDevices(newDevices);
    } catch (error) {
      console.error("Failed to discover devices", error);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddDevice = async () => {
    if (!home || !selectedEntity || !newDeviceName.trim()) return;

    setAddingDevice(true);
    try {
      await smarthomeApi.addDevice(home.id, {
        entityId: selectedEntity,
        name: newDeviceName.trim(),
        roomId: selectedRoomId,
      });
      setShowAddModal(false);
      setNewDeviceName("");
      setSelectedEntity(null);
      setSelectedRoomId(undefined);
      fetchDevicesAndStatus();
    } catch (err: any) {
      alert(t.common.error, err.response?.data?.error || t.smartHome.failedToAddDevice);
    } finally {
      setAddingDevice(false);
    }
  };

  const handleUpdateDevice = async () => {
    if (!home || !editingDevice || !editName.trim()) return;

    setSavingEdit(true);
    try {
      await smarthomeApi.updateDevice(home.id, editingDevice.id, {
        name: editName.trim(),
        roomId: editRoomId,
      });
      setShowEditModal(false);
      setEditingDevice(null);
      fetchDevicesAndStatus();
    } catch (_error) {
      alert(t.common.error, t.smartHome.failedToUpdateDevice);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteDevice = (deviceId: number, deviceName: string) => {
    if (!home) return;
    alert(t.smartHome.deleteDeviceTitle, interpolate(t.smartHome.deleteDeviceConfirm, { name: deviceName }), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await smarthomeApi.deleteDevice(home.id, deviceId);
            fetchDevicesAndStatus();
          } catch (_error) {
            alert(t.common.error, t.smartHome.failedToDeleteDevice);
          }
        },
      },
    ]);
  };

  const handleControl = async (device: SmartDevice, state: boolean) => {
    if (!home) return;
    const service = state ? "turn_on" : "turn_off";

    // Optimistic update
    const newState = { ...deviceStates[device.entityId], state: state ? "on" : "off" };
    setDeviceStates((prev) => ({ ...prev, [device.entityId]: newState }));

    try {
      await smarthomeApi.controlDevice(home.id, device.id, service);
    } catch (error) {
      console.error("Control failed", error);
      fetchDevicesAndStatus(); // Revert on fail
    }
  };

  const openAddDevice = () => {
    setShowAddModal(true);
    handleDiscover();
  };

  const roomOptions = [
    { value: undefined as number | undefined, label: t.common.none },
    ...rooms.map((room) => ({ value: room.id as number | undefined, label: room.name })),
  ];

  if (loading && !devices.length) {
    return (
      <Screen>
        <Spinner fill />
      </Screen>
    );
  }

  return (
    <Screen
      bottomPadding={isAdmin ? 100 : undefined}
      overlay={
        isAdmin ? <Fab icon={Plus} onPress={openAddDevice} accessibilityLabel={t.smartHome.addDevice} /> : undefined
      }
    >
      <ScreenHeader title={t.smartHome.title} />

      {haStatus && (
        <Banner
          icon={haStatus.connected ? Wifi : WifiOff}
          tone={haStatus.connected ? "cyan" : "danger"}
          title={haStatus.connected ? t.smartHome.connectedStatus : t.smartHome.disconnectedStatus}
          description={haStatus.url}
          action={
            isAdmin ? <IconButton icon={Settings} size="sm" onPress={() => router.push("/settings")} /> : undefined
          }
          className="mb-6"
        />
      )}

      <Section
        title={t.smartHome.allDevices}
        titleVariant="heading"
        action={<IconButton icon={RefreshCw} size="sm" loading={loading} onPress={fetchDevicesAndStatus} />}
      >
        {devices.length === 0 ? (
          <EmptyState
            icon={WifiOff}
            title={t.smartHome.noDevicesYet}
            action={
              isAdmin ? (
                !haStatus?.connected ? (
                  <Button title={t.smartHome.connectHomeAssistant} onPress={() => router.push("/settings")} />
                ) : (
                  <Button title={t.smartHome.addDevice} onPress={openAddDevice} />
                )
              ) : undefined
            }
          />
        ) : (
          <ResponsiveGrid>
            {devices.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                state={deviceStates[device.entityId]}
                roomName={rooms.find((room) => room.id === device.roomId)?.name || t.smartHome.noRoomAssigned}
                onToggle={(value) => handleControl(device, value)}
                onEdit={
                  isAdmin
                    ? () => {
                        setEditingDevice(device);
                        setEditName(device.name);
                        setEditRoomId(device.roomId);
                        setShowEditModal(true);
                      }
                    : undefined
                }
                onDelete={isAdmin ? () => handleDeleteDevice(device.id, device.name) : undefined}
              />
            ))}
          </ResponsiveGrid>
        )}
      </Section>

      <AddDeviceModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        description={t.smartHome.selectDeviceToAdd}
        discovering={discovering}
        discoveredDevices={discoveredDevices}
        selectedEntity={selectedEntity}
        onSelectEntity={(entityId, suggestedName) => {
          setSelectedEntity(entityId);
          setNewDeviceName(suggestedName);
        }}
        deviceName={newDeviceName}
        onDeviceNameChange={setNewDeviceName}
        namePlaceholder={t.smartHome.deviceNamePlaceholder}
        adding={addingDevice}
        onAdd={handleAddDevice}
      >
        <Text variant="overline" className="ml-1 mb-2">
          {t.smartHome.assignRoomOptional}
        </Text>
        <ChipSelect options={roomOptions} value={selectedRoomId} onChange={setSelectedRoomId} className="mb-6" />
      </AddDeviceModal>

      <Modal visible={showEditModal} onClose={() => setShowEditModal(false)} title={t.smartHome.editDevice}>
        <View>
          <Input label={t.smartHome.deviceNameLabel} value={editName} onChangeText={setEditName} />
          <Text variant="overline" className="ml-1 mb-2">
            {t.smartHome.roomLabel}
          </Text>
          <ChipSelect options={roomOptions} value={editRoomId} onChange={setEditRoomId} className="mb-6" />
          <Button title={t.common.save || "Save"} onPress={handleUpdateDevice} loading={savingEdit} />
        </View>
      </Modal>
    </Screen>
  );
}
