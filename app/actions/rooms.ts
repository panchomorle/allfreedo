"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Room } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/service-role";

export async function createRoom(name: string, roomieId: number): Promise<{ data: Room | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Generate a random 6-character access code
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from("rooms")
      .insert([{ name, access_code: accessCode, created_by: roomieId }])
      .select()
      .single();
    
    if (error) {
      return { data: null, error: error.message };
    }

    const { error: joinError } = await supabase
    .from("roomie_room")
    .insert([{ room_id: data.id, roomie_id: roomieId }]);

    if (joinError) {
      return { data: null, error: joinError.message };
    }
    
    revalidatePath("/");
    return { data, error: null };
  } catch (e) {
    console.error("Error creating room:", e);
    return { data: null, error: "Failed to create room" };
  }
}

export async function getRooms(): Promise<{ data: Room[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("rooms")
      .select("*");
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (e) {
    console.error("Error fetching rooms:", e);
    return { data: null, error: "Failed to fetch rooms" };
  }
}

export async function getRoomById(id: number): Promise<{ data: Room | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (e) {
    console.error("Error fetching room:", e);
    return { data: null, error: "Failed to fetch room" };
  }
}

export async function updateRoom(id: number, name: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("rooms")
      .update({ name })
      .eq("id", id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath("/");
    revalidatePath(`/rooms/${id}`);
    return { success: true, error: null };
  } catch (e) {
    console.error("Error updating room:", e);
    return { success: false, error: "Failed to update room" };
  }
}

export async function deleteRoom(id: number): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath("/");
    return { success: true, error: null };
  } catch (e) {
    console.error("Error deleting room:", e);
    return { success: false, error: "Failed to delete room" };
  }
}

export async function joinRoomByCode(accessCode: string, roomieId: number): Promise<{ success: boolean; error: string | null; roomId: number | null }> {
  try {
    const supabaseAdmin = createAdminClient();
    const supabase = await createClient();
    
    // First, find the room with the given access code
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("access_code", accessCode)
      .single();
    
    if (roomError) {
      return { success: false, error: "Invalid access code", roomId: null };
    }
    
    // Then, add the roomie to the room
    const { error: joinError } = await supabase
      .from("roomie_room")
      .insert([{ room_id: room.id, roomie_id: roomieId }]);
    
    if (joinError) {
      if (joinError.code === "23505") { // Unique violation
        return { success: false, error: "You're already a member of this room", roomId: room.id };
      }
      return { success: false, error: joinError.message, roomId: null };
    }
    
    revalidatePath("/");
    revalidatePath(`/rooms/${room.id}`);
    return { success: true, error: null, roomId: room.id };
  } catch (e) {
    console.error("Error joining room:", e);
    return { success: false, error: "Failed to join room", roomId: null };
  }
} 