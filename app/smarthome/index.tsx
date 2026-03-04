import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Switch,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Power,
  Lightbulb,
  Fan,
  Tv,
  RefreshCw,
  Settings,
  Edit2,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useHome } from "@/stores/homeStore";
import { useTheme } from "@/stores/themeStore";
import { useI18n } from "@/stores/i18nStore";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { smarthomeApi, SmartDevice, HAState } from "@/lib/api";
import { useAlert } from "@/components/ui/alert";

export default function SmartHomeDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { home, isAdmin, rooms } = useHome();
  const { theme } = useTheme();
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
      } catch (err) {
        // If config doesn't exist, backend might return 404 or 500 with "record not found"
        // We treat this as not connected
        console.log("No existing HA config found or failed to fetch status");
      }
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
      } catch (err) {
          console.log("Failed to fetch devices/states (likely not connected)");
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
      const addedEntityIds = new Set(devices.map(d => d.entityId));
      const newDevices = results.filter(d => !addedEntityIds.has(d.entityId));
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
    } catch (error) {
       // @ts-ignore
      alert(t.common.error, error.response?.data?.error || "Failed to add device");
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
    } catch (error) {
      alert(t.common.error, "Failed to update device");
    } finally {
      setSavingEdit(false);
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
            fetchDevicesAndStatus();
          } catch (error) {
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
    setDeviceStates(prev => ({ ...prev, [device.entityId]: newState }));

    try {
      await smarthomeApi.controlDevice(home.id, device.id, service);
    } catch (error) {
      console.error("Control failed", error);
      fetchDevicesAndStatus(); // Revert on fail
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
    const roomName = rooms.find(r => r.id === item.roomId)?.name || "No Room";

    return (
      <View className="flex-row items-center p-4 rounded-20 mb-3" style={{ backgroundColor: theme.surface }}>
        <View className="w-10 h-10 justify-center items-center bg-black/5 rounded-12 mr-4">
          {getIcon(item.type, 24, isOn ? theme.accent.yellow : theme.text)}
        </View>
        <View className="flex-1">
          <Text className="text-base font-manrope-bold" style={{ color: theme.text }}>{item.name}</Text>
          <View className="flex-row items-center">
            <Text className="text-xs font-manrope mr-2" style={{ color: theme.textSecondary }}>
              {state?.state || "Unknown"}
            </Text>
            <Text className="text-xs font-manrope-semibold px-1.5 py-0.5 rounded-md bg-black/5" style={{ color: theme.textSecondary }}>
               {roomName}
            </Text>
          </View>
        </View>

        <Switch
          value={isOn}
          onValueChange={(val) => handleControl(item, val)}
          disabled={isOffline}
          trackColor={{ false: theme.border, true: theme.accent.cyan }}
        />

        {isAdmin && (
            <View className="flex-row ml-2">
                 <TouchableOpacity
                    className="p-2"
                    onPress={() => {
                        setEditingDevice(item);
                        setEditName(item.name);
                        setEditRoomId(item.roomId);
                        setShowEditModal(true);
                    }}
                 >
                    <Edit2 size={18} color={theme.text} />
                 </TouchableOpacity>
                 <TouchableOpacity
                    className="p-2"
                    onPress={() => handleDeleteDevice(item.id, item.name)}
                 >
                    <Trash2 size={18} color={theme.accent.danger} />
                 </TouchableOpacity>
            </View>
        )}
      </View>
    );
  };

  if (loading && !devices.length) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

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
        <Text className="text-2xl font-manrope-bold" style={{ color: theme.text }}>Smart Home</Text>
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

      {/* Status Banner */}
      {haStatus && (
        <View className="mx-6 mb-6 p-4 rounded-20 flex-row items-center justify-between" 
              style={{ backgroundColor: haStatus.connected ? theme.accent.cyan + '20' : theme.accent.danger + '20' }}>
            <View className="flex-row items-center gap-3">
                {haStatus.connected ? <Wifi size={20} color={theme.accent.cyan} /> : <WifiOff size={20} color={theme.accent.danger} />}
                <View>
                    <Text className="font-manrope-bold" style={{ color: haStatus.connected ? theme.accent.cyan : theme.accent.danger }}>
                        {haStatus.connected ? "Connected" : "Disconnected"}
                    </Text>
                    {haStatus.url && (
                        <Text className="text-xs" style={{ color: theme.textSecondary }}>{haStatus.url}</Text>
                    )}
                </View>
            </View>
             {isAdmin && (
                <TouchableOpacity onPress={() => router.push("/settings")}>
                    <Settings size={20} color={theme.text} />
                </TouchableOpacity>
            )}
        </View>
      )}

      {/* Content */}
      <View className="flex-1 px-6">
        <View className="flex-row justify-between items-center mb-4">
             <Text className="text-lg font-manrope-bold" style={{ color: theme.text }}>All Devices</Text>
             <TouchableOpacity onPress={fetchDevicesAndStatus} disabled={loading}>
                 {loading ? <ActivityIndicator size="small" color={theme.text} /> : <RefreshCw size={20} color={theme.text} />}
             </TouchableOpacity>
        </View>

        {devices.length === 0 ? (
          <View className="items-center mt-10">
            <Text style={{ color: theme.textSecondary }}>No devices added yet</Text>
             {isAdmin && (
                <>
                    {!haStatus?.connected ? (
                        <Button 
                            title="Connect Home Assistant" 
                            onPress={() => router.push("/settings")} 
                            variant="primary"
                            style={{ marginTop: 20 }}
                        />
                    ) : (
                        <Button 
                            title="Add Device" 
                            onPress={() => { setShowAddModal(true); handleDiscover(); }} 
                            variant="primary"
                            style={{ marginTop: 20 }}
                        />
                    )}
                </>
             )}
          </View>
        ) : (
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      {/* Add Device Modal */}
      <Modal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Device"
        height="full"
      >
        <View className="flex-1">
          {selectedEntity ? (
            <View>
              <TouchableOpacity onPress={() => setSelectedEntity(null)} className="mb-4">
                <Text style={{ color: theme.accent.cyan }}>Back to list</Text>
              </TouchableOpacity>
              
              <Input
                label="Device Name"
                value={newDeviceName}
                onChangeText={setNewDeviceName}
                placeholder="e.g. Living Room Light"
              />

              <Text className="mb-2 font-manrope-medium" style={{ color: theme.text }}>Assign Room (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                <TouchableOpacity
                    className={`px-4 py-2 rounded-full mr-2 ${selectedRoomId === undefined ? 'bg-black' : 'bg-gray-200'}`}
                    style={{ backgroundColor: selectedRoomId === undefined ? theme.text : theme.surface }}
                    onPress={() => setSelectedRoomId(undefined)}
                >
                    <Text style={{ color: selectedRoomId === undefined ? theme.background : theme.text }}>None</Text>
                </TouchableOpacity>
                {rooms.map(room => (
                    <TouchableOpacity
                        key={room.id}
                        className={`px-4 py-2 rounded-full mr-2`}
                        style={{ backgroundColor: selectedRoomId === room.id ? theme.text : theme.surface }}
                        onPress={() => setSelectedRoomId(room.id)}
                    >
                        <Text style={{ color: selectedRoomId === room.id ? theme.background : theme.text }}>{room.name}</Text>
                    </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="mb-2" style={{ color: theme.textSecondary }}>Entity: {selectedEntity}</Text>
              
              <Button
                title={t.common.add || "Add"}
                onPress={handleAddDevice}
                loading={addingDevice}
                variant="primary"
              />
            </View>
          ) : (
            <>
              <Text className="mb-4" style={{ color: theme.textSecondary }}>Select a device to add</Text>
              {discovering ? (
                <ActivityIndicator color={theme.accent.cyan} />
              ) : discoveredDevices.length === 0 ? (
                  <View className="items-center py-5">
                      <Text style={{ color: theme.textSecondary }}>No new devices found</Text>
                  </View>
              ) : (
                <FlatList
                  data={discoveredDevices}
                  keyExtractor={item => item.entityId}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="py-3 border-b"
                      style={{ borderBottomColor: theme.border }}
                      onPress={() => {
                        setSelectedEntity(item.entityId);
                        setNewDeviceName(item.attributes.friendlyName || item.entityId);
                      }}
                    >
                      <Text className="font-bold" style={{ color: theme.text }}>{item.attributes.friendlyName || item.entityId}</Text>
                      <Text className="text-xs" style={{ color: theme.textSecondary }}>{item.entityId}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Edit Device Modal */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Device"
      >
        <View>
            <Input
                label="Device Name"
                value={editName}
                onChangeText={setEditName}
            />

            <Text className="mb-2 font-manrope-medium" style={{ color: theme.text }}>Room</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                <TouchableOpacity
                    className={`px-4 py-2 rounded-full mr-2`}
                    style={{ backgroundColor: editRoomId === undefined ? theme.text : theme.surface }}
                    onPress={() => setEditRoomId(undefined)}
                >
                    <Text style={{ color: editRoomId === undefined ? theme.background : theme.text }}>None</Text>
                </TouchableOpacity>
                {rooms.map(room => (
                    <TouchableOpacity
                        key={room.id}
                        className={`px-4 py-2 rounded-full mr-2`}
                        style={{ backgroundColor: editRoomId === room.id ? theme.text : theme.surface }}
                        onPress={() => setEditRoomId(room.id)}
                    >
                        <Text style={{ color: editRoomId === room.id ? theme.background : theme.text }}>{room.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Button
                title={t.common.save || "Save"}
                onPress={handleUpdateDevice}
                loading={savingEdit}
                variant="primary"
            />
        </View>
      </Modal>
    </View>
  );
}
