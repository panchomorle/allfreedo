import React from "react";
import { getRoomById } from "@/app/actions/rooms";
import { getTaskTemplates } from "@/app/actions/task-templates";
import { NewTaskForm } from "@/components/room/new-task-form";
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

export default async function NewTaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const roomId = parseInt(id);
  const { room, templates } = await getInitialData(roomId);

  console.log('Rendering NewTaskPage with:', { room, templates });

  return (
    <div className="container py-6">
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <NewTaskForm
            room={room}
            templates={templates}
            roomId={roomId}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}