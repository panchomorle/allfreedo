"use client";

import React, { use, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, ArrowLeft, ListChecks, ListPlus } from "lucide-react";
import { createTaskFromTemplate } from "@/app/actions/task-templates";
import { TaskCard } from "@/components/task/task-card";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { isTemplateMatchingToday } from "@/lib/utils/recurring-tasks";
import { useTasks } from "@/contexts/tasks-context";
import { useRoom } from "@/contexts/rooms-context";
import { useRoomies } from "@/contexts/roomies-context";
import { useUser } from "@/contexts/user-context";

export default function RoomTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [creatingTask, setCreatingTask] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { id } = use(params);
  const roomId = parseInt(id);

  // Use contexts
  const { room, loading: roomLoading, error: roomError } = useRoom(roomId);
  const { roomies, loading: roomiesLoading } = useRoomies(roomId);
  const { 
    activeTasks, 
    completedTasks, 
    templates, 
    taskRatings, 
    hasRated, 
    loading: tasksLoading,
    error: tasksError,
    markTaskAsDone,
    processRecurringTasks
  } = useTasks(roomId);
  const { roomie: currentRoomie } = useUser();

  const handleMarkDone = async (taskId: number) => {
    try {
      await markTaskAsDone(taskId);
    } catch (e) {
      console.error("Error marking task as done:", e);
      setError("Failed to mark task as done");
    }
  };

  const filteredActiveTasks = activeTasks.filter(task => 
    task.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompletedTasks = completedTasks.filter(task => 
    task.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTaskFromTemplate = async (templateId: number) => {
    setCreatingTask(templateId);
    setError(null);
    
    try {
      const { success, error } = await createTaskFromTemplate(
        templateId,
        roomId,
        currentRoomie?.id || 0,
        new Date().toISOString().slice(0, 10),
        roomies
      );
      
      if (!success || error) {
        setError(error || "Failed to create task from template");
        setCreatingTask(null);
        return;
      }
      
      // Refresh tasks
      await processRecurringTasks();
    } catch (e) {
      console.error("Error creating task from template:", e);
      setError("An unexpected error occurred");
    } finally {
      setCreatingTask(null);
    }
  };

  if (roomLoading || tasksLoading || roomiesLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Loading tasks...</h1>
      </div>
    );
  }

  if (roomError || tasksError || !room) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Room not found</h1>
        <Link href="/">
          <Button variant="secondary">Back to Roomboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <Link href={`/rooms/${roomId}`} className="flex items-center gap-1 text-blue-600 mb-2">
            <ArrowLeft size={16} />
            Back to Room
          </Link>
          <h1 className="text-2xl font-bold">{room.name} - Tasks</h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          <Link href={`/rooms/${roomId}/tasks/new`}>
            <Button className="flex items-center gap-1">
              <Plus size={16} />
              New Task
            </Button>
          </Link>
          <Link href={`/rooms/${roomId}/task-templates`}>
            <Button variant="outlined" className="flex items-center gap-1">
              <ListPlus size={16} />
              Manage Templates
            </Button>
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftAddon={<span className="text-gray-400">🔍</span>}
          className="max-w-md"
        />
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Active Tasks
        </h2>
        
        {filteredActiveTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">No active tasks. Create a new task or set up task templates!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActiveTasks.map((task) => (
              <TaskCard
                key={task.id}
                roomId={roomId}
                task={task}
                currentRoomieId={currentRoomie?.id || undefined}
                onMarkDone={() => handleMarkDone(task.id)}
                averageRating={taskRatings[task.id] || undefined}
                hasRated={hasRated[task.id] || false}
              />
            ))}
          </div>
        )}
      </div>  
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ListChecks size={20} />
            Completed Tasks
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? "Hide" : "Show"}
          </Button>
        </div>
        
        {showCompleted && (
          filteredCompletedTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No completed tasks yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompletedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  roomId={roomId}
                  currentRoomieId={currentRoomie?.id || undefined}
                  onMarkDone={() => handleMarkDone(task.id)}
                  averageRating={taskRatings[task.id] || undefined}
                  hasRated={hasRated[task.id] || false}
                />
              ))}
            </div>
          )
        )}
      </div>
      
      {/* Add section for today's matching templates */}
      {templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Today's Tasks
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter(template => {
                if (!template.recurring || !template.recurrence_rule) {
                  console.log('Template not recurring or no rule:', template);
                  return false;
                }
                
                try {
                  const rule = JSON.parse(template.recurrence_rule);
                  console.log('Checking template:', {
                    templateName: template.name,
                    rule
                  });
                  return isTemplateMatchingToday(rule);
                } catch (e) {
                  console.error('Error parsing recurrence rule:', e);
                  return false;
                }
              })
              .map(template => (
                <Card key={template.id} className="bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Recurring
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleCreateTaskFromTemplate(template.id)}
                      disabled={creatingTask === template.id}
                      className="w-full"
                    >
                      {creatingTask === template.id ? "Creating..." : "Create Today's Task"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
          
          {templates.filter(template => {
            if (!template.recurring || !template.recurrence_rule) return false;
            try {
              const rule = JSON.parse(template.recurrence_rule);
              return isTemplateMatchingToday(rule);
            } catch (e) {
              console.error('Error parsing recurrence rule:', e);
              return false;
            }
          }).length === 0 && (
            <Card>
              <CardContent className="py-4 text-center text-gray-500">
                No recurring tasks scheduled for today
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
} 