"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRoomie } from "@/app/actions/roomies";
import { checkRoomieExists, getCurrentUser } from "@/app/actions/auth";

export default function CreateProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      
      // Check if user is logged in
      const { user, error: userError } = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      
      // Check if roomie already exists
      const { exists, error: roomieError } = await checkRoomieExists();
      
      if (exists) {
        // User already has a profile, redirect to rooms
        router.push("/");
        return;
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;
    
    setIsCreating(true);
    setError(null);
    
    const { data, error: createError } = await createRoomie(name, userId);
    
    if (createError || !data) {
      setError(createError || "Failed to create profile");
      setIsCreating(false);
      return;
    }
    
    // Redirect to rooms page
    router.push("/");
  };

  if (loading) {
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
    <div className="container mx-auto py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Profile</CardTitle>
          <CardDescription>
            Set up your roomie profile before continuing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              fullWidth
            />
            
            <Button type="submit" fullWidth isLoading={isCreating}>
              Create Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 