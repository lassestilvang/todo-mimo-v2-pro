// Priority levels
export type Priority = 'high' | 'medium' | 'low' | 'none';

// Recurring patterns
export type RecurringPattern = 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly' | 'custom';

// List type
export interface TaskList {
  id: string;
  name: string;
  color: string;
  emoji: string;
  isInbox: boolean;
  createdAt: string;
  updatedAt: string;
}

// Label type
export interface Label {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

// Subtask type
export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Reminder type
export interface Reminder {
  id: string;
  taskId: string;
  reminderAt: string; // ISO datetime
  createdAt: string;
}

// Task label junction
export interface TaskLabel {
  taskId: string;
  labelId: string;
}

// Task attachment
export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  filepath: string;
  filesize: number;
  mimeType: string;
  createdAt: string;
}

// The main Task type
export interface Task {
  id: string;
  title: string;
  description: string | null;
  listId: string;
  completed: boolean;
  priority: Priority;
  date: string | null; // ISO date string
  deadline: string | null; // ISO date string
  estimate: string | null; // HH:mm format
  actualTime: string | null; // HH:mm format
  recurring: RecurringPattern | null;
  recurringCustom: string | null; // e.g. "every 2 weeks on Monday"
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  // Relations (populated by joins)
  list?: TaskList;
  labels?: Label[];
  subtasks?: Subtask[];
  reminders?: Reminder[];
  attachments?: Attachment[];
}

// Audit log entry
export interface AuditLog {
  id: string;
  taskId: string;
  action: 'created' | 'updated' | 'completed' | 'uncompleted' | 'deleted' | 'restored';
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

// View types
export type ViewType = 'today' | 'next7days' | 'upcoming' | 'all';

// Search result
export interface SearchResult {
  task: Task;
  score: number;
  matches: { field: string; value: string }[];
}
