"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar } from "lucide-react";
import { createTask, createTaskFromTemplate } from "@/app/actions/tasks";
import { Roomie, Room, TaskTemplate } from "@/lib/types";
import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { useRoomies } from "@/contexts/roomies-context";

interface NewTaskFormProps {
  room: Room;
  templates: TaskTemplate[];
  roomId: number;
}

export function NewTaskForm({ room, templates, roomId }: NewTaskFormProps) {
  const router = useRouter();
  const { roomie } = useUser();
  const { roomies } = useRoomies(roomId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    dueDate: "",
    assignedRoomieId: roomie?.id?.toString() || "",
    templateId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let response;
      
      if (formData.templateId && formData.templateId !== "none") {
        // If a template is selected, use createTaskFromTemplate
        response = await createTaskFromTemplate(
          parseInt(formData.templateId),
          formData.dueDate ? new Date(formData.dueDate) : new Date()
        );
      } else {
        // Otherwise use the regular createTask
        response = await createTask({
          room_id: roomId,
          name: formData.name,
          description: formData.description,
          scheduled_date: formData.dueDate || null,
          assigned_roomie_id: formData.assignedRoomieId ? parseInt(formData.assignedRoomieId) : roomie?.id || 0,
          weight: 1,
          is_done: false,
          task_template_id: null,
        });
      }

      if (!response.data) {
        throw new Error(response.error || "Failed to create task");
      }

      router.push(`/rooms/${roomId}/tasks`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/rooms/${roomId}/tasks`}>
              <Button variant="outlined" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle>{room.name} - New Task</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateId">Template</Label>
            <Select
              value={formData.templateId}
              onValueChange={(value) => handleChange("templateId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Task Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              disabled={Boolean(formData.templateId && formData.templateId !== "none")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={Boolean(formData.templateId && formData.templateId !== "none")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange("dueDate", e.target.value)}
              disabled={Boolean(formData.templateId && formData.templateId !== "none")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedRoomieId">Assign To</Label>
            <Select
              value={formData.assignedRoomieId}
              onValueChange={(value) => handleChange("assignedRoomieId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select roomie" />
              </SelectTrigger>
              <SelectContent>
                {roomies?.map((roomie) => (
                  <SelectItem key={roomie.id} value={roomie.id.toString()}>
                    {roomie.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Link href={`/rooms/${roomId}/tasks`}>
            <Button variant="outlined" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Task"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </form>
  );
}
