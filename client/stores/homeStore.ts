import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { getApiErrorMessage, getApiErrorStatus, homeApi, roomApi } from "@/lib/api";
import type { Home, HomeMembership, Room } from "@/lib/types";
import { type EventModule, wsManager } from "@/lib/websocket";
import { useAuthStore } from "./authStore";

const CURRENT_HOME_KEY = "current_home_id";

interface HomeResult {
  success: boolean;
  error?: string;
}

function computeAdmin(selectedHome: Home | null, userId: number | undefined): boolean {
  if (!selectedHome?.memberships || !userId) return false;
  const membership = selectedHome.memberships.find((m: HomeMembership) => m.userId === userId);
  return membership?.role === "admin";
}

interface HomeState {
  homes: Home[];
  currentHomeId: number | null;
  rooms: Room[];
  isLoading: boolean;
  isAdmin: boolean;
  home: Home | null;
  init: () => void;
  loadHomes: () => Promise<void>;
  switchHome: (homeId: number) => Promise<void>;
  createHome: (name: string) => Promise<HomeResult>;
  joinHome: (code: string) => Promise<HomeResult>;
  leaveHome: () => Promise<HomeResult>;
  deleteHome: () => Promise<HomeResult>;
  removeMember: (userId: number) => Promise<HomeResult>;
  regenerateInviteCode: () => Promise<HomeResult>;
  createRoom: (name: string) => Promise<HomeResult>;
  deleteRoom: (roomId: number) => Promise<HomeResult>;
  refreshRooms: () => Promise<void>;
  // Alias for backward compat
  loadHome: () => Promise<void>;
}

let homeStoreInitialized = false;

export const useHomeStore = create<HomeState>((set, get) => {
  const loadRooms = async (homeId: number) => {
    try {
      const roomsData = await roomApi.getByHomeId(homeId);
      set({ rooms: roomsData || [] });
    } catch (error) {
      console.error("Error loading rooms:", error);
      set({ rooms: [] });
    }
  };

  const store: HomeState = {
    homes: [],
    currentHomeId: null,
    rooms: [],
    isLoading: true,
    isAdmin: false,
    home: null,

    init: () => {
      if (homeStoreInitialized) return;
      homeStoreInitialized = true;

      // Subscribe to auth changes
      useAuthStore.subscribe(
        (state) => state.isAuthenticated,
        (isAuthenticated) => {
          if (isAuthenticated) {
            get().loadHomes();
          } else {
            set({
              homes: [],
              currentHomeId: null,
              rooms: [],
              isAdmin: false,
              isLoading: false,
              home: null,
            });
          }
        },
      );

      // Subscribe to WebSocket HOME/ROOM events
      wsManager.subscribe(["HOME", "ROOM"] as EventModule[], () => {
        get().loadHomes();
      });

      // Initial load if already authenticated
      if (useAuthStore.getState().isAuthenticated) {
        get().loadHomes();
      }
    },

    loadHomes: async () => {
      try {
        set({ isLoading: true });
        const homesData = await homeApi.getUserHomes();

        if (homesData && homesData.length > 0) {
          const storedId = await AsyncStorage.getItem(CURRENT_HOME_KEY);
          const storedHomeId = storedId ? parseInt(storedId, 10) : null;
          const validHome = storedHomeId ? homesData.find((h) => h.id === storedHomeId) : null;
          const selectedHome = validHome ?? homesData[0];
          const userId = useAuthStore.getState().user?.id;

          set({
            homes: homesData,
            currentHomeId: selectedHome.id,
            home: selectedHome,
            isAdmin: computeAdmin(selectedHome, userId),
            isLoading: false,
          });

          await loadRooms(selectedHome.id);
        } else {
          set({
            homes: [],
            currentHomeId: null,
            home: null,
            rooms: [],
            isAdmin: false,
            isLoading: false,
          });
        }
      } catch (error: any) {
        console.error("Error loading homes:", error);
        if (getApiErrorStatus(error) === 401) {
          set({
            homes: [],
            currentHomeId: null,
            home: null,
            rooms: [],
            isAdmin: false,
            isLoading: false,
          });
          await AsyncStorage.removeItem(CURRENT_HOME_KEY);
          return;
        }
        set({
          homes: [],
          currentHomeId: null,
          home: null,
          rooms: [],
          isAdmin: false,
          isLoading: false,
        });
      }
    },

    switchHome: async (homeId: number) => {
      const { homes } = get();
      const selectedHome = homes.find((h) => h.id === homeId);
      if (!selectedHome) return;

      const userId = useAuthStore.getState().user?.id;

      set({
        currentHomeId: homeId,
        home: selectedHome,
        isAdmin: computeAdmin(selectedHome, userId),
      });

      await AsyncStorage.setItem(CURRENT_HOME_KEY, String(homeId));
      await loadRooms(homeId);
    },

    createHome: async (name: string): Promise<HomeResult> => {
      try {
        await homeApi.create(name);
        await get().loadHomes();
        return { success: true };
      } catch (error: any) {
        console.error("Error creating home:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to create home") };
      }
    },

    joinHome: async (code: string): Promise<HomeResult> => {
      try {
        const result = await homeApi.join(code);
        return { success: true, error: result.message };
      } catch (error: any) {
        console.error("Error joining home:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to join home") };
      }
    },

    leaveHome: async (): Promise<HomeResult> => {
      const { home, homes } = get();
      if (!home) return { success: false, error: "No home found" };

      try {
        await homeApi.leave(home.id);
        const remaining = homes.filter((h) => h.id !== home.id);
        const userId = useAuthStore.getState().user?.id;

        if (remaining.length > 0) {
          const next = remaining[0];
          set({
            homes: remaining,
            currentHomeId: next.id,
            home: next,
            isAdmin: computeAdmin(next, userId),
          });
          await AsyncStorage.setItem(CURRENT_HOME_KEY, String(next.id));
          await loadRooms(next.id);
        } else {
          set({
            homes: [],
            currentHomeId: null,
            home: null,
            rooms: [],
            isAdmin: false,
          });
          await AsyncStorage.removeItem(CURRENT_HOME_KEY);
        }

        return { success: true };
      } catch (error: any) {
        console.error("Error leaving home:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to leave home") };
      }
    },

    deleteHome: async (): Promise<HomeResult> => {
      const { home, homes } = get();
      if (!home) return { success: false, error: "No home found" };

      try {
        await homeApi.delete(home.id);
        const remaining = homes.filter((h) => h.id !== home.id);
        const userId = useAuthStore.getState().user?.id;

        if (remaining.length > 0) {
          const next = remaining[0];
          set({
            homes: remaining,
            currentHomeId: next.id,
            home: next,
            isAdmin: computeAdmin(next, userId),
          });
          await AsyncStorage.setItem(CURRENT_HOME_KEY, String(next.id));
          await loadRooms(next.id);
        } else {
          set({
            homes: [],
            currentHomeId: null,
            home: null,
            rooms: [],
            isAdmin: false,
          });
          await AsyncStorage.removeItem(CURRENT_HOME_KEY);
        }

        return { success: true };
      } catch (error: any) {
        console.error("Error deleting home:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to delete home") };
      }
    },

    removeMember: async (userId: number): Promise<HomeResult> => {
      const { home } = get();
      if (!home) return { success: false, error: "No home found" };

      try {
        await homeApi.removeMember(home.id, userId);
        await get().loadHomes();
        return { success: true };
      } catch (error: any) {
        console.error("Error removing member:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to remove member") };
      }
    },

    regenerateInviteCode: async (): Promise<HomeResult> => {
      const { home } = get();
      if (!home) return { success: false, error: "No home found" };

      try {
        await homeApi.regenerateInviteCode(home.id);
        await get().loadHomes();
        return { success: true };
      } catch (error: any) {
        console.error("Error regenerating invite code:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to regenerate invite code") };
      }
    },

    createRoom: async (name: string): Promise<HomeResult> => {
      const { home } = get();
      if (!home) return { success: false, error: "No home found" };

      try {
        await roomApi.create(home.id, name);
        await get().refreshRooms();
        return { success: true };
      } catch (error: any) {
        console.error("Error creating room:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to create room") };
      }
    },

    deleteRoom: async (roomId: number): Promise<HomeResult> => {
      const { home } = get();
      if (!home) return { success: false, error: "No home found" };

      try {
        await roomApi.delete(home.id, roomId);
        set((state) => ({ rooms: state.rooms.filter((r) => r.id !== roomId) }));
        return { success: true };
      } catch (error: any) {
        console.error("Error deleting room:", error);
        return { success: false, error: getApiErrorMessage(error, "Failed to delete room") };
      }
    },

    refreshRooms: async () => {
      const { home } = get();
      if (!home) return;
      await loadRooms(home.id);
    },

    // Alias for backward compatibility
    loadHome: async () => {
      await get().loadHomes();
    },
  };

  return store;
});

// Convenience hook matching existing API
export function useHome() {
  return useHomeStore();
}
