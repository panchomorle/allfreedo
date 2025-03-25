"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash, Edit, ListChecks, Calendar } from "lucide-react";
import { getCurrentRoomie } from "@/app/actions/auth";
import { getRoomById } from "@/app/actions/rooms";
import { getTaskTemplates, deleteTaskTemplate, createTasksFromTemplate, createTaskFromTemplate } from "@/app/actions/task-templates";
import { Roomie, Room, TaskTemplate, RecurrenceRule } from "@/lib/types";
import { recurrenceRuleToString, isTemplateMatchingToday } from "@/lib/utils/recurring-tasks";

export default function TaskTemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentRoomie, setCurrentRoomie] = useState<Roomie | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingTemplate, setProcessingTemplate] = useState<number | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<number | null>(null);
  const [creatingTask, setCreatingTask] = useState<number | null>(null);
  
  const { id } = use(params);
  const roomId = parseInt(id);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Get current roomie
        const { roomie } = await getCurrentRoomie();
        if (!roomie) {
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
        
        // Get task templates
        const { data: templatesData, error: templatesError } = await getTaskTemplates(roomId);
        
        if (templatesError) {
          setError(templatesError);
          setLoading(false);
          return;
        }
        
        setTemplates(templatesData || []);
        setLoading(false);
      } catch (e) {
        console.error("Error loading data:", e);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    loadData();
  }, [roomId, router]);

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return;
    }
    
    setDeletingTemplate(templateId);
    setError(null);
    
    try {
      const { success, error } = await deleteTaskTemplate(templateId);
      
      if (!success || error) {
        setError(error || "Failed to delete template");
        setDeletingTemplate(null);
        return;
      }
      
      // Update the templates list
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (e) {
      console.error("Error deleting template:", e);
      setError("An unexpected error occurred");
    } finally {
      setDeletingTemplate(null);
    }
  };

  const handleCreateFromTemplate = async (templateId: number) => {
    setProcessingTemplate(templateId);
    setError(null);
    
    try {
      const { success, error } = await createTasksFromTemplate(templateId);
      
      if (!success || error) {
        setError(error || "Failed to create task from template");
        setProcessingTemplate(null);
        return;
      }
      
      // Redirect to tasks page
      router.push(`/rooms/${roomId}/tasks`);
    } catch (e) {
      console.error("Error creating task from template:", e);
      setError("An unexpected error occurred");
      setProcessingTemplate(null);
    }
  };

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
      
      // Refresh the templates list
      const { data: templatesData, error: templatesError } = await getTaskTemplates(roomId);
      if (!templatesError && templatesData) {
        setTemplates(templatesData);
      }
    } catch (e) {
      console.error("Error creating task from template:", e);
      setError("An unexpected error occurred");
    } finally {
      setCreatingTask(null);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Loading templates...</h1>
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
          <Link href={`/rooms/${roomId}/tasks`} className="flex items-center gap-1 text-blue-600 mb-2">
            <ArrowLeft size={16} />
            Back to Tasks
          </Link>
          <h1 className="text-2xl font-bold">{room.name} - Task Templates</h1>
        </div>
        
        <Link href={`/rooms/${roomId}/task-templates/new`}>
          <Button className="flex items-center gap-1">
            <Plus size={16} />
            New Template
          </Button>
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No task templates found. Create a new template to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const isMatchingToday = template.recurring && template.recurrence_rule && 
              isTemplateMatchingToday(JSON.parse(template.recurrence_rule));
            
            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.recurring && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Recurring
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-3">{template.description}</p>
                  <div className="flex flex-col gap-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2" />
                      <span>Importance: {template.weight}</span>
                    </div>
                    
                    {template.recurring && template.recurrence_rule && (
                      <div className="flex items-center">
                        <ListChecks size={16} className="mr-2" />
                        <span>Recurrence: {recurrenceRuleToString(JSON.parse(template.recurrence_rule))}</span>
                      </div>
                    )}
                    
                    {isMatchingToday && (
                      <div className="mt-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleCreateTaskFromTemplate(template.id)}
                          disabled={creatingTask === template.id}
                          className="w-full"
                        >
                          {creatingTask === template.id ? "Creating..." : "Create Today's Task"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={deletingTemplate === template.id}
                      className="flex items-center gap-1"
                    >
                      <Trash size={14} />
                      {deletingTemplate === template.id ? "Deleting..." : "Delete"}
                    </Button>
                    <Link href={`/rooms/${roomId}/task-templates/${template.id}/edit`}>
                      <Button
                        variant="outlined"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </Button>
                    </Link>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCreateFromTemplate(template.id)}
                    disabled={processingTemplate === template.id}
                    className="flex items-center gap-1"
                  >
                    <Plus size={14} />
                    {processingTemplate === template.id ? "Creating..." : "Create Task"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 