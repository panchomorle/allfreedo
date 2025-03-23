"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar } from "lucide-react";
import { getCurrentRoomie } from "@/app/actions/auth";
import { getRoomById } from "@/app/actions/rooms";
import { getRoomiesInRoom } from "@/app/actions/roomies";
import { createTask } from "@/app/actions/tasks";
import { getTaskTemplates } from "@/app/actions/task-templates";
import { Roomie, Room, TaskTemplate } from "@/lib/types";

export default function NewTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentRoomie, setCurrentRoomie] = useState<Roomie | null>(null);
  const [roomies, setRoomies] = useState<Roomie[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState(1);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignedRoomieId, setAssignedRoomieId] = useState<number | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("weekly");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
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
        
        // Get roomies in room
        const { data: roomiesData } = await getRoomiesInRoom(roomId);
        setRoomies(roomiesData || []);
        
        if (roomiesData && roomiesData.length > 0) {
          setAssignedRoomieId(roomie.id);
        }
        
        // Get task templates
        const { data: templatesData } = await getTaskTemplates(roomId);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !scheduledDate || !assignedRoomieId) {
      setError("Please fill out all required fields");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const { data, error } = await createTask({
        room_id: roomId,
        name,
        description,
        assigned_roomie_id: assignedRoomieId,
        weight,
        is_done: false,
        scheduled_date: scheduledDate,
        recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        template_id: selectedTemplateId,
      });
      
      if (!data || error) {
        setError(error || "Failed to create task");
        setSubmitting(false);
        return;
      }
      
      router.push(`/rooms/${roomId}/tasks`);
    } catch (e) {
      console.error("Error creating task:", e);
      setError("An unexpected error occurred");
      setSubmitting(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const templateIdNum = parseInt(templateId);
    setSelectedTemplateId(templateIdNum === 0 ? null : templateIdNum);
    
    if (templateIdNum === 0) {
      // Reset form when "None" is selected
      return;
    }
    
    const selectedTemplate = templates.find(t => t.id === templateIdNum);
    
    if (selectedTemplate) {
      setName(selectedTemplate.name);
      setDescription(selectedTemplate.description);
      setWeight(selectedTemplate.weight);
      setIsRecurring(selectedTemplate.recurring);
      if (selectedTemplate.recurrence_rule) {
        setRecurrencePattern(selectedTemplate.recurrence_rule);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Loading...</h1>
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
      <div className="mb-6">
        <Link href={`/rooms/${roomId}/tasks`} className="flex items-center gap-1 text-blue-600 mb-2">
          <ArrowLeft size={16} />
          Back to Tasks
        </Link>
        <h1 className="text-2xl font-bold">Create New Task</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template">Use Template (Optional)</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template or create from scratch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None (Create from scratch)</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter task name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To *</Label>
              <Select value={assignedRoomieId?.toString()} onValueChange={(value) => setAssignedRoomieId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to a roomie" />
                </SelectTrigger>
                <SelectContent>
                  {roomies.map(roomie => (
                    <SelectItem 
                      key={roomie.id} 
                      value={roomie.id.toString()}
                    >
                      {roomie.name} {roomie.id === currentRoomie?.id ? "(You)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date *</Label>
              <div className="flex items-center">
                <Calendar size={16} className="mr-2 text-gray-500" />
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weight">Importance (1-5)</Label>
              <Select value={weight.toString()} onValueChange={(value) => setWeight(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Low</SelectItem>
                  <SelectItem value="2">2 - Medium-Low</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Medium-High</SelectItem>
                  <SelectItem value="5">5 - High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="isRecurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="isRecurring">This is a recurring task</Label>
            </div>
            
            {isRecurring && (
              <div className="space-y-2 pl-6 border-l-2 border-gray-200">
                <Label htmlFor="recurrencePattern">Recurrence Pattern</Label>
                <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurrence pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Link href={`/rooms/${roomId}/tasks`}>
              <Button variant="outlined" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Task"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 