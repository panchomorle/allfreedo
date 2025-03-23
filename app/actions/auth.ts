"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getRoomieByAuthId } from "./roomies";

export async function getCurrentUser() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, error: error?.message || null };
  }
  
  return { user: user, error: null };
}

export async function getCurrentRoomie() {
  const { user, error: userError } = await getCurrentUser();
  
  if (userError || !user) {
    return { roomie: null, error: userError || "Not authenticated" };
  }
  
  const { data: roomie, error: roomieError } = await getRoomieByAuthId(user.id);
  
  if (roomieError) {
    return { roomie: null, error: roomieError };
  }
  
  return { roomie, error: null };
}

export async function checkRoomieExists() {
  const { roomie, error: roomieError } = await getCurrentRoomie();
  
  if (roomieError) {
    return { exists: false, error: roomieError };
  }
  
  return { exists: !!roomie, error: null };
}

export async function requireAuth() {
  const { user, error } = await getCurrentUser();
  
  if (error || !user) {
    redirect("/sign-in");
  }
  
  return user;
}

export async function requireRoomie() {
  const { roomie, error } = await getCurrentRoomie();
  
  if (error || !roomie) {
    redirect("/create-profile");
  }
  
  return roomie;
} 