import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Fan, Lightbulb, Plus, Power, Trash2, Tv } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "@/components/ui/alert";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { type HAState, type SmartDevice, smarthomeApi } from "@/lib/api";
import { useHome } from "@/stores/homeStore";
import { useI18n } from "@/stores/i18nStore";
import { useTheme } from "@/stores/themeStore";

export default function RoomDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { home, isAdmin } = useHome();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { alert } = useAlert();

  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [deviceStates, setDeviceStates] = useState<Record<string, HAState>>({});
  const [loading, setLoading] = useState(true);

  // Add Device Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<HAState[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [addingDevice, setAddingDevice] = useState(false);

  const roomId = parseInt(id, 10);

  const fetchDevices = useCallback(async () => {
    if (!home) return;
    try {
      const result = await smarthomeApi.getDevicesByRoom(home.id, roomId);
      setDevices(result);

      // Also fetch current states
      const states = await smarthomeApi.getAllStates(home.id);
      const stateMap: Record<string, HAState> = {};
      states.forEach((s) => (stateMap[s.entityId] = s));
      setDeviceStates(stateMap);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  }, [home, roomId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleDiscover = async () => {
    if (!home) return;
    setDiscovering(true);
    try {
      const results = await smarthomeApi.discover(home.id);
      setDiscoveredDevices(results);
    } catch (_error) {
      alert(t.common.error, "Failed to discover devices");
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddDevice = async () => {
    if (!home || !selectedEntity || !deviceName.trim()) return;

    setAddingDevice(true);
    try {
      await smarthomeApi.addDevice(home.id, {
        entityId: selectedEntity,
        name: deviceName.trim(),
        roomId: roomId,
      });
      setShowAddModal(false);
      setDeviceName("");
      setSelectedEntity(null);
      fetchDevices();
    } catch (err: any) {
      alert(t.common.error, err.response?.data?.error || "Failed to add device");
    } finally {
      setAddingDevice(false);
    }
  };

  const handleDeleteDevice = (deviceId: number, deviceName: string) => {
    if (!home) return;
    alert("Delete Device", `Are you sure you want to remove ${deviceName}?`, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await smarthomeApi.deleteDevice(home.id, deviceId);
            fetchDevices();
          } catch (_error) {
            alert(t.common.error, "Failed to delete device");
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
      fetchDevices();
    }
  };

  const getIcon = (type: string, size = 24, color = "black") => {
    switch (type) {
      case "light":
        return <Lightbulb size={size} color={color} />;
      case "switch":
        return <Power size={size} color={color} />;
      case "fan":
        return <Fan size={size} color={color} />;
      case "media_player":
        return <Tv size={size} color={color} />;
      default:
        return <Power size={size} color={color} />;
    }
  };

  const renderDevice = ({ item }: { item: SmartDevice }) => {
    const state = deviceStates[item.entityId];
    const isOn = state?.state === "on";
    const isOffline = state?.state === "unavailable" || state?.state === "unknown";

    return (
      <View className="flex-row items-center p-4 rounded-20 mb-3" style={{ backgroundColor: theme.surface }}>
        <View className="w-10 h-10 justify-center items-center bg-black/5 rounded-12 mr-4">
          {getIcon(item.type, 24, isOn ? theme.accent.yellow : theme.text)}
        </View>
        <View className="flex-1">
          <Text className="text-base font-manrope-bold" style={{ color: theme.text }}>
            {item.name}
          </Text>
          <Text className="text-xs font-manrope" style={{ color: theme.textSecondary }}>
            {state?.state || "Unknown"}
          </Text>
        </View>

        <Switch
          value={isOn}
          onValueChange={(val) => handleControl(item, val)}
          disabled={isOffline}
          trackColor={{ false: theme.border, true: theme.accent.cyan }}
        />

        {isAdmin && (
          <TouchableOpacity className="ml-3 p-2" onPress={() => handleDeleteDevice(item.id, item.name)}>
            <Trash2 size={16} color={theme.accent.danger} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 mb-6" style={{ paddingTop: insets.top + 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-12 h-12 rounded-16 justify-center items-center"
          style={{ backgroundColor: theme.surface }}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>
          {name}
        </Text>
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => {
              setShowAddModal(true);
              handleDiscover();
            }}
            className="w-12 h-12 rounded-16 justify-center items-center"
            style={{ backgroundColor: theme.accent.yellow }}
          >
            <Plus size={24} color="#1C1C1E" />
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {/* Content */}
      <View className="flex-1 px-6">
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent.cyan} />
        ) : devices.length === 0 ? (
          <View className="items-center mt-10">
            <Text style={{ color: theme.textSecondary }}>No devices in this room</Text>
          </View>
        ) : (
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      {/* Add Device Modal */}
      <Modal visible={showAddModal} onClose={() => setShowAddModal(false)} title="Add Device" height="full">
        <View className="flex-1">
          {selectedEntity ? (
            <View>
              <TouchableOpacity onPress={() => setSelectedEntity(null)} className="mb-4">
                <Text style={{ color: theme.accent.cyan }}>Back to list</Text>
              </TouchableOpacity>
              <Input
                label="Device Name"
                value={deviceName}
                onChangeText={setDeviceName}
                placeholder="e.g. Ceiling Light"
              />
              <Text className="mb-2" style={{ color: theme.textSecondary }}>
                Entity: {selectedEntity}
              </Text>
              <Button
                title={t.common.add || "Add"}
                onPress={handleAddDevice}
                loading={addingDevice}
                variant="primary"
              />
            </View>
          ) : (
            <>
              <Text className="mb-4" style={{ color: theme.textSecondary }}>
                Select a device to add to {name}
              </Text>
              {discovering ? (
                <ActivityIndicator color={theme.accent.cyan} />
              ) : (
                <FlatList
                  data={discoveredDevices}
                  keyExtractor={(item) => item.entityId}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="py-3 border-b"
                      style={{ borderBottomColor: theme.border }}
                      onPress={() => {
                        setSelectedEntity(item.entityId);
                        setDeviceName(item.attributes.friendlyName || item.entityId);
                      }}
                    >
                      <Text className="font-bold" style={{ color: theme.text }}>
                        {item.attributes.friendlyName || item.entityId}
                      </Text>
                      <Text className="text-xs" style={{ color: theme.textSecondary }}>
                        {item.entityId}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}
