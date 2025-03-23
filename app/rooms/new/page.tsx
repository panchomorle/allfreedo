"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { LabeledTextarea } from "@/components/ui/labeled-textarea";
import { ArrowLeft } from "lucide-react";
import { createRoom } from "@/app/actions/rooms";
import { useUser } from "@/contexts/user-context";

export default function NewRoomPage() {
  const router = useRouter();
  const { roomie: currentRoomie } = useUser();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Room name is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    console.log("currentRoomie: ", currentRoomie);
    if (!currentRoomie){ router.push("/sign-in"); return;}
    
    try {
      const { data, error: createError } = await createRoom(name, currentRoomie.id);
      
      if (createError || !data) {
        setError(createError || "Failed to create room");
        setIsSubmitting(false);
        return;
      }
      
      router.push(`/rooms/${data.id}`);
    } catch (e) {
      console.error("Error creating room:", e);
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/" className="flex items-center gap-1 text-blue-600 mb-2">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Create New Room</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <Card className="max-w-md mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Room Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LabeledInput
              label="Room Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
              required
              fullWidth
            />
            
            <LabeledTextarea
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter room description"
              rows={3}
              fullWidth
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Link href="/">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>
              Create Room
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 