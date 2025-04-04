"use server";

import { createClient } from "@/utils/supabase/server";
import { ResponseData, TaskRating } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function rateTaskCompletion(
  taskId: number,
  roomieId: number,
  rating: number
): Promise<ResponseData<TaskRating>> {
  try {
    const supabase = await createClient();

    // Check if the roomie has already rated this task
    const { data: existingRating, error: checkError } = await supabase
      .from("task_ratings")
      .select("*")
      .eq("task_id", taskId)
      .eq("roomie_id", roomieId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      return {
        error: `Error checking existing rating: ${checkError.message}`,
        success: false,
      };
    }

    if (existingRating) {
      return {
        error: "You have already rated this task",
        success: false,
      };
    }

    // Create new rating
    const { data, error } = await supabase
      .from("task_ratings")
      .insert({
        task_id: taskId,
        roomie_id: roomieId,
        rating,
      })
      .select()
      .single();

    if (error) {
      return {
        error: `Error creating rating: ${error.message}`,
        success: false,
      };
    }

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in rateTaskCompletion:", error);
    return {
      error: "An unexpected error occurred while rating the task",
      success: false,
    };
  }
}

export async function getTaskAverageRating(
  taskId: number
): Promise<{ averageRating: number | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("task_ratings")
      .select("rating")
      .eq("task_id", taskId);

    if (error) {
      console.error("Error getting task ratings:", error);
      return { averageRating: null };
    }

    if (!data || data.length === 0) {
      return { averageRating: null };
    }

    const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
    const average = sum / data.length;

    return { averageRating: Number(average.toFixed(1)) };
  } catch (error) {
    console.error("Error in getTaskAverageRating:", error);
    return { averageRating: null };
  }
}

export async function hasRoomieRatedTask(
  taskId: number,
  roomieId: number
): Promise<{ hasRated: boolean; rating: number | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("task_ratings")
      .select("rating")
      .eq("task_id", taskId)
      .eq("roomie_id", roomieId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking if roomie rated task:", error);
      return { hasRated: false , rating: null};
    }

    return { hasRated: !!data, rating: data ? data.rating : null };
  } catch (error) {
    console.error("Error in hasRoomieRatedTask:", error);
    return { hasRated: false, rating: null };
  }
}

export async function getTaskRatings(taskId: number): Promise<{ data: TaskRating[] | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("task_ratings")
      .select("*")
      .eq("task_id", taskId);
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (e) {
    console.error("Error fetching task ratings:", e);
    return { data: null, error: "Failed to fetch task ratings" };
  }
}

export async function updateTaskRating(
  id: number,
  data: { rating?: number; comment?: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 10)) {
      return { success: false, error: "Rating must be between 1 and 10" };
    }
    
    const supabase = await createClient();
    
    // First get the rating to find the task_id
    const { data: rating, error: fetchError } = await supabase
      .from("task_ratings")
      .select("task_id")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    
    // Then get the task to find the room_id
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", rating.task_id)
      .single();
    
    if (taskError) {
      return { success: false, error: taskError.message };
    }
    
    const { error } = await supabase
      .from("task_ratings")
      .update(data)
      .eq("id", id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath(`/rooms/${task.room_id}/tasks`);
    revalidatePath(`/tasks/${rating.task_id}`);
    return { success: true, error: null };
  } catch (e) {
    console.error("Error updating task rating:", e);
    return { success: false, error: "Failed to update task rating" };
  }
}

export async function deleteTaskRating(id: number): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // First get the rating to find the task_id
    const { data: rating, error: fetchError } = await supabase
      .from("task_ratings")
      .select("task_id")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    
    // Then get the task to find the room_id
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", rating.task_id)
      .single();
    
    if (taskError) {
      return { success: false, error: taskError.message };
    }
    
    const { error } = await supabase
      .from("task_ratings")
      .delete()
      .eq("id", id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    revalidatePath(`/rooms/${task.room_id}/tasks`);
    revalidatePath(`/tasks/${rating.task_id}`);
    return { success: true, error: null };
  } catch (e) {
    console.error("Error deleting task rating:", e);
    return { success: false, error: "Failed to delete task rating" };
  }
} 