"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ResponseData, TaskTemplate, Task } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { createTask } from "./tasks";
import { getRoomiesInRoom } from "./roomies";

export async function getTaskTemplates(
  roomId: number
): Promise<ResponseData<TaskTemplate[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("task_templates")
      .select("*")
      .eq("room_id", roomId)
      .order("name", { ascending: true });

    if (error) {
      return {
        error: `Error fetching task templates: ${error.message}`,
        success: false,
      };
    }

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in getTaskTemplates:", error);
    return {
      error: "An unexpected error occurred while fetching task templates",
      success: false,
    };
  }
}

export async function getTaskTemplateById(
  templateId: number
): Promise<ResponseData<TaskTemplate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("task_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error) {
      return {
        error: `Error fetching task template: ${error.message}`,
        success: false,
      };
    }

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in getTaskTemplateById:", error);
    return {
      error: "An unexpected error occurred while fetching the task template",
      success: false,
    };
  }
}

export async function createTaskTemplate(
  template: Omit<TaskTemplate, "id" | "created_at">
): Promise<ResponseData<TaskTemplate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("task_templates")
      .insert({
        ...template,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return {
        error: `Error creating task template: ${error.message}`,
        success: false,
      };
    }

    revalidatePath(`/rooms/${template.room_id}/task-templates`);
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in createTaskTemplate:", error);
    return {
      error: "An unexpected error occurred while creating the task template",
      success: false,
    };
  }
}

export async function updateTaskTemplate(
  templateId: number,
  updates: Partial<Omit<TaskTemplate, "id" | "created_at">>
): Promise<ResponseData<TaskTemplate>> {
  try {
      const supabase = await createClient();

    // First get the template to know the room_id for path revalidation
    const { data: template, error: templateError } = await supabase
      .from("task_templates")
      .select("room_id")
      .eq("id", templateId)
      .single();

    if (templateError) {
      return {
        error: `Error fetching task template: ${templateError.message}`,
        success: false,
      };
    }

    const { data, error } = await supabase
      .from("task_templates")
      .update(updates)
      .eq("id", templateId)
      .select()
      .single();

    if (error) {
      return {
        error: `Error updating task template: ${error.message}`,
        success: false,
      };
    }

    revalidatePath(`/rooms/${template.room_id}/task-templates`);
    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error("Error in updateTaskTemplate:", error);
    return {
      error: "An unexpected error occurred while updating the task template",
      success: false,
    };
  }
}

export async function deleteTaskTemplate(
  templateId: number
): Promise<ResponseData<null>> {
  try {
    const supabase = await createClient();

    // First get the template to know the room_id for path revalidation
    const { data: template, error: templateError } = await supabase
      .from("task_templates")
      .select("room_id")
      .eq("id", templateId)
      .single();

    if (templateError) {
      return {
        error: `Error fetching task template: ${templateError.message}`,
        success: false,
      };
    }

    const { error } = await supabase
      .from("task_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      return {
        error: `Error deleting task template: ${error.message}`,
        success: false,
      };
    }

    revalidatePath(`/rooms/${template.room_id}/task-templates`);
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error in deleteTaskTemplate:", error);
    return {
      error: "An unexpected error occurred while deleting the task template",
      success: false,
    };
  }
}

// Create a new task from a template
export async function createTasksFromTemplate(
  templateId: number
): Promise<ResponseData<Task>> {
  try {
    const supabase = await createClient();

    // First get the template details
    const { data: template, error: templateError } = await supabase
      .from("task_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      return {
        error: templateError 
          ? `Error fetching task template: ${templateError.message}` 
          : "Template not found",
        success: false,
      };
    }

    // Get roomies in the room for round-robin assignment
    const { data: roomies, error: roomiesError } = await getRoomiesInRoom(template.room_id);

    if (roomiesError || !roomies || roomies.length === 0) {
      return {
        error: roomiesError || "No roomies found in this room",
        success: false,
      };
    }

    // Find the index of the last assigned roomie or start with -1
    const lastAssignedIndex = template.last_assigned_roomie_index !== undefined
      ? template.last_assigned_roomie_index
      : -1;

    // Calculate the next roomie index using round-robin
    const nextRoomieIndex = (lastAssignedIndex + 1) % roomies.length;
    const assignedRoomie = roomies[nextRoomieIndex];

    // Calculate the scheduled date (default to tomorrow if not recurring)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);

    // Create the new task
    const taskData = {
      room_id: template.room_id,
      task_template_id: template.id,
      name: template.name,
      description: template.description,
      weight: template.weight,
      is_done: false,
      scheduled_date: scheduledDate.toISOString().slice(0, 10),
      done_by: null,
      assigned_roomie_id: assignedRoomie.id,
    };

    const taskResult = await createTask(taskData);

    if (!taskResult.data || taskResult.error) {
      return {
        error: taskResult.error || "Failed to create task from template",
        success: false,
      };
    }

    // Update the last assigned roomie index
    await updateTaskTemplate(templateId, {
      last_assigned_roomie_id: nextRoomieIndex
    });

    revalidatePath(`/rooms/${template.room_id}/tasks`);
    revalidatePath(`/rooms/${template.room_id}/task-templates`);
    
    return {
      data: taskResult.data,
      success: true,
    };
  } catch (error) {
    console.error("Error in createTasksFromTemplate:", error);
    return {
      error: "An unexpected error occurred while creating task from template",
      success: false,
    };
  }
}

export async function hasTaskBeenCreatedToday(templateId: number): Promise<boolean> {
  const supabase = await createClient();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('task_template_id', templateId)
      .gte('scheduled_date', today.toISOString())
      .lt('scheduled_date', tomorrow.toISOString())
      .single();

    if (error) {
      console.error('Error checking task creation:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking task creation:', error);
    return false;
  }
}

export async function createTaskFromTemplate(templateId: number): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  try {
    // First check if a task has already been created today
    const hasBeenCreated = await hasTaskBeenCreatedToday(templateId);
    if (hasBeenCreated) {
      return { success: false, error: 'A task from this template has already been created today' };
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return { success: false, error: 'Template not found' };
    }

    // Get the current roomie
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: roomie, error: roomieError } = await supabase
      .from('roomies')
      .select('id')
      .eq('auth_uuid', user.id)
      .single();

    if (roomieError || !roomie) {
      return { success: false, error: 'Roomie not found' };
    }

    // Create the task
    const { error: insertError } = await supabase
      .from('tasks')
      .insert({
        room_id: template.room_id,
        task_template_id: template.id,
        name: template.name,
        description: template.description,
        weight: template.weight,
        scheduled_date: new Date().toISOString(),
        assigned_roomie_id: roomie.id
      });

    if (insertError) {
      return { success: false, error: 'Failed to create task' };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error creating task from template:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
} 