"use client";

import React, { useState } from "react";
import { TaskCard } from "@/components/task/task-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListChecks, Plus } from "lucide-react";
import { Task } from "@/lib/types";
import { markTaskAsDone, deleteTask } from "@/app/actions/tasks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/contexts/user-context";

interface RoomTasksListProps {
  initialTasks: Task[];
  roomId: number;
}

export function RoomTasksList({ initialTasks, roomId }: RoomTasksListProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { roomie:currentRoomie } = useUser();

  const handleMarkDone = async (taskId: number) => {
    try {
      await markTaskAsDone(taskId, currentRoomie?.id || -1);
      // Force a server refresh
      router.refresh();
    } catch (error) {
      console.error('Error marking task as done:', error);
      setError(error instanceof Error ? error.message : "Failed to mark task as done");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const response = await deleteTask(taskId);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete task");
      }
      router.refresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError(error instanceof Error ? error.message : "Failed to delete task");
    }
  };

  const filteredTasks = initialTasks.filter((task) => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompletion = showCompleted ? task.is_done : !task.is_done;
    return matchesSearch && matchesCompletion;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="outlined"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          <ListChecks className="h-4 w-4 mr-2" />
          {showCompleted ? "Show Active" : "Show Completed"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            roomId={roomId}
            onMarkDone={() => handleMarkDone(task.id)}
            onDelete={() => handleDeleteTask(task.id)}
          />
        ))}
        {filteredTasks.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            {searchTerm
              ? "No tasks found matching your search"
              : showCompleted
              ? "No completed tasks"
              : "No active tasks"}
          </p>
        )}
      </div>
    </div>
  );
}
