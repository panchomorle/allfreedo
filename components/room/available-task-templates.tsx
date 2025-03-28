"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Task, TaskTemplate } from "@/lib/types";
import { createTaskFromTemplate, hasTaskBeenCreatedToday } from "@/app/actions/task-templates";
import { useRouter } from "next/navigation";
import { isTemplateMatchingToday } from "@/lib/utils/recurring-tasks";
import { useUser } from "@/contexts/user-context";
import { useRoomies } from "@/contexts/roomies-context";

interface AvailableTaskTemplatesProps {
  templates: TaskTemplate[];
  roomId: number;
}

export function AvailableTaskTemplates({ templates, roomId }: AvailableTaskTemplatesProps) {
  const router = useRouter();
  const { roomie } = useUser();
  const { roomies } = useRoomies(roomId);
  const [creatingTask, setCreatingTask] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const todayTemplates = templates.filter((template) => {
    if (!template.recurring || !template.recurrence_rule) return false;
    
    try {
      const rule = JSON.parse(template.recurrence_rule);
      return isTemplateMatchingToday(rule);
    } catch (e) {
      console.error('Error parsing recurrence rule:', e);
      return false;
    }
  });

  const handleCreateTask = async (templateId: number) => {
    if (!roomie) {
      setError("You must be logged in to create tasks");
      return;
    }

    if (await hasTaskBeenCreatedToday(templateId)) {
      setError("A task from this template has already been created today");
      return;
    }

    setCreatingTask(templateId);
    setError(null);

    try {
      console.log('Creating task from template:', {
        templateId,
        roomId,
        roomieId: roomie.id,
        roomies
      });

      const today = new Date().toISOString().split('T')[0];
      const result = await createTaskFromTemplate(templateId, roomId, roomie.id, today, roomies || []);

      console.log('Task creation result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create task');
      }

      router.refresh();
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setCreatingTask(null);
    }
  };

  if (todayTemplates.length === 0) return null;

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-sm font-medium mb-3">Available Template Tasks for Today</h3>
      <div className="flex gap-2 flex-wrap">
        {todayTemplates.map((template) => (
          <Button
            key={template.id}
            variant="outlined"
            onClick={() => handleCreateTask(template.id)}
            disabled={creatingTask === template.id}
          >
            <Calendar className="h-4 w-4 mr-2" />
            {template.name}
          </Button>
        ))}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
