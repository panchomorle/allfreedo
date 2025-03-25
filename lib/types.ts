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
  avatar?: string | null;
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
  done_by?: number | null;
  scheduled_date: string | null;
  task_template_id?: number | null;
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

export const DaysOfWeek = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;

export type DayOfWeek = typeof DaysOfWeek[number];

export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  interval: number;
  byDay?: DayOfWeek[];
  byMonthDay?: number[];
  byMonth?: number[];
};

export type ResponseData<T> = {
  data?: T;
  error?: string;
  success?: boolean;
}; 