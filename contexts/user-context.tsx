'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { getCurrentRoomie } from '@/app/actions/roomies';
import React from 'react';
import { Roomie } from '@/lib/types';

interface UserContextType {
  roomie: Roomie | null;
  loading: boolean;
  refreshRoomie: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [roomie, setRoomie] = useState<Roomie | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);

    const setData = useCallback(async () => {
        console.log("loading set to true: ", loading);
        try {
          const { roomie } = await getCurrentRoomie();
          if (mounted) {
            // Solo actualizamos si realmente hay un cambio
            setRoomie(roomie);
            console.log("roomie set to: ", roomie);
          }
        } catch (error) {
          console.error('Error getting session:', error);
        } finally {
          if (mounted) {
              setLoading(false);
              console.log("loading set to false: ", loading);
          }
        }
      }, [mounted]);
  
  useEffect(() => {
    mounted.current = true;
  
    setData();
  
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshRoomie = async () => {
    setLoading(true);
    setData();
  };

  const value = useMemo(() => ({
    roomie,
    loading,
    refreshRoomie
  }), [roomie, loading]);

  return (
    <UserContext.Provider value={value}>
      {loading && (
        <div className="flex justify-center items-center">
          <img src="https://cdn-icons-png.flaticon.com/512/1345/1345063.png" alt="allfreedo" width={100} height={100} />
        </div>
      )}
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe usarse dentro de un UserProvider');
  }
  return context;
};