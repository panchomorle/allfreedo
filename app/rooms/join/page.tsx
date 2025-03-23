"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { ArrowLeft } from "lucide-react";
import { joinRoomByCode } from "@/app/actions/rooms";
import { useUser } from "@/contexts/user-context";

export default function JoinRoomPage() {
  const router = useRouter();
  const { roomie, loading: loadingRoomie } = useUser();
  const [accessCode, setAccessCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!loadingRoomie && !roomie) {
      router.push("/sign-in");
    }
  }, [loadingRoomie, roomie, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      setError("Access code is required");
      return;
    }
    
    if (!roomie) {
      router.push("/sign-in");
      return;
    }
    
    setIsJoining(true);
    setError(null);
    
    try {
      const { success, error: joinError, roomId } = await joinRoomByCode(accessCode.trim(), roomie.id);
      
      if (!success || joinError) {
        setError(joinError || "Failed to join room");
        setIsJoining(false);
        return;
      }
      
      if (roomId) {
        router.push(`/rooms/${roomId}`);
      } else {
        router.push("/");
      }
    } catch (e) {
      console.error("Error joining room:", e);
      setError("An unexpected error occurred");
      setIsJoining(false);
    }
  };
  
  if (loadingRoomie) {
    return (
      <div className="container mx-auto py-16 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/" className="flex items-center gap-1 text-blue-600 mb-2">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Join a Room</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <Card className="max-w-md mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Enter Room Access Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Enter the access code provided by the room owner to join their room.
            </p>
            
            <div className="flex flex-col space-y-2">
              <LabeledInput
                label="Access Code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                required
                fullWidth
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={6}
                className="uppercase font-mono tracking-wider text-lg"
              />
              <p className="text-xs text-gray-500">
                Access codes are 6 characters long and case insensitive
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Link href="/">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button
              type="submit"
              isLoading={isJoining}
              variant="success"
            >
              Join Room
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 