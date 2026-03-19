import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.PLANNER_DB_PATH
  ? path.dirname(process.env.PLANNER_DB_PATH)
  : path.join(process.cwd(), 'data');
const DB_PATH = process.env.PLANNER_DB_PATH || path.join(DB_DIR, 'planner.db');

let db: Database.Database | null = null;

function initializeDatabase(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const database = new Database(DB_PATH);

  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  database.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      emoji TEXT NOT NULL DEFAULT '📋',
      is_inbox INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT NOT NULL DEFAULT 'tag',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      list_id TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'none',
      date TEXT,
      deadline TEXT,
      estimate TEXT,
      actual_time TEXT,
      recurring TEXT,
      recurring_custom TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      reminder_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_labels (
      task_id TEXT NOT NULL,
      label_id TEXT NOT NULL,
      PRIMARY KEY (task_id, label_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filesize INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      action TEXT NOT NULL,
      field TEXT,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_reminder_at ON reminders(reminder_at);
    CREATE INDEX IF NOT EXISTS idx_task_labels_task_id ON task_labels(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_labels_label_id ON task_labels(label_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON audit_logs(task_id);
  `);

  // Seed default Inbox list if no lists exist
  const count = database.prepare('SELECT COUNT(*) as count FROM lists').get() as { count: number };
  if (count.count === 0) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date().toISOString();
    database.prepare(
      'INSERT INTO lists (id, name, color, emoji, is_inbox, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(uuidv4(), 'Inbox', '#6366f1', '📥', 1, now, now);
  }

  return database;
}

export function getDatabase(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
