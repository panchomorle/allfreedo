import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentRoomie } from "@/app/actions/auth";
import { getRooms } from "@/app/actions/rooms";
import { getRoomiesInRoom } from "@/app/actions/roomies";
import { RoomCard } from "@/components/room/room-card";
import { AuthButton } from "@/components/buttons/auth-button";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard() {
  try {
    // Fetch rooms the user is a member of
    const { data: rooms, error: roomsError } = await getRooms();
    
    // Get roomies count for each room
    const roomiesCountMap: Record<number, number> = {};
    
    if (rooms) {
      await Promise.all(
        rooms.map(async (room) => {
          const { data: roomies } = await getRoomiesInRoom(room.id);
          roomiesCountMap[room.id] = roomies?.length || 0;
        })
      );
    }
    
    return (
      <div className="container mx-auto py-8">
        <header className="flex flex-wrap justify-between items-center mb-8">
          <h1 className="title flex-grow text-3xl font-bold py-2 mr-2">Roomboard</h1>
          <div className="buttons flex flex-wrap gap-2">
            <Link href="/rooms/new">
              <Button variant="success">New Room</Button>
            </Link>
            <Link href="/rooms/join">
              <Button variant="outlined">Join Room</Button>
            </Link>
            <AuthButton />
          </div>
        </header>
        
        {roomsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            Failed to load rooms: {roomsError}
          </div>
        )}
        
        {(!rooms || rooms.length === 0) ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Roomboard!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                You haven't joined any rooms yet. Create a new room or join an existing one to get started.
              </p>
              <div className="flex gap-4">
                <Link href="/rooms/new">
                  <Button variant="success">Create Room</Button>
                </Link>
                <Link href="/rooms/join">
                  <Button variant="outlined">Join Room</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                roomiesCount={roomiesCountMap[room.id]}
              />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          An error occurred while loading the dashboard. Please try again later.
        </div>
      </div>
    );
  }
}
