"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ClipboardCopy, Users, LogOut, ArrowLeft } from "lucide-react";
import { getCurrentRoomie } from "@/app/actions/auth";
import { getRoomById, updateRoom } from "@/app/actions/rooms";
import { getRoomiesInRoom, leaveRoom } from "@/app/actions/roomies";
import { Roomie, Room } from "@/lib/types";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useUser } from "@/contexts/user-context";

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const { roomie: currentRoomie } = useUser();
  const [roomies, setRoomies] = useState<Roomie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const { id } = use(params);
  const roomId = parseInt(id);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (!currentRoomie){ router.push("/sign-in"); return;}
      // Get room details
      const { data: roomData, error: roomError } = await getRoomById(roomId);
      
      if (roomError || !roomData) {
        setError(roomError || "Failed to load room");
        setLoading(false);
        return;
      }
      
      setRoom(roomData);
      setEditedName(roomData.name);
      
      // Get roomies in the room
      const { data: roomiesData, error: roomiesError } = await getRoomiesInRoom(roomId);
      
      if (roomiesError || !roomiesData) {
        setError(roomiesError || "Failed to load roomies");
        setLoading(false);
        return;
      }
      
      setRoomies(roomiesData);
      setLoading(false);
    };

    loadData();
  }, [roomId, router]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing && room) {
      setEditedName(room.name);
    }
  };

  const handleUpdateRoom = async () => {
    if (!room || !editedName.trim()) return;
    
    setIsUpdating(true);
    const { success, error: updateError } = await updateRoom(room.id, editedName);
    
    if (!success || updateError) {
      setError(updateError || "Failed to update room");
      setIsUpdating(false);
      return;
    }
    
    // Update local state
    setRoom({ ...room, name: editedName });
    setIsEditing(false);
    setIsUpdating(false);
  };

  const handleLeaveRoom = async () => {
    if (!room || !currentRoomie) return;
    
    if (!confirm("Are you sure you want to leave this room? You'll need the access code to rejoin.")) {
      return;
    }
    
    setIsLeaving(true);
    const { success, error: leaveError } = await leaveRoom(room.id, currentRoomie.id);
    
    if (!success || leaveError) {
      setError(leaveError || "Failed to leave room");
      setIsLeaving(false);
      return;
    }
    
    router.push("/");
  };

  const copyAccessCode = () => {
    if (!room) return;
    
    navigator.clipboard.writeText(room.access_code);
    setCopySuccess(true);
    
    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Loading room details...</h1>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Room not found</h1>
        <Link href="/">
          <Button variant="secondary">Back to Roomboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Link href="/" className="flex items-center gap-1 text-blue-600 mb-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div className="flex flex-wrap justify-between items-center mb-6">
        {isEditing ? (
          <div className="flex gap-2 items-center">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-2xl font-bold max-w-md"
            />
            <Button variant="success" size="sm" onClick={handleUpdateRoom} isLoading={isUpdating}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={handleEditToggle} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        ) : (
          <h1 className="text-2xl font-bold p-2">{room.name}</h1>
        )}
        
        <div className="flex flex-wrap gap-2">
          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={handleEditToggle}>
              Edit Room
            </Button>
          )}
          <Button variant="outlined" size="sm" onClick={copyAccessCode} className="flex items-center gap-1">
            <ClipboardCopy size={16} />
            {copySuccess ? "Copied!" : room.access_code}
          </Button>
          <Button variant="danger" size="sm" onClick={handleLeaveRoom} isLoading={isLeaving} className="flex items-center gap-1">
            <LogOut size={16} />
            Leave Room
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                Roomies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roomies.length === 0 ? (
                <p className="text-gray-500">No roomies in this room yet.</p>
              ) : (
                <div className="space-y-4">
                  {roomies.map((roomie) => (
                    <div key={roomie.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{roomie.name}</p>
                        {roomie.id === currentRoomie?.id && (
                          <span className="text-xs text-blue-600">(You)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Room Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href={`/rooms/${roomId}/tasks`} className="block w-full">
                <Button variant="primary" fullWidth className="text-center">
                  View Tasks
                </Button>
              </Link>
              <Link href={`/rooms/${roomId}/task-templates`} className="block w-full">
                <Button variant="secondary" fullWidth className="text-center">
                  Manage Task Templates
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 