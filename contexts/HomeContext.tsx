import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { homeApi, roomApi } from "@/lib/api";
import { Home, Room, HomeMembership } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { useWebSocket, EventModule } from "./WebSocketContext";

const CURRENT_HOME_KEY = "current_home_id";

interface HomeResult {
  success: boolean;
  error?: string;
}

export const [HomeProvider, useHome] = createContextHook(() => {
  const { isAuthenticated, user } = useAuth();
  const { subscribe } = useWebSocket();
  const [homes, setHomes] = useState<Home[]>([]);
  const [currentHomeId, setCurrentHomeId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Derived current home
  const home = useMemo(() => {
    if (!currentHomeId) return null;
    return homes.find((h) => h.id === currentHomeId) ?? null;
  }, [homes, currentHomeId]);

  // Compute isAdmin for current home
  const computeAdmin = useCallback(
    (selectedHome: Home | null) => {
      if (selectedHome?.memberships && user) {
        const membership = selectedHome.memberships.find(
          (m: HomeMembership) => m.user_id === user.id
        );
        setIsAdmin(membership?.role === "admin");
      } else {
        setIsAdmin(false);
      }
    },
    [user]
  );

  const loadRooms = useCallback(async (homeId: number) => {
    try {
      const roomsData = await roomApi.getByHomeId(homeId);
      setRooms(roomsData || []);
    } catch (error) {
      console.error("Error loading rooms:", error);
      setRooms([]);
    }
  }, []);

  const loadHomes = useCallback(async () => {
    try {
      setIsLoading(true);
      const homesData = await homeApi.getUserHomes();

      if (homesData && homesData.length > 0) {
        setHomes(homesData);

        // Restore persisted current home ID
        const storedId = await AsyncStorage.getItem(CURRENT_HOME_KEY);
        const storedHomeId = storedId ? parseInt(storedId, 10) : null;

        // Use stored ID if valid, otherwise default to first home
        const validHome = storedHomeId
          ? homesData.find((h) => h.id === storedHomeId)
          : null;
        const selectedHome = validHome ?? homesData[0];

        setCurrentHomeId(selectedHome.id);
        computeAdmin(selectedHome);
        await loadRooms(selectedHome.id);
      } else {
        setHomes([]);
        setCurrentHomeId(null);
        setRooms([]);
        setIsAdmin(false);
      }
    } catch (error: any) {
      console.error("Error loading homes:", error);
      if (error.response?.status !== 404) {
        console.error("Unexpected error:", error);
      }
      setHomes([]);
      setCurrentHomeId(null);
      setRooms([]);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, computeAdmin, loadRooms]);

  useEffect(() => {
    if (isAuthenticated) {
      loadHomes();
    } else {
      setHomes([]);
      setCurrentHomeId(null);
      setRooms([]);
      setIsAdmin(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, loadHomes]);

  useEffect(() => {
    const modules: EventModule[] = ["HOME", "ROOM"];
    return subscribe(modules, () => {
      loadHomes();
    });
  }, [subscribe, loadHomes]);

  const switchHome = useCallback(
    async (homeId: number) => {
      const selectedHome = homes.find((h) => h.id === homeId);
      if (!selectedHome) return;

      setCurrentHomeId(homeId);
      await AsyncStorage.setItem(CURRENT_HOME_KEY, String(homeId));
      computeAdmin(selectedHome);
      await loadRooms(homeId);
    },
    [homes, computeAdmin, loadRooms]
  );

  const createHome = useCallback(
    async (name: string): Promise<HomeResult> => {
      try {
        await homeApi.create(name);
        // Reload homes and switch to the new one
        const homesData = await homeApi.getUserHomes();
        setHomes(homesData);
        // The new home is likely the last one created
        const newHome = homesData[homesData.length - 1];
        if (newHome) {
          setCurrentHomeId(newHome.id);
          await AsyncStorage.setItem(CURRENT_HOME_KEY, String(newHome.id));
          computeAdmin(newHome);
          await loadRooms(newHome.id);
        }
        return { success: true };
      } catch (error: any) {
        console.error("Error creating home:", error);
        return {
          success: false,
          error: error.response?.data?.error || "Failed to create home",
        };
      }
    },
    [computeAdmin, loadRooms]
  );

  const joinHome = useCallback(
    async (code: string): Promise<HomeResult> => {
      try {
        await homeApi.join(code);
        // Reload homes and switch to the newly joined one
        const homesData = await homeApi.getUserHomes();
        setHomes(homesData);
        const newHome = homesData[homesData.length - 1];
        if (newHome) {
          setCurrentHomeId(newHome.id);
          await AsyncStorage.setItem(CURRENT_HOME_KEY, String(newHome.id));
          computeAdmin(newHome);
          await loadRooms(newHome.id);
        }
        return { success: true };
      } catch (error: any) {
        console.error("Error joining home:", error);
        return {
          success: false,
          error: error.response?.data?.error || "Failed to join home",
        };
      }
    },
    [computeAdmin, loadRooms]
  );

  const leaveHome = useCallback(async (): Promise<HomeResult> => {
    if (!home) return { success: false, error: "No home found" };

    try {
      await homeApi.leave(home.id);
      // Remove from local list and switch
      const remaining = homes.filter((h) => h.id !== home.id);
      setHomes(remaining);
      if (remaining.length > 0) {
        const next = remaining[0];
        setCurrentHomeId(next.id);
        await AsyncStorage.setItem(CURRENT_HOME_KEY, String(next.id));
        computeAdmin(next);
        await loadRooms(next.id);
      } else {
        setCurrentHomeId(null);
        await AsyncStorage.removeItem(CURRENT_HOME_KEY);
        setRooms([]);
        setIsAdmin(false);
      }
      return { success: true };
    } catch (error: any) {
      console.error("Error leaving home:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to leave home",
      };
    }
  }, [home, homes, computeAdmin, loadRooms]);

  const deleteHome = useCallback(async (): Promise<HomeResult> => {
    if (!home) return { success: false, error: "No home found" };

    try {
      await homeApi.delete(home.id);
      const remaining = homes.filter((h) => h.id !== home.id);
      setHomes(remaining);
      if (remaining.length > 0) {
        const next = remaining[0];
        setCurrentHomeId(next.id);
        await AsyncStorage.setItem(CURRENT_HOME_KEY, String(next.id));
        computeAdmin(next);
        await loadRooms(next.id);
      } else {
        setCurrentHomeId(null);
        await AsyncStorage.removeItem(CURRENT_HOME_KEY);
        setRooms([]);
        setIsAdmin(false);
      }
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting home:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to delete home",
      };
    }
  }, [home, homes, computeAdmin, loadRooms]);

  const removeMember = useCallback(
    async (userId: number): Promise<HomeResult> => {
      if (!home) return { success: false, error: "No home found" };

      try {
        await homeApi.removeMember(home.id, userId);
        await loadHomes();
        return { success: true };
      } catch (error: any) {
        console.error("Error removing member:", error);
        return {
          success: false,
          error: error.response?.data?.error || "Failed to remove member",
        };
      }
    },
    [home, loadHomes]
  );

  const regenerateInviteCode = useCallback(async (): Promise<HomeResult> => {
    if (!home) return { success: false, error: "No home found" };

    try {
      await homeApi.regenerateInviteCode(home.id);
      await loadHomes();
      return { success: true };
    } catch (error: any) {
      console.error("Error regenerating invite code:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Failed to regenerate invite code",
      };
    }
  }, [home, loadHomes]);

  const refreshRooms = useCallback(async () => {
    if (!home) return;
    await loadRooms(home.id);
  }, [home, loadRooms]);

  // Room operations
  const createRoom = useCallback(
    async (name: string): Promise<HomeResult> => {
      if (!home) return { success: false, error: "No home found" };

      try {
        await roomApi.create(home.id, name);
        await refreshRooms();
        return { success: true };
      } catch (error: any) {
        console.error("Error creating room:", error);
        return {
          success: false,
          error: error.response?.data?.error || "Failed to create room",
        };
      }
    },
    [home, refreshRooms]
  );

  const deleteRoom = useCallback(
    async (roomId: number): Promise<HomeResult> => {
      if (!home) return { success: false, error: "No home found" };

      try {
        await roomApi.delete(home.id, roomId);
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        return { success: true };
      } catch (error: any) {
        console.error("Error deleting room:", error);
        return {
          success: false,
          error: error.response?.data?.error || "Failed to delete room",
        };
      }
    },
    [home]
  );

  return useMemo(
    () => ({
      home,
      homes,
      rooms,
      isLoading,
      isAdmin,
      switchHome,
      loadHome: loadHomes,
      createHome,
      joinHome,
      leaveHome,
      deleteHome,
      removeMember,
      regenerateInviteCode,
      createRoom,
      deleteRoom,
      refreshRooms,
    }),
    [
      home,
      homes,
      rooms,
      isLoading,
      isAdmin,
      switchHome,
      loadHomes,
      createHome,
      joinHome,
      leaveHome,
      deleteHome,
      removeMember,
      regenerateInviteCode,
      createRoom,
      deleteRoom,
      refreshRooms,
    ]
  );
});
