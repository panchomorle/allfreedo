"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, ArrowLeft, ListChecks, ListPlus } from "lucide-react";
import { getCurrentRoomie } from "@/app/actions/auth";
import { getRoomById } from "@/app/actions/rooms";
import { getTasks, markTaskAsDone, processRecurringTasks } from "@/app/actions/tasks";
import { getTaskAverageRating, hasRoomieRatedTask } from "@/app/actions/task-ratings";
import { getRoomiesInRoom } from "@/app/actions/roomies";
import { getTaskTemplates, createTaskFromTemplate } from "@/app/actions/task-templates";
import { Roomie, Room, Task, TaskTemplate, RecurrenceRule } from "@/lib/types";
import { TaskCard } from "@/components/task/task-card";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { isTemplateMatchingToday } from "@/lib/utils/recurring-tasks";

export default function RoomTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentRoomie, setCurrentRoomie] = useState<Roomie | null>(null);
  const [roomies, setRoomies] = useState<Roomie[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskRatings, setTaskRatings] = useState<Record<number, number | null>>({});
  const [hasRated, setHasRated] = useState<Record<number, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [creatingTask, setCreatingTask] = useState<number | null>(null);
  
  const { id } = use(params);
  const roomId = parseInt(id);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Get current roomie
        const { roomie, error: roomieError } = await getCurrentRoomie();
        
        // Handle auth errors
        if (roomieError?.includes('Auth session missing')) {
          console.log('Auth session missing, redirecting to sign-in');
          router.push("/sign-in");
          return;
        }
        
        if (!roomie) {
          console.log('No roomie found, redirecting to create profile');
          router.push("/create-profile");
          return;
        }
        
        setCurrentRoomie(roomie);
        
        // Get room details
        const { data: roomData, error: roomError } = await getRoomById(roomId);
        
        if (roomError || !roomData) {
          setError(roomError || "Failed to load room");
          setLoading(false);
          return;
        }
        
        setRoom(roomData);
        
        // Process recurring tasks
        await processRecurringTasks();
        
        // Get active tasks
        const { data: activeTasksData, error: activeTasksError } = await getTasks(roomId, { completed: false });
        
        if (activeTasksError) {
          setError(activeTasksError);
          setLoading(false);
          return;
        }
        
        setActiveTasks(activeTasksData || []);
        
        // Get completed tasks
        const { data: completedTasksData, error: completedTasksError } = await getTasks(roomId, { completed: true });
        
        if (completedTasksError) {
          setError(completedTasksError);
          setLoading(false);
          return;
        }
        
        setCompletedTasks(completedTasksData || []);
        
        // Get roomies
        const { data: roomiesData } = await getRoomiesInRoom(roomId);
        setRoomies(roomiesData || []);
        
        // Get task ratings
        const allTasks = [...(activeTasksData || []), ...(completedTasksData || [])];
        
        const ratingsPromises = allTasks.map(async (task) => {
          const { averageRating } = await getTaskAverageRating(task.id);
          return { taskId: task.id, rating: averageRating };
        });
        
        const hasRatedPromises = allTasks.map(async (task) => {
          if (!roomie || !task.is_done) return { taskId: task.id, hasRated: false };
          const { hasRated } = await hasRoomieRatedTask(task.id, roomie.id);
          return { taskId: task.id, hasRated };
        });
        
        const ratingsResults = await Promise.all(ratingsPromises);
        const hasRatedResults = await Promise.all(hasRatedPromises);
        
        const ratingsMap: Record<number, number | null> = {};
        const hasRatedMap: Record<number, boolean> = {};
        
        ratingsResults.forEach(({ taskId, rating }) => {
          ratingsMap[taskId] = rating;
        });
        
        hasRatedResults.forEach(({ taskId, hasRated }) => {
          hasRatedMap[taskId] = hasRated;
        });
        
        setTaskRatings(ratingsMap);
        setHasRated(hasRatedMap);
        
        // Get task templates
        const { data: templatesData, error: templatesError } = await getTaskTemplates(roomId);
        if (!templatesError && templatesData) {
          console.log('Loaded templates:', templatesData);
          setTemplates(templatesData);
        }
        
        setLoading(false);
      } catch (e) {
        console.error("Error loading data:", e);
        // Check if it's an auth error
        if (e instanceof Error && e.message.includes('Auth session missing')) {
          console.log('Auth session missing, redirecting to sign-in');
          router.push("/sign-in");
          return;
        }
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    loadData();
  }, [roomId, router, refreshKey]);

  const handleMarkDone = async (taskId: number) => {
    const { success, error: markError } = await markTaskAsDone(taskId);
    
    if (!success || markError) {
      setError(markError || "Failed to mark task as done");
      return;
    }
    
    // Refresh the data
    setRefreshKey(prev => prev + 1);
  };

  const getRoomieById = (roomieId: number): Roomie | undefined => {
    return roomies.find(roomie => roomie.id === roomieId);
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
      const { success, error } = await createTaskFromTemplate(templateId);
      
      if (!success || error) {
        setError(error || "Failed to create task from template");
        setCreatingTask(null);
        return;
      }
      
      // Refresh the data
      setRefreshKey(prev => prev + 1);
    } catch (e) {
      console.error("Error creating task from template:", e);
      setError("An unexpected error occurred");
    } finally {
      setCreatingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Loading tasks...</h1>
      </div>
    );
  }

  if (!room) {
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
                task={task}
                assignedRoomie={getRoomieById(task.assigned_roomie_id)}
                currentRoomieId={currentRoomie?.id}
                onMarkDone={() => handleMarkDone(task.id)}
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
                  assignedRoomie={getRoomieById(task.assigned_roomie_id)}
                  currentRoomieId={currentRoomie?.id}
                  averageRating={taskRatings[task.id]}
                  hasRated={hasRated[task.id]}
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