"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Task, TaskTemplate } from "@/lib/types";
import { getTaskTemplateById } from "./task-templates";
import { getRoomiesInRoom } from "./roomies";
import { ResponseData } from "@/lib/types";

// RecurrenceRule type definition
interface RecurrenceRule {
  frequency: string;
  interval: number;
  byDay?: string[];
  byMonthDay?: number[];
  byMonth?: number[];
}

// Helper to find next date based on recurrence rule
function getNextOccurrence(rule: RecurrenceRule, lastDate: Date): Date {
  const nextDate = new Date(lastDate);
  
  switch (rule.frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + rule.interval);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + (rule.interval * 7));
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + rule.interval);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + rule.interval);
      break;
  }
  
  return nextDate;
}

// Function to select the next roomie in round-robin fashion
async function getNextRoomie(roomId: number, lastAssignedRoomieId: number | null): Promise<number | null> {
  const { data: roomies, error } = await getRoomiesInRoom(roomId);
  
  if (error || !roomies || roomies.length === 0) {
    return null;
  }
  
  // If no previous assignment or only one roomie, assign to first roomie
  if (lastAssignedRoomieId === null || roomies.length === 1) {
    return roomies[0].id;
  }
  
  // Find the index of the last assigned roomie
  const lastIndex = roomies.findIndex(roomie => roomie.id === lastAssignedRoomieId);
  
  // If not found (might have left the room), start from the beginning
  if (lastIndex === -1) {
    return roomies[0].id;
  }
  
  // Return the next roomie in the list, cycling back to the start if needed
  const nextIndex = (lastIndex + 1) % roomies.length;
  return roomies[nextIndex].id;
}

// Helper function to update the last assigned roomie index
async function updateLastAssignedRoomie(templateId: number, index: number): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("task_templates")
      .update({ last_assigned_roomie_index: index })
      .eq("id", templateId);
    
    return !error;
  } catch (e) {
    console.error("Error updating last assigned roomie index:", e);
    return false;
  }
}

export async function createTaskFromTemplate(
  templateId: number, 
  scheduledDate: Date = new Date()
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // Get the template
    const { data: template, error: templateError } = await getTaskTemplateById(templateId);
    
    if (templateError || !template) {
      return { data: null, error: templateError || "Template not found" };
    }
    
    // Get roomies in the room
    const { data: roomies, error: roomiesError } = await getRoomiesInRoom(template.room_id);
    
    if (roomiesError || !roomies || roomies.length === 0) {
      return { data: null, error: "No roomies found in this room" };
    }
    
    // Determine which roomie to assign the task to
    let assignedRoomieIndex = 0;
    
    if (template.last_assigned_roomie_id !== null && template.last_assigned_roomie_id !== undefined) {
      assignedRoomieIndex = (template.last_assigned_roomie_id + 1) % roomies.length;
    }
    
    const assignedRoomie = roomies[assignedRoomieIndex];
    
    // Update the template with the new last assigned roomie
    await updateLastAssignedRoomie(templateId, assignedRoomieIndex);
    
    // Create the task
    const taskData = {
      room_id: template.room_id,
      name: template.name,
      description: template.description,
      assigned_roomie_id: assignedRoomie.id,
      weight: template.weight,
      is_done: false,
      scheduled_date: scheduledDate.toISOString(),
      recurring: template.recurring,
      recurrence_rule: template.recurrence_rule,
      template_id: templateId
    };
    
    const { data, error } = await supabase
      .from("tasks")
      .insert(taskData)
      .select()
      .single();
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    revalidatePath(`/rooms/${template.room_id}/tasks`);
    return { data, error: null };
  } catch (e) {
    console.error("Error creating task from template:", e);
    return { data: null, error: "An unexpected error occurred" };
  }
}

export async function createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<{ data: Task | null; error: string | null }> {
  const { room_id, name, description, weight, assigned_roomie_id, scheduled_date } = task;

  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("tasks")
      .insert([{
        room_id,
        name,
        description,
        weight,
        is_done: false,
        done_date: null,
        done_by: null,
        scheduled_date,
        assigned_roomie_id,
        task_template_id: null,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    revalidatePath(`/rooms/${room_id}/tasks`);
    return { data, error: null };
  } catch (e) {
    console.error("Error creating task:", e);
    return { data: null, error: "Failed to create task" };
  }
}

interface TaskFilters {
  completed?: boolean;
  assignedRoomieId?: number;
  afterDate?: string;
  beforeDate?: string;
}

export async function getTasks(
  roomId: number,
  filters: TaskFilters = {}
): Promise<ResponseData<Task[]>> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("room_id", roomId)
      .order("scheduled_date", { ascending: true });

    if (filters.completed !== undefined) {
      query = query.eq("is_done", filters.completed);
    }

    if (filters.assignedRoomieId !== undefined) {
      query = query.eq("assigned_roomie_id", filters.assignedRoomieId);
    }

    if (filters.afterDate) {
      query = query.gte("scheduled_date", filters.afterDate);
    }

    if (filters.beforeDate) {
      query = query.lte("scheduled_date", filters.beforeDate);
    }

    const { data, error } = await query;

    if (error) {
      return {
        error: `Error fetching tasks: ${error.message}`,
        success: false,
      };
    }
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in getTasks:", error);
    return {
      error: "An unexpected error occurred while fetching tasks",
      success: false,
    };
  }
}

export async function getTaskById(taskId: number): Promise<ResponseData<Task>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) {
      return {
        error: `Error fetching task: ${error.message}`,
        success: false,
      };
    }

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in getTaskById:", error);
    return {
      error: "An unexpected error occurred while fetching the task",
      success: false,
    };
  }
}

export async function markTaskAsDone(taskId: number): Promise<ResponseData<Task>> {
  try {
    const supabase = await createClient();
    
    // First get the task to know the room_id for path revalidation
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) {
      return {
        error: `Error fetching task: ${taskError.message}`,
        success: false,
      };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        is_done: true,
        done_date: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      return {
        error: `Error marking task as done: ${error.message}`,
        success: false,
      };
    }

    revalidatePath(`/rooms/${task.room_id}/tasks`);
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in markTaskAsDone:", error);
    return {
      error: "An unexpected error occurred while marking the task as done",
      success: false,
    };
  }
}

export async function updateTask(
  taskId: number,
  updates: Partial<Omit<Task, "id" | "created_at">>
): Promise<ResponseData<Task>> {
  try {
    const supabase = await createClient();
    
    // First get the task to know the room_id for path revalidation
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", taskId)
      .single();

    if (taskError) {
      return {
        error: `Error fetching task: ${taskError.message}`,
        success: false,
      };
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      return {
        error: `Error updating task: ${error.message}`,
        success: false,
      };
    }

    revalidatePath(`/rooms/${task.room_id}/tasks`);
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in updateTask:", error);
    return {
      error: "An unexpected error occurred while updating the task",
      success: false,
    };
  }
}

export async function deleteTask(taskId: number): Promise<ResponseData<null>> {
  try {
    const supabase = await createClient();
    
    // First get the task to know the room_id for path revalidation
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("room_id")
      .eq("id", taskId)
      .single();

    if (taskError) {
      return {
        error: `Error fetching task: ${taskError.message}`,
        success: false,
      };
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      return {
        error: `Error deleting task: ${error.message}`,
        success: false,
      };
    }

    revalidatePath(`/rooms/${task.room_id}/tasks`);
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteTask:", error);
    return {
      error: "An unexpected error occurred while deleting the task",
      success: false,
    };
  }
}

export async function processRecurringTasks(): Promise<ResponseData<null>> {
  try {
    const supabase = await createClient();
    
    // Call the server-side function to process recurring tasks
    const { error } = await supabase.rpc('process_recurring_tasks');

    if (error) {
      return {
        error: `Error processing recurring tasks: ${error.message}`,
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in processRecurringTasks:", error);
    return {
      error: "An unexpected error occurred while processing recurring tasks",
      success: false,
    };
  }
} 