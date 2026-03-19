import { v4 as uuidv4 } from 'uuid';
import { format, startOfDay, addDays, startOfToday } from 'date-fns';
import { getDatabase } from './db';
import type {
  TaskList,
  Label,
  Task,
  Subtask,
  Reminder,
  AuditLog,
  ViewType,
  SearchResult,
  Priority,
  RecurringPattern,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowISO(): string {
  return new Date().toISOString();
}

function rowToList(row: Record<string, unknown>): TaskList {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    emoji: row.emoji as string,
    isInbox: (row.is_inbox as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToLabel(row: Record<string, unknown>): Label {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    icon: row.icon as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    title: row.title as string,
    completed: (row.completed as number) === 1,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToReminder(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    reminderAt: row.reminder_at as string,
    createdAt: row.created_at as string,
  };
}

function rowToAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    action: row.action as AuditLog['action'],
    field: (row.field as string | null) ?? null,
    oldValue: (row.old_value as string | null) ?? null,
    newValue: (row.new_value as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    listId: row.list_id as string,
    completed: (row.completed as number) === 1,
    priority: row.priority as Priority,
    date: (row.date as string | null) ?? null,
    deadline: (row.deadline as string | null) ?? null,
    estimate: (row.estimate as string | null) ?? null,
    actualTime: (row.actual_time as string | null) ?? null,
    recurring: (row.recurring as RecurringPattern | null) ?? null,
    recurringCustom: (row.recurring_custom as string | null) ?? null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

function attachRelations(task: Task): Task {
  const db = getDatabase();

  const subtaskRows = db
    .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC')
    .all(task.id) as Record<string, unknown>[];
  task.subtasks = subtaskRows.map(rowToSubtask);

  const labelRows = db
    .prepare(
      `SELECT l.* FROM labels l
       INNER JOIN task_labels tl ON tl.label_id = l.id
       WHERE tl.task_id = ?
       ORDER BY l.name ASC`
    )
    .all(task.id) as Record<string, unknown>[];
  task.labels = labelRows.map(rowToLabel);

  const reminderRows = db
    .prepare('SELECT * FROM reminders WHERE task_id = ? ORDER BY reminder_at ASC')
    .all(task.id) as Record<string, unknown>[];
  task.reminders = reminderRows.map(rowToReminder);

  const listRow = db
    .prepare('SELECT * FROM lists WHERE id = ?')
    .get(task.listId) as Record<string, unknown> | undefined;
  if (listRow) {
    task.list = rowToList(listRow);
  }

  return task;
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function getLists(): TaskList[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM lists ORDER BY is_inbox DESC, name ASC').all() as Record<string, unknown>[];
  return rows.map(rowToList);
}

export function getListById(id: string): TaskList | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToList(row) : null;
}

export function createList(data: Omit<TaskList, 'id' | 'createdAt' | 'updatedAt' | 'isInbox'>): TaskList {
  const db = getDatabase();
  const id = uuidv4();
  const ts = nowISO();
  db.prepare(
    'INSERT INTO lists (id, name, color, emoji, is_inbox, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
  ).run(id, data.name, data.color, data.emoji, ts, ts);
  return getListById(id)!;
}

export function updateList(
  id: string,
  data: Partial<Omit<TaskList, 'id' | 'createdAt' | 'updatedAt' | 'isInbox'>>
): TaskList | null {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.emoji !== undefined) { fields.push('emoji = ?'); values.push(data.emoji); }

  if (fields.length === 0) return rowToList(existing);

  fields.push('updated_at = ?');
  values.push(nowISO());
  values.push(id);

  db.prepare(`UPDATE lists SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getListById(id);
}

export function deleteList(id: string): boolean {
  const db = getDatabase();
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!list || (list.is_inbox as number) === 1) return false;
  db.prepare('DELETE FROM lists WHERE id = ?').run(id);
  return true;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function getLabels(): Label[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM labels ORDER BY name ASC').all() as Record<string, unknown>[];
  return rows.map(rowToLabel);
}

export function getLabelById(id: string): Label | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM labels WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToLabel(row) : null;
}

export function createLabel(data: Omit<Label, 'id' | 'createdAt' | 'updatedAt'>): Label {
  const db = getDatabase();
  const id = uuidv4();
  const ts = nowISO();
  db.prepare(
    'INSERT INTO labels (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.name, data.color, data.icon, ts, ts);
  return getLabelById(id)!;
}

export function updateLabel(
  id: string,
  data: Partial<Omit<Label, 'id' | 'createdAt' | 'updatedAt'>>
): Label | null {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM labels WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }

  if (fields.length === 0) return rowToLabel(existing);

  fields.push('updated_at = ?');
  values.push(nowISO());
  values.push(id);

  db.prepare(`UPDATE labels SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getLabelById(id);
}

export function deleteLabel(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM labels WHERE id = ?').run(id);
  return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export function getTasks(filters?: {
  listId?: string;
  view?: ViewType;
  showCompleted?: boolean;
  labelId?: string;
}): Task[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.listId) {
    conditions.push('t.list_id = ?');
    params.push(filters.listId);
  }

  if (filters?.showCompleted !== true) {
    conditions.push('t.completed = 0');
  }

  if (filters?.view) {
    const today = format(startOfToday(), 'yyyy-MM-dd');
    switch (filters.view) {
      case 'today':
        conditions.push('t.date = ?');
        params.push(today);
        break;
      case 'next7days': {
        const end = format(addDays(startOfToday(), 7), 'yyyy-MM-dd');
        conditions.push('t.date >= ? AND t.date <= ?');
        params.push(today, end);
        break;
      }
      case 'upcoming':
        conditions.push('t.date >= ?');
        params.push(today);
        break;
      case 'all':
        break;
    }
  }

  if (filters?.labelId) {
    conditions.push('EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id = ?)');
    params.push(filters.labelId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT t.* FROM tasks t ${where} ORDER BY t.sort_order ASC, t.created_at ASC`)
    .all(...params) as Record<string, unknown>[];

  return rows.map((row) => attachRelations(rowToTask(row)));
}

export function getTaskById(id: string): Task | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return attachRelations(rowToTask(row));
}

export function createTask(
  data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'sortOrder' | 'completed'>
): Task {
  const db = getDatabase();
  const id = uuidv4();
  const ts = nowISO();

  // Determine sort order: append to end of list
  const maxRow = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM tasks WHERE list_id = ?')
    .get(data.listId) as { max_order: number };
  const sortOrder = maxRow.max_order + 1;

  db.prepare(
    `INSERT INTO tasks (id, title, description, list_id, completed, priority, date, deadline,
     estimate, actual_time, recurring, recurring_custom, sort_order, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(
    id,
    data.title,
    data.description ?? null,
    data.listId,
    data.priority,
    data.date ?? null,
    data.deadline ?? null,
    data.estimate ?? null,
    data.actualTime ?? null,
    data.recurring ?? null,
    data.recurringCustom ?? null,
    sortOrder,
    ts,
    ts
  );

  return getTaskById(id)!;
}

export function updateTask(id: string, data: Partial<Task>): Task | null {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.listId !== undefined) { fields.push('list_id = ?'); values.push(data.listId); }
  if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }
  if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.deadline !== undefined) { fields.push('deadline = ?'); values.push(data.deadline); }
  if (data.estimate !== undefined) { fields.push('estimate = ?'); values.push(data.estimate); }
  if (data.actualTime !== undefined) { fields.push('actual_time = ?'); values.push(data.actualTime); }
  if (data.recurring !== undefined) { fields.push('recurring = ?'); values.push(data.recurring); }
  if (data.recurringCustom !== undefined) { fields.push('recurring_custom = ?'); values.push(data.recurringCustom); }
  if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
  if (data.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(data.completedAt); }

  if (fields.length === 0) return getTaskById(id);

  fields.push('updated_at = ?');
  values.push(nowISO());
  values.push(id);

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getTaskById(id);
}

export function deleteTask(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function toggleTaskComplete(id: string): Task | null {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const wasCompleted = (existing.completed as number) === 1;
  const nowCompleted = !wasCompleted;
  const completedAt = nowCompleted ? nowISO() : null;

  db.prepare('UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?').run(
    nowCompleted ? 1 : 0,
    completedAt,
    nowISO(),
    id
  );

  return getTaskById(id);
}

export function getOverdueTasks(): Task[] {
  const db = getDatabase();
  const today = format(startOfToday(), 'yyyy-MM-dd');
  const rows = db
    .prepare(
      `SELECT * FROM tasks WHERE completed = 0 AND date IS NOT NULL AND date < ? ORDER BY date ASC`
    )
    .all(today) as Record<string, unknown>[];
  return rows.map((row) => attachRelations(rowToTask(row)));
}

// ---------------------------------------------------------------------------
// Subtasks
// ---------------------------------------------------------------------------

export function createSubtask(taskId: string, title: string): Subtask {
  const db = getDatabase();
  const id = uuidv4();
  const ts = nowISO();

  const maxRow = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM subtasks WHERE task_id = ?')
    .get(taskId) as { max_order: number };

  db.prepare(
    'INSERT INTO subtasks (id, task_id, title, completed, sort_order, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)'
  ).run(id, taskId, title, maxRow.max_order + 1, ts, ts);

  const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Record<string, unknown>;
  return rowToSubtask(row);
}

export function updateSubtask(id: string, data: Partial<Subtask>): Subtask | null {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.completed !== undefined) { fields.push('completed = ?'); values.push(data.completed ? 1 : 0); }
  if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }

  if (fields.length === 0) return rowToSubtask(existing);

  fields.push('updated_at = ?');
  values.push(nowISO());
  values.push(id);

  db.prepare(`UPDATE subtasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Record<string, unknown>;
  return rowToSubtask(row);
}

export function deleteSubtask(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function toggleSubtaskComplete(id: string): Subtask | null {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const nowCompleted = (existing.completed as number) === 0;
  db.prepare('UPDATE subtasks SET completed = ?, updated_at = ? WHERE id = ?').run(
    nowCompleted ? 1 : 0,
    nowISO(),
    id
  );

  const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Record<string, unknown>;
  return rowToSubtask(row);
}

// ---------------------------------------------------------------------------
// Task Labels
// ---------------------------------------------------------------------------

export function addLabelToTask(taskId: string, labelId: string): void {
  const db = getDatabase();
  db.prepare('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)').run(taskId, labelId);
}

export function removeLabelFromTask(taskId: string, labelId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?').run(taskId, labelId);
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export function createReminder(taskId: string, reminderAt: string): Reminder {
  const db = getDatabase();
  const id = uuidv4();
  const ts = nowISO();
  db.prepare('INSERT INTO reminders (id, task_id, reminder_at, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    taskId,
    reminderAt,
    ts
  );
  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Record<string, unknown>;
  return rowToReminder(row);
}

export function deleteReminder(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getUpcomingReminders(): Reminder[] {
  const db = getDatabase();
  const now = nowISO();
  const rows = db
    .prepare('SELECT * FROM reminders WHERE reminder_at >= ? ORDER BY reminder_at ASC')
    .all(now) as Record<string, unknown>[];
  return rows.map(rowToReminder);
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export function getAuditLogs(taskId: string): AuditLog[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM audit_logs WHERE task_id = ? ORDER BY created_at DESC')
    .all(taskId) as Record<string, unknown>[];
  return rows.map(rowToAuditLog);
}

export function createAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
  const db = getDatabase();
  const id = uuidv4();
  const ts = nowISO();
  db.prepare(
    'INSERT INTO audit_logs (id, task_id, action, field, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, entry.taskId, entry.action, entry.field, entry.oldValue, entry.newValue, ts);

  const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as Record<string, unknown>;
  return rowToAuditLog(row);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function searchTasks(query: string): SearchResult[] {
  const db = getDatabase();
  const term = `%${query}%`;

  const rows = db
    .prepare(
      `SELECT * FROM tasks
       WHERE title LIKE ? OR description LIKE ?
       ORDER BY
         CASE WHEN title LIKE ? THEN 0 ELSE 1 END,
         created_at DESC`
    )
    .all(term, term, term) as Record<string, unknown>[];

  return rows.map((row) => {
    const task = attachRelations(rowToTask(row));
    const matches: { field: string; value: string }[] = [];

    if ((row.title as string).toLowerCase().includes(query.toLowerCase())) {
      matches.push({ field: 'title', value: row.title as string });
    }
    if ((row.description as string | null)?.toLowerCase().includes(query.toLowerCase())) {
      matches.push({ field: 'description', value: row.description as string });
    }

    const score = matches.length > 0 && matches[0].field === 'title' ? 1 : 0.5;

    return { task, score, matches };
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function reorderTask(taskId: string, newSortOrder: number): void {
  const db = getDatabase();
  db.prepare('UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?').run(
    newSortOrder,
    nowISO(),
    taskId
  );
}
