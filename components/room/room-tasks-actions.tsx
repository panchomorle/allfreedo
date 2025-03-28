"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ListPlus } from "lucide-react";

interface RoomTasksActionsProps {
  roomId: number;
}

export function RoomTasksActions({ roomId }: RoomTasksActionsProps) {
  return (
    <div className="flex gap-4">
      <Link href={`/rooms/${roomId}/tasks/new`}>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </Link>
      <Link href={`/rooms/${roomId}/task-templates`}>
        <Button variant="outlined">
          <ListPlus className="h-4 w-4 mr-2" />
          Manage Templates
        </Button>
      </Link>
    </div>
  );
}
