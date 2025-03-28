import React from "react";
import { RoomTasksList } from "@/components/room/room-tasks-list";
import { RoomTasksActions } from "@/components/room/room-tasks-actions";
import { AvailableTaskTemplates } from "@/components/room/available-task-templates";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getRoomById } from "@/app/actions/rooms";
import { getTasks } from "@/app/actions/tasks";
import { getTaskTemplates } from "@/app/actions/task-templates";
import { ErrorBoundary } from "@/components/error-boundary";
import { Suspense } from "react";

async function getInitialData(roomId: number) {
  const [roomResponse, tasksResponse, templatesResponse] = await Promise.all([
    getRoomById(roomId),
    getTasks(roomId),
    getTaskTemplates(roomId)
  ]);

  if (!roomResponse.data || !tasksResponse.success || !templatesResponse.success) {
    console.error('Failed to fetch data:', { roomResponse, tasksResponse, templatesResponse });
    throw new Error('Failed to fetch data');
  }

  return {
    room: roomResponse.data,
    tasks: tasksResponse.data || [],
    templates: templatesResponse.data || []
  };
}

export const revalidate = 0; // Revalidate on every request

export default async function RoomTasksPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const roomId = parseInt(id);
  const { room, tasks, templates } = await getInitialData(roomId);

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
            <CardTitle>{room.name} - Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ErrorBoundary>
            <Suspense fallback={<div>Loading task actions...</div>}>
              <RoomTasksActions roomId={roomId} />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>

      <ErrorBoundary>
        <Suspense fallback={<div>Loading tasks...</div>}>
          <RoomTasksList initialTasks={tasks} roomId={roomId} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div>Loading templates...</div>}>
          <AvailableTaskTemplates 
            templates={templates}
            roomId={roomId} 
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}