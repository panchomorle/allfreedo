import { format } from "date-fns";
import { Task, Roomie } from "@/lib/types";
import { User, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskDetailsProps {
  task: Task;
  assignedRoomie?: Roomie;
  completedByRoomie?: Roomie;
}

export function TaskDetails({ task, assignedRoomie, completedByRoomie }: TaskDetailsProps) {
  const formattedDueDate = task.scheduled_date
    ? format(new Date(task.scheduled_date), 'MMM d, yyyy')
    : "No due date";

  const formattedDoneDate = task.done_date
    ? format(new Date(task.done_date), 'MMM d, yyyy')
    : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">{task.description}</p>
      
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Calendar className="h-4 w-4" />
        <span>{task.is_done ? "Completed on " + formattedDoneDate : formattedDueDate}</span>
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="h-6 w-6">
          {assignedRoomie?.avatar ? (
            <AvatarImage src={assignedRoomie.avatar} alt={assignedRoomie.name} />
          ) : (
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          )}
        </Avatar>
        <span className="text-sm text-gray-600">
          {task.is_done ? "Completed by " : "Assigned to "}
          {(task.is_done ? completedByRoomie : assignedRoomie)?.name || "Unknown"}
        </span>
      </div>
    </div>
  );
}