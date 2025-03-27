"use client";

import React, { createContext, useContext, useState } from "react";
import { Roomie } from "@/lib/types";
import { getRoomiesInRoom } from "@/app/actions/roomies";

interface RoomiesContextType {
  roomiesByRoom: Record<number, {
    roomies: Roomie[];
    loading: boolean;
    error: string | null;
  }>;
  refreshRoomies: (roomId: number) => Promise<void>;
}

const RoomiesContext = createContext<RoomiesContextType | undefined>(undefined);

interface RoomState {
  roomies: Roomie[];
  loading: boolean;
  error: string | null;
}

const initialRoomState: RoomState = {
  roomies: [],
  loading: true,
  error: null
};

export function RoomiesProvider({ children }: { children: React.ReactNode }) {
  const [roomiesByRoom, setRoomiesByRoom] = useState<Record<number, RoomState>>({});

  const fetchRoomies = async (roomId: number) => {
    // Initialize room state if it doesn't exist
    if (!roomiesByRoom[roomId]) {
      setRoomiesByRoom(prev => ({
        ...prev,
        [roomId]: { ...initialRoomState }
      }));
    }

    // If we already have data for this room and it's not loading, don't fetch again
    if (roomiesByRoom[roomId] && !roomiesByRoom[roomId].loading) {
      return;
    }

    setRoomiesByRoom(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        loading: true,
        error: null
      }
    }));

    try {
      const { data: roomiesData, error } = await getRoomiesInRoom(roomId);
      
      if (error) {
        throw new Error(error);
      }

      setRoomiesByRoom(prev => ({
        ...prev,
        [roomId]: {
          roomies: roomiesData || [],
          loading: false,
          error: null
        }
      }));
    } catch (err) {
      setRoomiesByRoom(prev => ({
        ...prev,
        [roomId]: {
          ...prev[roomId],
          loading: false,
          error: err instanceof Error ? err.message : "Failed to fetch roomies"
        }
      }));
    }
  };

  return (
    <RoomiesContext.Provider 
      value={{ 
        roomiesByRoom,
        refreshRoomies: fetchRoomies
      }}
    >
      {children}
    </RoomiesContext.Provider>
  );
}

export function useRoomies(roomId: number) {
  const context = useContext(RoomiesContext);
  if (context === undefined) {
    throw new Error("useRoomies must be used within a RoomiesProvider");
  }

  const roomData = context.roomiesByRoom[roomId] || { ...initialRoomState };

  // Fetch roomies on mount if not already loaded
  React.useEffect(() => {
    // Always fetch on mount if we don't have data for this room
    if (!context.roomiesByRoom[roomId]) {
      context.refreshRoomies(roomId);
    }
  }, [roomId, context]);

  return {
    ...roomData,
    refreshRoomies: () => context.refreshRoomies(roomId)
  };
} 