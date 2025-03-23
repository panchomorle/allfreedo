"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ResponseData, Roomie } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function getCurrentRoomie(): Promise<{ roomie: Roomie | null }> {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { roomie: null };
    }

    // Get the roomie associated with this user
    const { data } = await supabase
      .from("roomies")
      .select("*")
      .eq("auth_uuid", user.id)
      .single();

    return { roomie: data };
  } catch (error) {
    console.error("Error in getCurrentRoomie:", error);
    return { roomie: null };
  }
}

export async function createRoomie(
  name: string,
  userId: string
): Promise<ResponseData<Roomie>> {
  try {
    const supabase = await createClient();

    // Check if a roomie with this user_id already exists
    const { data: existingRoomie } = await supabase
      .from("roomies")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existingRoomie) {
      return {
        error: "A profile already exists for this user",
        success: false,
      };
    }

    const { data, error } = await supabase
      .from("roomies")
      .insert({
        name,
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return {
        error: `Error creating roomie: ${error.message}`,
        success: false,
      };
    }

    revalidatePath("/");
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in createRoomie:", error);
    return {
      error: "An unexpected error occurred while creating the roomie",
      success: false,
    };
  }
}

export async function getRoomieById(
  roomieId: number
): Promise<ResponseData<Roomie>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("roomies")
      .select("*")
      .eq("id", roomieId)
      .single();

    if (error) {
      return {
        error: `Error fetching roomie: ${error.message}`,
        success: false,
      };
    }

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in getRoomieById:", error);
    return {
      error: "An unexpected error occurred while fetching the roomie",
      success: false,
    };
  }
}

export async function getRoomiesInRoom(
  roomId: number
): Promise<ResponseData<Roomie[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("roomie_room")
      .select("roomie_id")
      .eq("room_id", roomId);

    if (error) {
      return {
        error: `Error fetching roomie IDs: ${error.message}`,
        success: false,
      };
    }

    if (!data || data.length === 0) {
      return {
        data: [],
        success: true,
      };
    }

    const roomieIds = data.map((r) => r.roomie_id);

    const { data: roomies, error: roomiesError } = await supabase
      .from("roomies")
      .select("*")
      .in("id", roomieIds);

    if (roomiesError) {
      return {
        error: `Error fetching roomies: ${roomiesError.message}`,
        success: false,
      };
    }

    return {
      data: roomies || [],
      success: true,
    };
  } catch (error) {
    console.error("Error in getRoomiesInRoom:", error);
    return {
      error: "An unexpected error occurred while fetching roomies",
      success: false,
    };
  }
}

export async function updateRoomie(
  roomieId: number,
  updates: Partial<Omit<Roomie, "id" | "user_id" | "created_at">>
): Promise<ResponseData<Roomie>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("roomies")
      .update(updates)
      .eq("id", roomieId)
      .select()
      .single();

    if (error) {
      return {
        error: `Error updating roomie: ${error.message}`,
        success: false,
      };
    }

    revalidatePath("/");
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in updateRoomie:", error);
    return {
      error: "An unexpected error occurred while updating the roomie",
      success: false,
    };
  }
}

export async function getRoomieByAuthId(authUuid: string): Promise<{ data: Roomie | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("roomies")
      .select("*")
      .eq("auth_uuid", authUuid)
      .single();
    
    if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned" error
      return { data: null, error: error.message };
    }
    
    // If no data found, return null without error
    if (!data) {
      return { data: null, error: null };
    }
    
    return { data, error: null };
  } catch (e) {
    console.error("Error fetching roomie:", e);
    return { data: null, error: "Failed to fetch roomie" };
  }
}

export async function leaveRoom(
  roomId: number, 
  roomieId: number
): Promise<ResponseData<null>> {
  try {
    const supabase = await createClient();

    // Check if the roomie is in the room
    const { data: roomieRoom, error: checkError } = await supabase
      .from("roomie_room")
      .select("*")
      .eq("room_id", roomId)
      .eq("roomie_id", roomieId)
      .single();

    if (checkError) {
      return {
        error: `Error checking roomie in room: ${checkError.message}`,
        success: false,
      };
    }

    if (!roomieRoom) {
      return {
        error: "You are not a member of this room",
        success: false,
      };
    }

    // Remove the roomie from the room
    const { error } = await supabase
      .from("roomie_room")
      .delete()
      .eq("room_id", roomId)
      .eq("roomie_id", roomieId);

    if (error) {
      return {
        error: `Error leaving room: ${error.message}`,
        success: false,
      };
    }

    revalidatePath("/");
    revalidatePath(`/rooms/${roomId}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in leaveRoom:", error);
    return {
      error: "An unexpected error occurred while leaving the room",
      success: false,
    };
  }
}

export async function getRoomies(roomieId: number): Promise<{ data: number[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("roomie_room")
      .select("room_id")
      .eq("roomie_id", roomieId);
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    const roomIds = data.map(item => item.room_id);
    return { data: roomIds, error: null };
  } catch (e) {
    console.error("Error fetching roomie's :", e);
    return { data: null, error: "Failed to fetch roomie's " };
  }
} 