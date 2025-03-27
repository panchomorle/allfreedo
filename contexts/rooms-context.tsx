"use client";

import React, { createContext, useContext, useState } from "react";
import { Room } from "@/lib/types";
import { getRooms, getRoomById } from "@/app/actions/rooms";
import { getRoomiesInRoom } from "@/app/actions/roomies";

interface RoomsContextType {
  rooms: Room[];
  roomsById: Record<number, {
    room: Room;
    loading: boolean;
    error: string | null;
  }>;
  roomiesCountMap: Record<number, number>;
  loading: boolean;
  error: string | null;
  refreshRooms: () => Promise<void>;
  refreshRoom: (roomId: number) => Promise<void>;
}

const RoomsContext = createContext<RoomsContextType | undefined>(undefined);

interface RoomState {
  room: Room;
  loading: boolean;
  error: string | null;
}

export function RoomsProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsById, setRoomsById] = useState<Record<number, RoomState>>({});
  const [roomiesCountMap, setRoomiesCountMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = async (roomId: number) => {
    // If we already have data for this room and it's not loading, don't fetch again
    if (roomsById[roomId] && !roomsById[roomId].loading) {
      return;
    }

    setRoomsById(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        loading: true,
        error: null
      }
    }));

    try {
      const { data: roomData, error: roomError } = await getRoomById(roomId);
      
      if (roomError) {
        throw new Error(roomError);
      }
      
      if (!roomData) {
        throw new Error("Room not found");
      }

      setRoomsById(prev => ({
        ...prev,
        [roomId]: {
          room: roomData,
          loading: false,
          error: null
        }
      }));

      // Update rooms list if needed
      setRooms(prev => {
        if (prev.find(r => r.id === roomId)) {
          return prev.map(r => r.id === roomId ? roomData : r);
        }
        return [...prev, roomData];
      });
    } catch (err) {
      setRoomsById(prev => ({
        ...prev,
        [roomId]: {
          ...prev[roomId],
          loading: false,
          error: err instanceof Error ? err.message : "Failed to fetch room"
        }
      }));
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: roomsData, error: roomsError } = await getRooms();
      
      if (roomsError) {
        setError(roomsError);
        return;
      }
      
      if (!roomsData) {
        setRooms([]);
        return;
      }
      
      setRooms(roomsData);
      
      // Update roomsById
      const newRoomsById: Record<number, RoomState> = {};
      roomsData.forEach(room => {
        newRoomsById[room.id] = {
          room,
          loading: false,
          error: null
        };
      });
      setRoomsById(newRoomsById);
      
      // Fetch roomies count for each room
      const counts: Record<number, number> = {};
      await Promise.all(
        roomsData.map(async (room) => {
          const { data: roomies } = await getRoomiesInRoom(room.id);
          counts[room.id] = roomies?.length || 0;
        })
      );
      
      setRoomiesCountMap(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rooms");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <RoomsContext.Provider 
      value={{ 
        rooms,
        roomsById,
        roomiesCountMap,
        loading,
        error,
        refreshRooms: fetchRooms,
        refreshRoom: fetchRoom
      }}
    >
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const context = useContext(RoomsContext);
  if (context === undefined) {
    throw new Error("useRooms must be used within a RoomsProvider");
  }
  return context;
}

export function useRoom(roomId: number) {
  const context = useContext(RoomsContext);
  if (context === undefined) {
    throw new Error("useRoom must be used within a RoomsProvider");
  }

  const roomData = context.roomsById[roomId];

  // Fetch room on mount if not already loaded
  React.useEffect(() => {
    if (!roomData) {
      context.refreshRoom(roomId);
    }
  }, [roomId, context]);

  return {
    room: roomData?.room,
    loading: roomData?.loading ?? true,
    error: roomData?.error ?? null,
    refreshRoom: () => context.refreshRoom(roomId)
  };
} 