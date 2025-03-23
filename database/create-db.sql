--THIS IS THE SQL SCRIPT USED TO CREATE THE DATABASE IN SUPABASE (POSTGRESQL)

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    access_code TEXT NOT NULL UNIQUE
);

-- Roomies table
CREATE TABLE IF NOT EXISTS roomies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    auth_uuid UUID NOT NULL,
    FOREIGN KEY (auth_uuid) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Intermediate table to relate roomies to rooms (many-to-many)
CREATE TABLE IF NOT EXISTS roomie_room (
    room_id INTEGER NOT NULL,
    roomie_id INTEGER NOT NULL,
    PRIMARY KEY (room_id, roomie_id),
    FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    FOREIGN KEY (roomie_id) REFERENCES roomies (id) ON DELETE CASCADE
);

-- Recurring task templates table
CREATE TABLE IF NOT EXISTS task_templates (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    weight INTEGER NOT NULL,
    recurrence_rule TEXT NOT NULL, -- Example: cron format or JSON with periodicity
    last_assigned_roomie_id INTEGER,
    FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    FOREIGN KEY (last_assigned_roomie_id) REFERENCES roomies (id)
);

-- Tasks table (concrete instances)
-- All necessary columns are stored in this table as non-nullable (except done_date and task_template_id)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL,
    task_template_id INTEGER, -- Can be null if it's an ad-hoc task, but creation logic will copy template data to other fields
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    weight INTEGER NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT false,
    scheduled_date TIMESTAMP NOT NULL,
    done_date TIMESTAMP, -- Will be null if not completed yet
    assigned_roomie_id INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    FOREIGN KEY (task_template_id) REFERENCES task_templates (id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_roomie_id) REFERENCES roomies (id)
);

-- Table for each roomie to rate the task performed by their companion (each roomie rates only once per task)
CREATE TABLE IF NOT EXISTS task_ratings (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    roomie_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(task_id, roomie_id),
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    FOREIGN KEY (roomie_id) REFERENCES roomies (id) ON DELETE CASCADE
);