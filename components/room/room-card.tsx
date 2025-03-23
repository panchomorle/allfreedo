"use client";

import { Room } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import Link from "next/link";

interface RoomCardProps {
  room: Room;
  roomiesCount: number;
}

export function RoomCard({ room, roomiesCount }: RoomCardProps) {
  return (
    <Card className="room-card flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="truncate">{room.name}</span>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Users size={16} />
            <span>{roomiesCount}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-gray-600 line-clamp-2">
          {room.description || "No description"}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link href={`/rooms/${room.id}`}>
          <Button variant="outlined">View Room</Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 