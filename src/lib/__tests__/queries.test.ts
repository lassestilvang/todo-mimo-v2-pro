import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';

// Set test database path via environment variable BEFORE importing db/queries
const TEST_DB_DIR = path.join(process.cwd(), 'data-test');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'planner.db');

// Ensure clean state
function cleanupTestDb() {
  for (const f of [TEST_DB_PATH, TEST_DB_PATH + '-wal', TEST_DB_PATH + '-shm']) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

// Set env and force re-import by deleting module cache
process.env.PLANNER_DB_PATH = TEST_DB_PATH;

// Clear any cached db module so it picks up the new env var
delete require.cache[require.resolve('../db')];
delete require.cache[require.resolve('../queries')];

import { resetDatabase } from '../db';
import {
  getLists,
  getListById,
  createList,
  updateList,
  deleteList,
  getLabels,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  getOverdueTasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  toggleSubtaskComplete,
  addLabelToTask,
  removeLabelFromTask,
  createReminder,
  deleteReminder,
  getAuditLogs,
  createAuditLog,
  searchTasks,
} from '../queries';

// Helper to get the test inbox id
function getInboxId(): string {
  const lists = getLists();
  const inbox = lists.find((l) => l.isInbox);
  if (!inbox) throw new Error('Inbox not found');
  return inbox.id;
}

// Helper to create a task with minimal required fields
function makeTask(title: string, overrides?: Partial<Parameters<typeof createTask>[0]>) {
  const inboxId = getInboxId();
  return createTask({
    title,
    description: null,
    listId: inboxId,
    priority: 'none',
    date: null,
    deadline: null,
    estimate: null,
    actualTime: null,
    recurring: null,
    recurringCustom: null,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Close any existing connection, delete test DB, reinitialize
  resetDatabase();
  cleanupTestDb();
});

afterAll(() => {
  resetDatabase();
  cleanupTestDb();
  delete process.env.PLANNER_DB_PATH;
});

// ===========================================================================
// Lists
// ===========================================================================

describe('Lists', () => {
  it('getLists returns array including seeded Inbox', () => {
    const lists = getLists();
    expect(Array.isArray(lists)).toBe(true);
    expect(lists.length).toBeGreaterThanOrEqual(1);
    const inbox = lists.find((l) => l.isInbox);
    expect(inbox).toBeDefined();
    expect(inbox!.name).toBe('Inbox');
  });

  it('getListById returns correct list', () => {
    const inboxId = getInboxId();
    const list = getListById(inboxId);
    expect(list).not.toBeNull();
    expect(list!.id).toBe(inboxId);
    expect(list!.name).toBe('Inbox');
    expect(list!.isInbox).toBe(true);
  });

  it('getListById returns null for nonexistent id', () => {
    expect(getListById('nonexistent-id')).toBeNull();
  });

  it('createList creates a new list', () => {
    const list = createList({ name: 'Work', color: '#ff0000', emoji: '💼' });
    expect(list.id).toBeDefined();
    expect(list.name).toBe('Work');
    expect(list.color).toBe('#ff0000');
    expect(list.emoji).toBe('💼');
    expect(list.isInbox).toBe(false);
    expect(list.createdAt).toBeDefined();
    expect(list.updatedAt).toBeDefined();

    const found = getListById(list.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Work');
  });

  it('updateList updates list properties', () => {
    const list = createList({ name: 'Old Name', color: '#000000', emoji: '📁' });
    const updated = updateList(list.id, { name: 'New Name', color: '#ffffff' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('New Name');
    expect(updated!.color).toBe('#ffffff');
    expect(updated!.emoji).toBe('📁');
  });

  it('updateList returns null for nonexistent id', () => {
    expect(updateList('nonexistent', { name: 'X' })).toBeNull();
  });

  it('updateList with empty data returns existing list unchanged', () => {
    const list = createList({ name: 'Test', color: '#000', emoji: '📁' });
    const updated = updateList(list.id, {});
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Test');
  });

  it('deleteList deletes non-inbox list', () => {
    const list = createList({ name: 'ToDelete', color: '#000', emoji: '🗑️' });
    expect(deleteList(list.id)).toBe(true);
    expect(getListById(list.id)).toBeNull();
  });

  it('deleteList fails for inbox list', () => {
    const inboxId = getInboxId();
    expect(deleteList(inboxId)).toBe(false);
    expect(getListById(inboxId)).not.toBeNull();
  });

  it('deleteList returns false for nonexistent id', () => {
    expect(deleteList('nonexistent-id')).toBe(false);
  });
});

// ===========================================================================
// Labels
// ===========================================================================

describe('Labels', () => {
  it('getLabels returns empty array initially', () => {
    const labels = getLabels();
    expect(Array.isArray(labels)).toBe(true);
    expect(labels.length).toBe(0);
  });

  it('createLabel creates a new label', () => {
    const label = createLabel({ name: 'Urgent', color: '#ff0000', icon: 'alert' });
    expect(label.id).toBeDefined();
    expect(label.name).toBe('Urgent');
    expect(label.color).toBe('#ff0000');
    expect(label.icon).toBe('alert');
    expect(label.createdAt).toBeDefined();
    expect(label.updatedAt).toBeDefined();
  });

  it('getLabels returns labels sorted by name', () => {
    createLabel({ name: 'Zebra', color: '#000', icon: 'tag' });
    createLabel({ name: 'Alpha', color: '#000', icon: 'tag' });
    const labels = getLabels();
    expect(labels.length).toBe(2);
    expect(labels[0].name).toBe('Alpha');
    expect(labels[1].name).toBe('Zebra');
  });

  it('getLabelById returns correct label', () => {
    const label = createLabel({ name: 'Test', color: '#000', icon: 'tag' });
    const found = getLabelById(label.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(label.id);
    expect(found!.name).toBe('Test');
  });

  it('getLabelById returns null for nonexistent id', () => {
    expect(getLabelById('nonexistent')).toBeNull();
  });

  it('updateLabel updates label properties', () => {
    const label = createLabel({ name: 'Old', color: '#000', icon: 'tag' });
    const updated = updateLabel(label.id, { name: 'New', color: '#fff' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('New');
    expect(updated!.color).toBe('#fff');
    expect(updated!.icon).toBe('tag');
  });

  it('updateLabel returns null for nonexistent id', () => {
    expect(updateLabel('nonexistent', { name: 'X' })).toBeNull();
  });

  it('deleteLabel deletes a label', () => {
    const label = createLabel({ name: 'ToDelete', color: '#000', icon: 'tag' });
    expect(deleteLabel(label.id)).toBe(true);
    expect(getLabelById(label.id)).toBeNull();
  });

  it('deleteLabel returns false for nonexistent id', () => {
    expect(deleteLabel('nonexistent')).toBe(false);
  });
});

// ===========================================================================
// Tasks
// ===========================================================================

describe('Tasks', () => {
  it('getTasks returns empty array initially', () => {
    const tasks = getTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(0);
  });

  it('createTask creates a task with all fields', () => {
    const inboxId = getInboxId();
    const task = createTask({
      title: 'Test Task',
      description: 'A description',
      listId: inboxId,
      priority: 'high',
      date: '2026-03-20',
      deadline: '2026-03-25',
      estimate: '02:00',
      actualTime: null,
      recurring: 'daily',
      recurringCustom: null,
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('A description');
    expect(task.listId).toBe(inboxId);
    expect(task.completed).toBe(false);
    expect(task.priority).toBe('high');
    expect(task.date).toBe('2026-03-20');
    expect(task.deadline).toBe('2026-03-25');
    expect(task.estimate).toBe('02:00');
    expect(task.recurring).toBe('daily');
    expect(task.sortOrder).toBe(1);
    expect(task.completedAt).toBeNull();
  });

  it('createTask with minimal fields uses defaults', () => {
    const task = makeTask('Minimal');
    expect(task.title).toBe('Minimal');
    expect(task.description).toBeNull();
    expect(task.priority).toBe('none');
    expect(task.date).toBeNull();
    expect(task.deadline).toBeNull();
    expect(task.estimate).toBeNull();
    expect(task.recurring).toBeNull();
  });

  it('getTaskById returns task with relations', () => {
    const task = makeTask('With Relations');
    const found = getTaskById(task.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(task.id);
    expect(found!.list).toBeDefined();
    expect(found!.list!.name).toBe('Inbox');
    expect(found!.subtasks).toEqual([]);
    expect(found!.labels).toEqual([]);
    expect(found!.reminders).toEqual([]);
  });

  it('getTaskById returns null for nonexistent id', () => {
    expect(getTaskById('nonexistent')).toBeNull();
  });

  it('getTasks with listId filter', () => {
    const inboxId = getInboxId();
    const list2 = createList({ name: 'Work', color: '#000', emoji: '💼' });

    makeTask('Inbox Task', { listId: inboxId });
    makeTask('Work Task', { listId: list2.id });

    const inboxTasks = getTasks({ listId: inboxId });
    expect(inboxTasks.length).toBe(1);
    expect(inboxTasks[0].title).toBe('Inbox Task');

    const workTasks = getTasks({ listId: list2.id });
    expect(workTasks.length).toBe(1);
    expect(workTasks[0].title).toBe('Work Task');
  });

  it('getTasks with view=today filter', () => {
    const today = new Date().toISOString().split('T')[0];

    makeTask('Today Task', { date: today });
    makeTask('Other Day Task', { date: '2026-01-01' });

    const todayTasks = getTasks({ view: 'today' });
    expect(todayTasks.length).toBe(1);
    expect(todayTasks[0].title).toBe('Today Task');
  });

  it('getTasks with view=all filter returns all tasks', () => {
    makeTask('Task 1', { date: '2026-01-01' });
    makeTask('Task 2', { date: '2026-12-31' });

    const allTasks = getTasks({ view: 'all' });
    expect(allTasks.length).toBe(2);
  });

  it('getTasks default hides completed tasks', () => {
    const t1 = makeTask('Active');
    const t2 = makeTask('Will Complete');

    toggleTaskComplete(t2.id);

    const activeOnly = getTasks();
    expect(activeOnly.length).toBe(1);
    expect(activeOnly[0].title).toBe('Active');
  });

  it('getTasks with showCompleted=true returns all', () => {
    makeTask('Active');
    const t2 = makeTask('Will Complete');

    toggleTaskComplete(t2.id);

    const allTasks = getTasks({ showCompleted: true });
    expect(allTasks.length).toBe(2);
  });

  it('toggleTaskComplete toggles completion', () => {
    const task = makeTask('Toggle Me');

    expect(task.completed).toBe(false);
    expect(task.completedAt).toBeNull();

    const completed = toggleTaskComplete(task.id);
    expect(completed).not.toBeNull();
    expect(completed!.completed).toBe(true);
    expect(completed!.completedAt).not.toBeNull();

    const uncompleted = toggleTaskComplete(task.id);
    expect(uncompleted).not.toBeNull();
    expect(uncompleted!.completed).toBe(false);
    expect(uncompleted!.completedAt).toBeNull();
  });

  it('toggleTaskComplete returns null for nonexistent id', () => {
    expect(toggleTaskComplete('nonexistent')).toBeNull();
  });

  it('updateTask updates task fields', () => {
    const task = makeTask('Original', { description: 'Desc', priority: 'low' });

    const updated = updateTask(task.id, {
      title: 'Updated',
      priority: 'high',
      description: 'New desc',
      date: '2026-06-15',
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated');
    expect(updated!.priority).toBe('high');
    expect(updated!.description).toBe('New desc');
    expect(updated!.date).toBe('2026-06-15');
  });

  it('updateTask returns null for nonexistent id', () => {
    expect(updateTask('nonexistent', { title: 'X' })).toBeNull();
  });

  it('updateTask with empty data returns existing task', () => {
    const task = makeTask('Test');
    const updated = updateTask(task.id, {});
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Test');
  });

  it('deleteTask deletes a task', () => {
    const task = makeTask('Delete Me');
    expect(deleteTask(task.id)).toBe(true);
    expect(getTaskById(task.id)).toBeNull();
  });

  it('deleteTask returns false for nonexistent id', () => {
    expect(deleteTask('nonexistent')).toBe(false);
  });

  it('getOverdueTasks returns overdue tasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    makeTask('Overdue Task', { date: yesterdayStr });
    makeTask('Future Task', { date: tomorrowStr });
    makeTask('No Date Task', { date: null });

    const overdue = getOverdueTasks();
    expect(overdue.length).toBe(1);
    expect(overdue[0].title).toBe('Overdue Task');
  });

  it('getOverdueTasks excludes completed overdue tasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const task = makeTask('Completed Overdue', { date: yesterdayStr });
    toggleTaskComplete(task.id);

    const overdue = getOverdueTasks();
    expect(overdue.length).toBe(0);
  });

  it('createTask auto-increments sortOrder per list', () => {
    const t1 = makeTask('First');
    const t2 = makeTask('Second');

    expect(t1.sortOrder).toBe(1);
    expect(t2.sortOrder).toBe(2);
  });

  it('updateTask can update sort order', () => {
    const task = makeTask('Reorder');
    const updated = updateTask(task.id, { sortOrder: 99 });
    expect(updated).not.toBeNull();
    expect(updated!.sortOrder).toBe(99);
  });

  it('updateTask can update recurring fields', () => {
    const task = makeTask('Recurring');
    const updated = updateTask(task.id, {
      recurring: 'weekly',
      recurringCustom: 'every 2 weeks on Monday',
    });
    expect(updated).not.toBeNull();
    expect(updated!.recurring).toBe('weekly');
    expect(updated!.recurringCustom).toBe('every 2 weeks on Monday');
  });

  it('updateTask can update estimate and actualTime', () => {
    const task = makeTask('Timed');
    const updated = updateTask(task.id, {
      estimate: '01:30',
      actualTime: '02:15',
    });
    expect(updated).not.toBeNull();
    expect(updated!.estimate).toBe('01:30');
    expect(updated!.actualTime).toBe('02:15');
  });
});

// ===========================================================================
// Subtasks
// ===========================================================================

describe('Subtasks', () => {
  let taskId: string;

  beforeEach(() => {
    taskId = makeTask('Parent Task').id;
  });

  it('createSubtask creates a subtask', () => {
    const subtask = createSubtask(taskId, 'Sub 1');
    expect(subtask.id).toBeDefined();
    expect(subtask.taskId).toBe(taskId);
    expect(subtask.title).toBe('Sub 1');
    expect(subtask.completed).toBe(false);
    expect(subtask.sortOrder).toBe(1);
    expect(subtask.createdAt).toBeDefined();
  });

  it('createSubtask auto-increments sortOrder', () => {
    const s1 = createSubtask(taskId, 'First');
    const s2 = createSubtask(taskId, 'Second');
    expect(s1.sortOrder).toBe(1);
    expect(s2.sortOrder).toBe(2);
  });

  it('subtasks appear in parent task relations', () => {
    createSubtask(taskId, 'Sub A');
    createSubtask(taskId, 'Sub B');

    const task = getTaskById(taskId);
    expect(task).not.toBeNull();
    expect(task!.subtasks!.length).toBe(2);
    expect(task!.subtasks![0].title).toBe('Sub A');
    expect(task!.subtasks![1].title).toBe('Sub B');
  });

  it('toggleSubtaskComplete toggles subtask', () => {
    const subtask = createSubtask(taskId, 'Toggle Me');
    expect(subtask.completed).toBe(false);

    const toggled = toggleSubtaskComplete(subtask.id);
    expect(toggled).not.toBeNull();
    expect(toggled!.completed).toBe(true);

    const toggledBack = toggleSubtaskComplete(subtask.id);
    expect(toggledBack).not.toBeNull();
    expect(toggledBack!.completed).toBe(false);
  });

  it('toggleSubtaskComplete returns null for nonexistent id', () => {
    expect(toggleSubtaskComplete('nonexistent')).toBeNull();
  });

  it('updateSubtask updates subtask', () => {
    const subtask = createSubtask(taskId, 'Old Title');
    const updated = updateSubtask(subtask.id, { title: 'New Title' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('New Title');
  });

  it('updateSubtask updates completed status', () => {
    const subtask = createSubtask(taskId, 'Test');
    const updated = updateSubtask(subtask.id, { completed: true });
    expect(updated).not.toBeNull();
    expect(updated!.completed).toBe(true);
  });

  it('updateSubtask returns null for nonexistent id', () => {
    expect(updateSubtask('nonexistent', { title: 'X' })).toBeNull();
  });

  it('updateSubtask with empty data returns existing subtask', () => {
    const subtask = createSubtask(taskId, 'Test');
    const updated = updateSubtask(subtask.id, {});
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Test');
  });

  it('deleteSubtask deletes subtask', () => {
    const subtask = createSubtask(taskId, 'Delete Me');
    expect(deleteSubtask(subtask.id)).toBe(true);

    const task = getTaskById(taskId);
    expect(task!.subtasks!.length).toBe(0);
  });

  it('deleteSubtask returns false for nonexistent id', () => {
    expect(deleteSubtask('nonexistent')).toBe(false);
  });
});

// ===========================================================================
// Task Labels
// ===========================================================================

describe('Task Labels', () => {
  let taskId: string;
  let labelId: string;

  beforeEach(() => {
    taskId = makeTask('Labelled Task').id;
    labelId = createLabel({ name: 'Test Label', color: '#000', icon: 'tag' }).id;
  });

  it('addLabelToTask adds a label', () => {
    addLabelToTask(taskId, labelId);

    const task = getTaskById(taskId);
    expect(task).not.toBeNull();
    expect(task!.labels!.length).toBe(1);
    expect(task!.labels![0].id).toBe(labelId);
    expect(task!.labels![0].name).toBe('Test Label');
  });

  it('addLabelToTask is idempotent', () => {
    addLabelToTask(taskId, labelId);
    addLabelToTask(taskId, labelId);

    const task = getTaskById(taskId);
    expect(task!.labels!.length).toBe(1);
  });

  it('removeLabelFromTask removes a label', () => {
    addLabelToTask(taskId, labelId);
    removeLabelFromTask(taskId, labelId);

    const task = getTaskById(taskId);
    expect(task!.labels!.length).toBe(0);
  });

  it('removeLabelFromTask is idempotent', () => {
    addLabelToTask(taskId, labelId);
    removeLabelFromTask(taskId, labelId);
    removeLabelFromTask(taskId, labelId);

    const task = getTaskById(taskId);
    expect(task!.labels!.length).toBe(0);
  });

  it('getTasks with labelId filter', () => {
    const label2 = createLabel({ name: 'Other', color: '#fff', icon: 'star' });
    const task2 = makeTask('Other Task');

    addLabelToTask(taskId, labelId);
    addLabelToTask(task2.id, label2.id);

    const filtered = getTasks({ labelId: labelId });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(taskId);
  });
});

// ===========================================================================
// Reminders
// ===========================================================================

describe('Reminders', () => {
  let taskId: string;

  beforeEach(() => {
    taskId = makeTask('Remind Me').id;
  });

  it('createReminder creates a reminder', () => {
    const reminder = createReminder(taskId, '2026-03-20T10:00:00.000Z');
    expect(reminder.id).toBeDefined();
    expect(reminder.taskId).toBe(taskId);
    expect(reminder.reminderAt).toBe('2026-03-20T10:00:00.000Z');
    expect(reminder.createdAt).toBeDefined();
  });

  it('reminder appears in task relations sorted by reminder_at', () => {
    createReminder(taskId, '2026-03-21T10:00:00.000Z');
    createReminder(taskId, '2026-03-20T10:00:00.000Z');

    const task = getTaskById(taskId);
    expect(task).not.toBeNull();
    expect(task!.reminders!.length).toBe(2);
    expect(task!.reminders![0].reminderAt).toBe('2026-03-20T10:00:00.000Z');
    expect(task!.reminders![1].reminderAt).toBe('2026-03-21T10:00:00.000Z');
  });

  it('deleteReminder deletes a reminder', () => {
    const reminder = createReminder(taskId, '2026-03-20T10:00:00.000Z');
    expect(deleteReminder(reminder.id)).toBe(true);

    const task = getTaskById(taskId);
    expect(task!.reminders!.length).toBe(0);
  });

  it('deleteReminder returns false for nonexistent id', () => {
    expect(deleteReminder('nonexistent')).toBe(false);
  });
});

// ===========================================================================
// Audit Log
// ===========================================================================

describe('Audit Log', () => {
  let taskId: string;

  beforeEach(() => {
    taskId = makeTask('Audited Task').id;
  });

  it('getAuditLogs returns empty array initially', () => {
    const logs = getAuditLogs(taskId);
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });

  it('createAuditLog creates an entry', () => {
    const entry = createAuditLog({
      taskId,
      action: 'created',
      field: null,
      oldValue: null,
      newValue: null,
    });

    expect(entry.id).toBeDefined();
    expect(entry.taskId).toBe(taskId);
    expect(entry.action).toBe('created');
    expect(entry.field).toBeNull();
    expect(entry.oldValue).toBeNull();
    expect(entry.newValue).toBeNull();
    expect(entry.createdAt).toBeDefined();
  });

  it('createAuditLog with field changes records values', () => {
    const entry = createAuditLog({
      taskId,
      action: 'updated',
      field: 'priority',
      oldValue: 'none',
      newValue: 'high',
    });

    expect(entry.action).toBe('updated');
    expect(entry.field).toBe('priority');
    expect(entry.oldValue).toBe('none');
    expect(entry.newValue).toBe('high');
  });

  it('getAuditLogs returns entries ordered by created_at DESC', () => {
    createAuditLog({ taskId, action: 'created', field: null, oldValue: null, newValue: null });
    // Use a small delay to ensure different timestamps
    const start = Date.now();
    while (Date.now() - start < 5) {} // busy wait 5ms
    createAuditLog({ taskId, action: 'updated', field: 'title', oldValue: 'Old', newValue: 'New' });

    const logs = getAuditLogs(taskId);
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe('updated');
    expect(logs[1].action).toBe('created');
  });

  it('getAuditLogs only returns entries for the specified task', () => {
    const task2 = makeTask('Other Task');

    createAuditLog({ taskId, action: 'created', field: null, oldValue: null, newValue: null });
    createAuditLog({ taskId: task2.id, action: 'created', field: null, oldValue: null, newValue: null });

    const logs = getAuditLogs(taskId);
    expect(logs.length).toBe(1);
    expect(logs[0].taskId).toBe(taskId);
  });

  it('supports all audit log action types', () => {
    const actions = ['created', 'updated', 'completed', 'uncompleted', 'deleted', 'restored'] as const;

    for (const action of actions) {
      const entry = createAuditLog({
        taskId,
        action,
        field: null,
        oldValue: null,
        newValue: null,
      });
      expect(entry.action).toBe(action);
    }

    const logs = getAuditLogs(taskId);
    expect(logs.length).toBe(actions.length);
  });
});

// ===========================================================================
// Search
// ===========================================================================

describe('Search', () => {
  beforeEach(() => {
    makeTask('Buy groceries', { description: 'Milk, eggs, bread' });
    makeTask('Write report', { description: 'Quarterly financial report for Q1' });
    makeTask('Call dentist', { description: null });
  });

  it('searchTasks finds tasks by title', () => {
    const results = searchTasks('groceries');
    expect(results.length).toBe(1);
    expect(results[0].task.title).toBe('Buy groceries');
    expect(results[0].score).toBe(1);
    expect(results[0].matches[0].field).toBe('title');
  });

  it('searchTasks finds tasks by description', () => {
    const results = searchTasks('financial');
    expect(results.length).toBe(1);
    expect(results[0].task.title).toBe('Write report');
    expect(results[0].score).toBe(0.5);
    expect(results[0].matches[0].field).toBe('description');
  });

  it('searchTasks is case-insensitive', () => {
    const results = searchTasks('GROCERIES');
    expect(results.length).toBe(1);
    expect(results[0].task.title).toBe('Buy groceries');
  });

  it('searchTasks returns empty array for no matches', () => {
    const results = searchTasks('nonexistent query');
    expect(results.length).toBe(0);
  });

  it('searchTasks partial match works', () => {
    const results = searchTasks('repo');
    expect(results.length).toBe(1);
    expect(results[0].task.title).toBe('Write report');
  });

  it('searchTasks finds multiple matches', () => {
    // "Buy groceries" has 'r' in title, "Write report" has 'r' in title
    const results = searchTasks('r');
    expect(results.length).toBe(2);
  });

  it('searchTasks title match has higher score than description match', () => {
    // "report" appears in title of "Write report"
    const results = searchTasks('report');
    expect(results.length).toBe(1);
    expect(results[0].score).toBe(1);
  });

  it('searchTasks returns task with all relations', () => {
    const results = searchTasks('groceries');
    expect(results[0].task.list).toBeDefined();
    expect(results[0].task.subtasks).toBeDefined();
    expect(results[0].task.labels).toBeDefined();
  });
});
