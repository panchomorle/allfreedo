export interface Room {
  id: number;
  name: string;
  description: string;
  access_code: string;
  created_at: string;
  created_by: number;
}

export interface Roomie {
  id: number;
  name: string;
  user_id: string;
  profile_image?: string | null;
  created_at: string;
}

export interface Task {
  id: number;
  room_id: number;
  name: string;
  description: string;
  assigned_roomie_id: number;
  weight: number;
  is_done: boolean;
  done_date?: string | null;
  scheduled_date: string | null;
  recurring: boolean;
  recurrence_pattern?: string | null;
  template_id?: number | null;
  created_at: string;
}

export interface TaskTemplate {
  id: number;
  room_id: number;
  name: string;
  description: string;
  weight: number;
  recurring: boolean;
  recurrence_rule?: string | null;
  created_at: string;
  created_by: number | null;
  last_assigned_roomie_id?: number | null;
}

export interface TaskRating {
  id: number;
  task_id: number;
  roomie_id: number;
  rating: number;
  created_at: string;
}

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type ResponseData<T> = {
  data?: T;
  error?: string;
  success?: boolean;
}; 