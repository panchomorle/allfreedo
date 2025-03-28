"use client";

import React, { createContext, useContext, useState } from "react";
import { Task, TaskTemplate } from "@/lib/types";
import { getTasks, markTaskAsDone, processRecurringTasks } from "@/app/actions/tasks";
import { getTaskTemplates } from "@/app/actions/task-templates";
import { getTaskAverageRating, hasRoomieRatedTask } from "@/app/actions/task-ratings";
import { useUser } from "@/contexts/user-context";

interface TasksContextType {
  tasksByRoom: Record<number, {
    activeTasks: Task[];
    completedTasks: Task[];
    templates: TaskTemplate[];
    taskRatings: Record<number, number | null>;
    hasRated: Record<number, boolean>;
    loading: boolean;
    error: string | null;
  }>;
  refreshTasks: (roomId: number) => Promise<void>;
  markTaskAsDone: (taskId: number) => Promise<void>;
  processRecurringTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

interface RoomState {
  activeTasks: Task[];
  completedTasks: Task[];
  templates: TaskTemplate[];
  taskRatings: Record<number, number | null>;
  hasRated: Record<number, boolean>;
  loading: boolean;
  error: string | null;
}

const initialRoomState: RoomState = {
  activeTasks: [],
  completedTasks: [],
  templates: [],
  taskRatings: {},
  hasRated: {},
  loading: true,
  error: null
};

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasksByRoom, setTasksByRoom] = useState<Record<number, RoomState>>({});
  const { roomie:currentRoomie } = useUser();

  const fetchTasks = async (roomId: number) => {
    // Initialize room state if it doesn't exist
    if (!tasksByRoom[roomId]) {
      setTasksByRoom(prev => ({
        ...prev,
        [roomId]: { ...initialRoomState }
      }));
    }

    // If we already have data for this room and it's not loading, don't fetch again
    if (tasksByRoom[roomId] && !tasksByRoom[roomId].loading) {
      return;
    }

    setTasksByRoom(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        loading: true,
        error: null
      }
    }));

    try {
      // Process recurring tasks first
      await processRecurringTasks();
      
      // Fetch active and completed tasks
      const [activeTasksResult, completedTasksResult, templatesResult] = await Promise.all([
        getTasks(roomId, { completed: false }),
        getTasks(roomId, { completed: true }),
        getTaskTemplates(roomId)
      ]);
      
      if (activeTasksResult.error) {
        throw new Error(activeTasksResult.error);
      }
      
      if (completedTasksResult.error) {
        throw new Error(completedTasksResult.error);
      }
      
      if (templatesResult.error) {
        throw new Error(templatesResult.error);
      }
      
      const activeTasks = activeTasksResult.data || [];
      const completedTasks = completedTasksResult.data || [];
      const templates = templatesResult.data || [];
      
      // Fetch ratings and hasRated status for all tasks
      const allTasks = [...activeTasks, ...completedTasks];
      
      const ratingsPromises = allTasks.map(async (task) => {
        const { averageRating } = await getTaskAverageRating(task.id);
        return { taskId: task.id, rating: averageRating };
      });
      
      const hasRatedPromises = allTasks.map(async (task) => {
        if (!task.is_done) return { taskId: task.id, hasRated: false };
        const { hasRated } = await hasRoomieRatedTask(task.id, task.assigned_roomie_id);
        return { taskId: task.id, hasRated };
      });
      
      const [ratingsResults, hasRatedResults] = await Promise.all([
        Promise.all(ratingsPromises),
        Promise.all(hasRatedPromises)
      ]);
      
      const ratingsMap: Record<number, number | null> = {};
      const hasRatedMap: Record<number, boolean> = {};
      
      ratingsResults.forEach(({ taskId, rating }) => {
        ratingsMap[taskId] = rating;
      });
      
      hasRatedResults.forEach(({ taskId, hasRated }) => {
        hasRatedMap[taskId] = hasRated;
      });

      setTasksByRoom(prev => ({
        ...prev,
        [roomId]: {
          activeTasks,
          completedTasks,
          templates,
          taskRatings: ratingsMap,
          hasRated: hasRatedMap,
          loading: false,
          error: null
        }
      }));
    } catch (err) {
      setTasksByRoom(prev => ({
        ...prev,
        [roomId]: {
          ...prev[roomId],
          loading: false,
          error: err instanceof Error ? err.message : "Failed to fetch tasks"
        }
      }));
    }
  };

  const handleMarkTaskAsDone = async (taskId: number) => {
    try {
      const { success, error } = await markTaskAsDone(taskId, currentRoomie?.id || -1);
      
      if (!success || error) {
        throw new Error(error || "Failed to mark task as done");
      }

      // Find the room that contains this task
      const roomId = Object.entries(tasksByRoom).find(([_, state]) => 
        state.activeTasks.some(task => task.id === taskId) ||
        state.completedTasks.some(task => task.id === taskId)
      )?.[0];

      if (roomId) {
        // Refresh the tasks for this room
        await fetchTasks(parseInt(roomId));
      }
    } catch (err) {
      console.error("Error marking task as done:", err);
      throw err;
    }
  };

  const handleProcessRecurringTasks = async () => {
    try {
      await processRecurringTasks();
      
      // Refresh tasks for all rooms
      await Promise.all(
        Object.keys(tasksByRoom).map(roomId => fetchTasks(parseInt(roomId)))
      );
    } catch (err) {
      console.error("Error processing recurring tasks:", err);
      throw err;
    }
  };

  return (
    <TasksContext.Provider 
      value={{ 
        tasksByRoom,
        refreshTasks: fetchTasks,
        markTaskAsDone: handleMarkTaskAsDone,
        processRecurringTasks: handleProcessRecurringTasks
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks(roomId: number) {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider");
  }

  const roomData = context.tasksByRoom[roomId] || { ...initialRoomState };

  // Fetch tasks on mount if not already loaded
  React.useEffect(() => {
    // Always fetch on mount if we don't have data for this room
    if (!context.tasksByRoom[roomId]) {
      context.refreshTasks(roomId);
    }
  }, [roomId, context]);

  return {
    ...roomData,
    refreshTasks: () => context.refreshTasks(roomId),
    markTaskAsDone: context.markTaskAsDone,
    processRecurringTasks: context.processRecurringTasks
  };
} 