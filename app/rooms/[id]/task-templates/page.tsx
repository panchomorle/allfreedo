import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getRoomById } from "@/app/actions/rooms";
import { getTaskTemplates } from "@/app/actions/task-templates";
import { TaskTemplatesList } from "@/components/room/task-templates-list";
import { ErrorBoundary } from "@/components/error-boundary";
import { Suspense } from "react";

async function getInitialData(roomId: number) {
  const [roomResponse, templatesResponse] = await Promise.all([
    getRoomById(roomId),
    getTaskTemplates(roomId)
  ]);

  if (!roomResponse.data || !templatesResponse.success) {
    console.error('Failed to fetch data:', { roomResponse, templatesResponse });
    throw new Error('Failed to fetch data');
  }

  return { 
    room: roomResponse.data, 
    templates: templatesResponse.data || [] 
  };
}

export const revalidate = 0; // Revalidate on every request

export default async function TaskTemplatesPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const roomId = parseInt(id);
  const { room, templates } = await getInitialData(roomId);

  console.log('Rendering TaskTemplatesPage with:', { room, templates });

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/rooms/${roomId}`}>
              <Button variant="outlined" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle>{room.name} - Task Templates</CardTitle>
          </div>
        </CardHeader>
      </Card>

      <ErrorBoundary>
        <Suspense fallback={<div>Loading templates...</div>}>
          <TaskTemplatesList
            templates={templates}
            roomId={roomId}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}