"use client";

import React, { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { Task, Roomie } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock, Star, Calendar, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRoomies } from "@/contexts/roomies-context";
import { useUser } from "@/contexts/user-context";
import { rateTaskCompletion, getTaskAverageRating, hasRoomieRatedTask } from "@/app/actions/task-ratings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskDetails } from "./task-details";

interface TaskCardProps {
  task: Task;
  roomId: number;
  onMarkDone?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function TaskCard({ task, roomId, onMarkDone, onDelete }: TaskCardProps) {
  const { roomie: currentRoomie } = useUser();
  const { roomies } = useRoomies(roomId);
  const [rating, setRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [markingDone, setMarkingDone] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const getRoomieById = (roomieId: number): Roomie | undefined => {
    return roomies?.find(roomie => roomie.id === roomieId);
  };

  const assignedRoomie = useMemo(() => getRoomieById(task.assigned_roomie_id), [task.assigned_roomie_id, roomies]);
  const completedByRoomie = useMemo(() => task.done_by ? getRoomieById(task.done_by) : undefined, [task.done_by, roomies]);
  
  const isAssignedToCurrentRoomie = task.assigned_roomie_id === currentRoomie?.id;
  const isOverdue = task.scheduled_date && new Date(task.scheduled_date) < new Date();

  useEffect(() => {
    const loadRatings = async () => {
      if (!task.is_done || !currentRoomie) return;

      try {
        const [avgRating, userRating] = await Promise.all([
          getTaskAverageRating(task.id),
          hasRoomieRatedTask(task.id, currentRoomie.id)
        ]);

        setAverageRating(avgRating.averageRating);
        setHasRated(userRating.hasRated);
        if (userRating.hasRated) {
          setRating(userRating.rating);
        }
      } catch (error) {
        console.error('Error loading ratings:', error);
      }
    };

    loadRatings();
  }, [task.id, task.is_done, currentRoomie]);

  const handleRating = async (value: number) => {
    if (!currentRoomie) return;

    setSubmittingRating(true);
    setRatingError(null);

    try {
      const result = await rateTaskCompletion(task.id, currentRoomie.id, value);
      if (!result.success) {
        throw new Error(result.error);
      }

      setRating(value);
      setHasRated(true);
      
      // Refresh average rating
      const avgRating = await getTaskAverageRating(task.id);
      setAverageRating(avgRating.averageRating);
    } catch (error) {
      setRatingError(error instanceof Error ? error.message : 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleMarkDone = async () => {
    if (!onMarkDone) return;

    setMarkingDone(true);
    try {
      await onMarkDone();
    } finally {
      setMarkingDone(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setDeletingTask(true);
    try {
      await onDelete();
    } finally {
      setDeletingTask(false);
    }
  };

  return (
    <Card className={task.is_done ? "bg-gray-50" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center justify-between">
            <span>{task.name}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deletingTask}
              >
                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
              </Button>
            </div>
          </CardTitle>
          {task.is_done ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isOverdue ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <Clock className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <TaskDetails task={task} assignedRoomie={assignedRoomie} completedByRoomie={completedByRoomie} />
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {task.is_done ? (
          <div className="w-full space-y-2">
            {currentRoomie && task.done_by !== currentRoomie.id ? (
              <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{hasRated ? "Rated: " : "Rate: "}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TooltipProvider key={value}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {hasRated ? (
                              <Star
                                className={`h-6 w-6 ${
                                  value <= (rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRating(value)}
                              disabled={submittingRating}
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  (rating || 0) >= value
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`} size={4}
                              />
                            </Button>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {hasRated 
                            ? <p>Rated {rating} star{rating !== 1 ? 's' : ''}</p>
                            : <p>Rate {value} star{value !== 1 ? 's' : ''}</p>
                          }
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  Average: {averageRating?.toFixed(1) || "N/A"}
                </span>
              </div>
              {ratingError && (
                <span className="text-sm text-red-500">{ratingError}</span>
              )}
              </>
            ) : currentRoomie && task.done_by === currentRoomie.id && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Average rating: {averageRating?.toFixed(1) || "N/A"}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleMarkDone}
              disabled={!isAssignedToCurrentRoomie || markingDone}
            >
              {markingDone ? "Marking as done..." : "Mark as done"}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}