"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Task, Roomie } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/rating/star-rating";
import { rateTaskCompletion } from "@/app/actions/task-ratings";
import { useRoomies } from "@/contexts/roomies-context";

interface TaskCardProps {
  task: Task;
  roomId: number;
  currentRoomieId?: number;
  onMarkDone?: () => Promise<void>;
  averageRating?: number | null;
  hasRated?: boolean;
}

export function TaskCard({
  task,
  roomId,
  currentRoomieId,
  onMarkDone,
  averageRating = null,
  hasRated = false,
}: TaskCardProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [markingDone, setMarkingDone] = useState(false);
  const { roomies } = useRoomies(roomId);

  const getRoomieById = (roomieId: number): Roomie | undefined => {
    return roomies.find(roomie => roomie.id === roomieId);
  };

  const assignedRoomie = useMemo(() => getRoomieById(task.assigned_roomie_id), [task.assigned_roomie_id, roomies]);
  
  const isAssignedToCurrentRoomie = task.assigned_roomie_id === currentRoomieId;
  const isOverdue = task.scheduled_date && new Date(task.scheduled_date) < new Date();
  
  const formattedDueDate = task.scheduled_date
    ? formatDistanceToNow(new Date(task.scheduled_date), { addSuffix: true })
    : "No due date";
  
  const handleRateTask = async (value: number) => {
    if (!currentRoomieId || !task.is_done) return;
    
    setRating(value);
    setSubmittingRating(true);
    setRatingError(null);
    
    try {
      const { success, error } = await rateTaskCompletion(task.id, currentRoomieId, value);
      
      if (!success || error) {
        setRatingError(error || "Failed to submit rating");
      }
    } catch (e) {
      setRatingError("An unexpected error occurred");
    } finally {
      setSubmittingRating(false);
    }
  };
  
  const handleMarkDone = async () => {
    if (!onMarkDone) return;
    
    setMarkingDone(true);
    await onMarkDone();
    setMarkingDone(false);
  };
  
  return (
    <Card className={`overflow-hidden border-l-4 ${
      task.is_done
        ? "border-l-green-500"
        : isOverdue
        ? "border-l-red-500"
        : "border-l-blue-500"
    }`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{task.name}</CardTitle>
          {task.task_template_id && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock size={12} />
              From template
            </Badge>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          {task.is_done ? (
            <div className="flex items-center text-green-600">
              <CheckCircle size={14} className="mr-1" />
              Completed
            </div>
          ) : isOverdue ? (
            <div className="flex items-center text-red-600">
              <AlertTriangle size={14} className="mr-1" />
              Due {formattedDueDate}
            </div>
          ) : (
            <div className="flex items-center">
              <Clock size={14} className="mr-1" />
              Due {formattedDueDate}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-gray-700 mb-3">{task.description}</p>
        
        {assignedRoomie && (
          <div className="flex items-center mt-2">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarFallback>{assignedRoomie.name.charAt(0)}</AvatarFallback>
              {assignedRoomie.avatar && (
                <AvatarImage src={assignedRoomie.avatar} alt={assignedRoomie.name} />
              )}
            </Avatar>
            <span className="text-sm text-gray-600">
              Assigned to {assignedRoomie.name}
              {isAssignedToCurrentRoomie && " (You)"}
            </span>
          </div>
        )}
        
        {task.is_done && averageRating !== null && (
          <div className="flex items-center mt-3">
            <Star size={16} className="text-yellow-500 mr-1" />
            <span className="text-sm">
              {averageRating > 0 
                ? `Average rating: ${averageRating.toFixed(1)} / 5`
                : "No ratings yet"}
            </span>
          </div>
        )}
      </CardContent>
      
      {(!task.is_done && onMarkDone) && (
        <CardFooter className="pt-0">
          <Button 
            onClick={handleMarkDone} 
            disabled={markingDone}
            className="w-full"
            size="sm"
          >
            {markingDone ? "Marking as done..." : "Mark as done"}
          </Button>
        </CardFooter>
      )}
      
      {(task.is_done && currentRoomieId && !hasRated) && (
        <CardFooter className="pt-0 flex-col items-start">
          <div className="w-full">
            <p className="text-sm font-medium mb-1">Rate this task:</p>
            <StarRating
              value={rating}
              onChange={handleRateTask}
              disabled={submittingRating}
            />
            
            {ratingError && (
              <p className="text-red-500 text-xs mt-1">{ratingError}</p>
            )}
          </div>
        </CardFooter>
      )}
      
      {(task.is_done && hasRated) && (
        <CardFooter className="pt-0">
          <p className="text-sm text-gray-500">You've rated this task</p>
        </CardFooter>
      )}
    </Card>
  );
} 