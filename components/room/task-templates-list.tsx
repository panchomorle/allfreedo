"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, ListChecks, Calendar } from "lucide-react";
import { TaskTemplate } from "@/lib/types";
import { deleteTaskTemplate, createTaskFromTemplate } from "@/app/actions/task-templates";
import { recurrenceRuleToString, isTemplateMatchingToday } from "@/lib/utils/recurring-tasks";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TaskTemplatesListProps {
  templates: TaskTemplate[];
  roomId: number;
}

export function TaskTemplatesList({ templates, roomId }: TaskTemplatesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [processingTemplate, setProcessingTemplate] = useState<number | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      setDeletingTemplate(templateId);
      const response = await deleteTaskTemplate(templateId);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete template");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setDeletingTemplate(null);
    }
  };

  const handleCreateTask = async (templateId: number) => {
    try {
      setProcessingTemplate(templateId);
      await createTaskFromTemplate(
        templateId,
        roomId,
        0, // roomieId - will be assigned by the server
        new Date().toISOString().slice(0, 10),
        [] // roomies - will be handled by the server
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setProcessingTemplate(null);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center justify-between">
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Link href={`/rooms/${roomId}/task-templates/new`}>
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{template.name}</span>
                <div className="flex gap-2">
                  <Link href={`/rooms/${roomId}/task-templates/${template.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={deletingTemplate === template.id}
                  >
                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              {template.recurring && template.recurrence_rule && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>{recurrenceRuleToString(JSON.parse(template.recurrence_rule))}</span>
                </div>
              )}
              <Button
                variant="outlined"
                size="sm"
                className="w-full"
                onClick={() => handleCreateTask(template.id)}
                disabled={processingTemplate === template.id}
              >
                <ListChecks className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No task templates found
          </CardContent>
        </Card>
      )}
    </div>
  );
}
