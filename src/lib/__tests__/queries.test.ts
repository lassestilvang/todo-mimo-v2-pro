import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
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

// Set env and force re-import by clearing module cache
process.env.PLANNER_DB_PATH = TEST_DB_PATH;

// Clear any cached db module so it picks up the new env var
const dbResolved = require.resolve('../db');
const queriesResolved = require.resolve('../queries');
delete require.cache[dbResolved];
delete require.cache[queriesResolved];

const { resetDatabase } = require('../db');
const {
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
} = require('../queries');

// Helper to get the test inbox id
function getInboxId() {
  const lists = getLists();
  const inbox = lists.find((l) => l.isInbox);
  if (!inbox) throw new Error('Inbox not found');
  return inbox.id;
}

// Helper to create a task with minimal required fields
function makeTask(title, overrides = {}) {
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
  resetDatabase();
  cleanupTestDb();
});

after(() => {
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
    assert.ok(Array.isArray(lists));
    assert.ok(lists.length >= 1);
    const inbox = lists.find((l) => l.isInbox);
    assert.ok(inbox);
    assert.strictEqual(inbox.name, 'Inbox');
  });

  it('getListById returns correct list', () => {
    const inboxId = getInboxId();
    const list = getListById(inboxId);
    assert.ok(list);
    assert.strictEqual(list.id, inboxId);
    assert.strictEqual(list.name, 'Inbox');
    assert.strictEqual(list.isInbox, true);
  });

  it('getListById returns null for nonexistent id', () => {
    assert.strictEqual(getListById('nonexistent-id'), null);
  });

  it('createList creates a new list', () => {
    const list = createList({ name: 'Work', color: '#ff0000', emoji: '💼' });
    assert.ok(list.id);
    assert.strictEqual(list.name, 'Work');
    assert.strictEqual(list.color, '#ff0000');
    assert.strictEqual(list.emoji, '💼');
    assert.strictEqual(list.isInbox, false);
    assert.ok(list.createdAt);
    assert.ok(list.updatedAt);

    const found = getListById(list.id);
    assert.ok(found);
    assert.strictEqual(found.name, 'Work');
  });

  it('updateList updates list properties', () => {
    const list = createList({ name: 'Old Name', color: '#000000', emoji: '📁' });
    const updated = updateList(list.id, { name: 'New Name', color: '#ffffff' });
    assert.ok(updated);
    assert.strictEqual(updated.name, 'New Name');
    assert.strictEqual(updated.color, '#ffffff');
    assert.strictEqual(updated.emoji, '📁');
  });

  it('updateList returns null for nonexistent id', () => {
    assert.strictEqual(updateList('nonexistent', { name: 'X' }), null);
  });

  it('updateList with empty data returns existing list unchanged', () => {
    const list = createList({ name: 'Test', color: '#000', emoji: '📁' });
    const updated = updateList(list.id, {});
    assert.ok(updated);
    assert.strictEqual(updated.name, 'Test');
  });

  it('deleteList deletes non-inbox list', () => {
    const list = createList({ name: 'ToDelete', color: '#000', emoji: '🗑️' });
    assert.strictEqual(deleteList(list.id), true);
    assert.strictEqual(getListById(list.id), null);
  });

  it('deleteList fails for inbox list', () => {
    const inboxId = getInboxId();
    assert.strictEqual(deleteList(inboxId), false);
    assert.ok(getListById(inboxId));
  });

  it('deleteList returns false for nonexistent id', () => {
    assert.strictEqual(deleteList('nonexistent-id'), false);
  });
});

// ===========================================================================
// Labels
// ===========================================================================

describe('Labels', () => {
  it('getLabels returns empty array initially', () => {
    const labels = getLabels();
    assert.ok(Array.isArray(labels));
    assert.strictEqual(labels.length, 0);
  });

  it('createLabel creates a new label', () => {
    const label = createLabel({ name: 'Urgent', color: '#ff0000', icon: 'alert' });
    assert.ok(label.id);
    assert.strictEqual(label.name, 'Urgent');
    assert.strictEqual(label.color, '#ff0000');
    assert.strictEqual(label.icon, 'alert');
    assert.ok(label.createdAt);
    assert.ok(label.updatedAt);
  });

  it('getLabels returns labels sorted by name', () => {
    createLabel({ name: 'Zebra', color: '#000', icon: 'tag' });
    createLabel({ name: 'Alpha', color: '#000', icon: 'tag' });
    const labels = getLabels();
    assert.strictEqual(labels.length, 2);
    assert.strictEqual(labels[0].name, 'Alpha');
    assert.strictEqual(labels[1].name, 'Zebra');
  });

  it('getLabelById returns correct label', () => {
    const label = createLabel({ name: 'Test', color: '#000', icon: 'tag' });
    const found = getLabelById(label.id);
    assert.ok(found);
    assert.strictEqual(found.id, label.id);
    assert.strictEqual(found.name, 'Test');
  });

  it('getLabelById returns null for nonexistent id', () => {
    assert.strictEqual(getLabelById('nonexistent'), null);
  });

  it('updateLabel updates label properties', () => {
    const label = createLabel({ name: 'Old', color: '#000', icon: 'tag' });
    const updated = updateLabel(label.id, { name: 'New', color: '#fff' });
    assert.ok(updated);
    assert.strictEqual(updated.name, 'New');
    assert.strictEqual(updated.color, '#fff');
    assert.strictEqual(updated.icon, 'tag');
  });

  it('updateLabel returns null for nonexistent id', () => {
    assert.strictEqual(updateLabel('nonexistent', { name: 'X' }), null);
  });

  it('deleteLabel deletes a label', () => {
    const label = createLabel({ name: 'ToDelete', color: '#000', icon: 'tag' });
    assert.strictEqual(deleteLabel(label.id), true);
    assert.strictEqual(getLabelById(label.id), null);
  });

  it('deleteLabel returns false for nonexistent id', () => {
    assert.strictEqual(deleteLabel('nonexistent'), false);
  });
});

// ===========================================================================
// Tasks
// ===========================================================================

describe('Tasks', () => {
  it('getTasks returns empty array initially', () => {
    const tasks = getTasks();
    assert.ok(Array.isArray(tasks));
    assert.strictEqual(tasks.length, 0);
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

    assert.ok(task.id);
    assert.strictEqual(task.title, 'Test Task');
    assert.strictEqual(task.description, 'A description');
    assert.strictEqual(task.listId, inboxId);
    assert.strictEqual(task.completed, false);
    assert.strictEqual(task.priority, 'high');
    assert.strictEqual(task.date, '2026-03-20');
    assert.strictEqual(task.deadline, '2026-03-25');
    assert.strictEqual(task.estimate, '02:00');
    assert.strictEqual(task.recurring, 'daily');
    assert.strictEqual(task.sortOrder, 1);
    assert.strictEqual(task.completedAt, null);
  });

  it('createTask with minimal fields uses defaults', () => {
    const task = makeTask('Minimal');
    assert.strictEqual(task.title, 'Minimal');
    assert.strictEqual(task.description, null);
    assert.strictEqual(task.priority, 'none');
    assert.strictEqual(task.date, null);
    assert.strictEqual(task.deadline, null);
    assert.strictEqual(task.estimate, null);
    assert.strictEqual(task.recurring, null);
  });

  it('getTaskById returns task with relations', () => {
    const task = makeTask('With Relations');
    const found = getTaskById(task.id);
    assert.ok(found);
    assert.strictEqual(found.id, task.id);
    assert.ok(found.list);
    assert.strictEqual(found.list.name, 'Inbox');
    assert.deepStrictEqual(found.subtasks, []);
    assert.deepStrictEqual(found.labels, []);
    assert.deepStrictEqual(found.reminders, []);
  });

  it('getTaskById returns null for nonexistent id', () => {
    assert.strictEqual(getTaskById('nonexistent'), null);
  });

  it('getTasks with listId filter', () => {
    const inboxId = getInboxId();
    const list2 = createList({ name: 'Work', color: '#000', emoji: '💼' });

    makeTask('Inbox Task', { listId: inboxId });
    makeTask('Work Task', { listId: list2.id });

    const inboxTasks = getTasks({ listId: inboxId });
    assert.strictEqual(inboxTasks.length, 1);
    assert.strictEqual(inboxTasks[0].title, 'Inbox Task');

    const workTasks = getTasks({ listId: list2.id });
    assert.strictEqual(workTasks.length, 1);
    assert.strictEqual(workTasks[0].title, 'Work Task');
  });

  it('getTasks with view=today filter', () => {
    const today = new Date().toISOString().split('T')[0];

    makeTask('Today Task', { date: today });
    makeTask('Other Day Task', { date: '2026-01-01' });

    const todayTasks = getTasks({ view: 'today' });
    assert.strictEqual(todayTasks.length, 1);
    assert.strictEqual(todayTasks[0].title, 'Today Task');
  });

  it('getTasks with view=all filter returns all tasks', () => {
    makeTask('Task 1', { date: '2026-01-01' });
    makeTask('Task 2', { date: '2026-12-31' });

    const allTasks = getTasks({ view: 'all' });
    assert.strictEqual(allTasks.length, 2);
  });

  it('getTasks default hides completed tasks', () => {
    makeTask('Active');
    const t2 = makeTask('Will Complete');

    toggleTaskComplete(t2.id);

    const activeOnly = getTasks();
    assert.strictEqual(activeOnly.length, 1);
    assert.strictEqual(activeOnly[0].title, 'Active');
  });

  it('getTasks with showCompleted=true returns all', () => {
    makeTask('Active');
    const t2 = makeTask('Will Complete');

    toggleTaskComplete(t2.id);

    const allTasks = getTasks({ showCompleted: true });
    assert.strictEqual(allTasks.length, 2);
  });

  it('toggleTaskComplete toggles completion', () => {
    const task = makeTask('Toggle Me');

    assert.strictEqual(task.completed, false);
    assert.strictEqual(task.completedAt, null);

    const completed = toggleTaskComplete(task.id);
    assert.ok(completed);
    assert.strictEqual(completed.completed, true);
    assert.ok(completed.completedAt);

    const uncompleted = toggleTaskComplete(task.id);
    assert.ok(uncompleted);
    assert.strictEqual(uncompleted.completed, false);
    assert.strictEqual(uncompleted.completedAt, null);
  });

  it('toggleTaskComplete returns null for nonexistent id', () => {
    assert.strictEqual(toggleTaskComplete('nonexistent'), null);
  });

  it('updateTask updates task fields', () => {
    const task = makeTask('Original', { description: 'Desc', priority: 'low' });

    const updated = updateTask(task.id, {
      title: 'Updated',
      priority: 'high',
      description: 'New desc',
      date: '2026-06-15',
    });

    assert.ok(updated);
    assert.strictEqual(updated.title, 'Updated');
    assert.strictEqual(updated.priority, 'high');
    assert.strictEqual(updated.description, 'New desc');
    assert.strictEqual(updated.date, '2026-06-15');
  });

  it('updateTask returns null for nonexistent id', () => {
    assert.strictEqual(updateTask('nonexistent', { title: 'X' }), null);
  });

  it('updateTask with empty data returns existing task', () => {
    const task = makeTask('Test');
    const updated = updateTask(task.id, {});
    assert.ok(updated);
    assert.strictEqual(updated.title, 'Test');
  });

  it('deleteTask deletes a task', () => {
    const task = makeTask('Delete Me');
    assert.strictEqual(deleteTask(task.id), true);
    assert.strictEqual(getTaskById(task.id), null);
  });

  it('deleteTask returns false for nonexistent id', () => {
    assert.strictEqual(deleteTask('nonexistent'), false);
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
    assert.strictEqual(overdue.length, 1);
    assert.strictEqual(overdue[0].title, 'Overdue Task');
  });

  it('getOverdueTasks excludes completed overdue tasks', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const task = makeTask('Completed Overdue', { date: yesterdayStr });
    toggleTaskComplete(task.id);

    const overdue = getOverdueTasks();
    assert.strictEqual(overdue.length, 0);
  });

  it('createTask auto-increments sortOrder per list', () => {
    const t1 = makeTask('First');
    const t2 = makeTask('Second');

    assert.strictEqual(t1.sortOrder, 1);
    assert.strictEqual(t2.sortOrder, 2);
  });

  it('updateTask can update sort order', () => {
    const task = makeTask('Reorder');
    const updated = updateTask(task.id, { sortOrder: 99 });
    assert.ok(updated);
    assert.strictEqual(updated.sortOrder, 99);
  });

  it('updateTask can update recurring fields', () => {
    const task = makeTask('Recurring');
    const updated = updateTask(task.id, {
      recurring: 'weekly',
      recurringCustom: 'every 2 weeks on Monday',
    });
    assert.ok(updated);
    assert.strictEqual(updated.recurring, 'weekly');
    assert.strictEqual(updated.recurringCustom, 'every 2 weeks on Monday');
  });

  it('updateTask can update estimate and actualTime', () => {
    const task = makeTask('Timed');
    const updated = updateTask(task.id, {
      estimate: '01:30',
      actualTime: '02:15',
    });
    assert.ok(updated);
    assert.strictEqual(updated.estimate, '01:30');
    assert.strictEqual(updated.actualTime, '02:15');
  });
});

// ===========================================================================
// Subtasks
// ===========================================================================

describe('Subtasks', () => {
  let taskId;

  beforeEach(() => {
    taskId = makeTask('Parent Task').id;
  });

  it('createSubtask creates a subtask', () => {
    const subtask = createSubtask(taskId, 'Sub 1');
    assert.ok(subtask.id);
    assert.strictEqual(subtask.taskId, taskId);
    assert.strictEqual(subtask.title, 'Sub 1');
    assert.strictEqual(subtask.completed, false);
    assert.strictEqual(subtask.sortOrder, 1);
    assert.ok(subtask.createdAt);
  });

  it('createSubtask auto-increments sortOrder', () => {
    const s1 = createSubtask(taskId, 'First');
    const s2 = createSubtask(taskId, 'Second');
    assert.strictEqual(s1.sortOrder, 1);
    assert.strictEqual(s2.sortOrder, 2);
  });

  it('subtasks appear in parent task relations', () => {
    createSubtask(taskId, 'Sub A');
    createSubtask(taskId, 'Sub B');

    const task = getTaskById(taskId);
    assert.ok(task);
    assert.strictEqual(task.subtasks.length, 2);
    assert.strictEqual(task.subtasks[0].title, 'Sub A');
    assert.strictEqual(task.subtasks[1].title, 'Sub B');
  });

  it('toggleSubtaskComplete toggles subtask', () => {
    const subtask = createSubtask(taskId, 'Toggle Me');
    assert.strictEqual(subtask.completed, false);

    const toggled = toggleSubtaskComplete(subtask.id);
    assert.ok(toggled);
    assert.strictEqual(toggled.completed, true);

    const toggledBack = toggleSubtaskComplete(subtask.id);
    assert.ok(toggledBack);
    assert.strictEqual(toggledBack.completed, false);
  });

  it('toggleSubtaskComplete returns null for nonexistent id', () => {
    assert.strictEqual(toggleSubtaskComplete('nonexistent'), null);
  });

  it('updateSubtask updates subtask', () => {
    const subtask = createSubtask(taskId, 'Old Title');
    const updated = updateSubtask(subtask.id, { title: 'New Title' });
    assert.ok(updated);
    assert.strictEqual(updated.title, 'New Title');
  });

  it('updateSubtask updates completed status', () => {
    const subtask = createSubtask(taskId, 'Test');
    const updated = updateSubtask(subtask.id, { completed: true });
    assert.ok(updated);
    assert.strictEqual(updated.completed, true);
  });

  it('updateSubtask returns null for nonexistent id', () => {
    assert.strictEqual(updateSubtask('nonexistent', { title: 'X' }), null);
  });

  it('updateSubtask with empty data returns existing subtask', () => {
    const subtask = createSubtask(taskId, 'Test');
    const updated = updateSubtask(subtask.id, {});
    assert.ok(updated);
    assert.strictEqual(updated.title, 'Test');
  });

  it('deleteSubtask deletes subtask', () => {
    const subtask = createSubtask(taskId, 'Delete Me');
    assert.strictEqual(deleteSubtask(subtask.id), true);

    const task = getTaskById(taskId);
    assert.strictEqual(task.subtasks.length, 0);
  });

  it('deleteSubtask returns false for nonexistent id', () => {
    assert.strictEqual(deleteSubtask('nonexistent'), false);
  });
});

// ===========================================================================
// Task Labels
// ===========================================================================

describe('Task Labels', () => {
  let taskId;
  let labelId;

  beforeEach(() => {
    taskId = makeTask('Labelled Task').id;
    labelId = createLabel({ name: 'Test Label', color: '#000', icon: 'tag' }).id;
  });

  it('addLabelToTask adds a label', () => {
    addLabelToTask(taskId, labelId);

    const task = getTaskById(taskId);
    assert.ok(task);
    assert.strictEqual(task.labels.length, 1);
    assert.strictEqual(task.labels[0].id, labelId);
    assert.strictEqual(task.labels[0].name, 'Test Label');
  });

  it('addLabelToTask is idempotent', () => {
    addLabelToTask(taskId, labelId);
    addLabelToTask(taskId, labelId);

    const task = getTaskById(taskId);
    assert.strictEqual(task.labels.length, 1);
  });

  it('removeLabelFromTask removes a label', () => {
    addLabelToTask(taskId, labelId);
    removeLabelFromTask(taskId, labelId);

    const task = getTaskById(taskId);
    assert.strictEqual(task.labels.length, 0);
  });

  it('removeLabelFromTask is idempotent', () => {
    addLabelToTask(taskId, labelId);
    removeLabelFromTask(taskId, labelId);
    removeLabelFromTask(taskId, labelId);

    const task = getTaskById(taskId);
    assert.strictEqual(task.labels.length, 0);
  });

  it('getTasks with labelId filter', () => {
    const label2 = createLabel({ name: 'Other', color: '#fff', icon: 'star' });
    const task2 = makeTask('Other Task');

    addLabelToTask(taskId, labelId);
    addLabelToTask(task2.id, label2.id);

    const filtered = getTasks({ labelId: labelId });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, taskId);
  });
});

// ===========================================================================
// Reminders
// ===========================================================================

describe('Reminders', () => {
  let taskId;

  beforeEach(() => {
    taskId = makeTask('Remind Me').id;
  });

  it('createReminder creates a reminder', () => {
    const reminder = createReminder(taskId, '2026-03-20T10:00:00.000Z');
    assert.ok(reminder.id);
    assert.strictEqual(reminder.taskId, taskId);
    assert.strictEqual(reminder.reminderAt, '2026-03-20T10:00:00.000Z');
    assert.ok(reminder.createdAt);
  });

  it('reminder appears in task relations sorted by reminder_at', () => {
    createReminder(taskId, '2026-03-21T10:00:00.000Z');
    createReminder(taskId, '2026-03-20T10:00:00.000Z');

    const task = getTaskById(taskId);
    assert.ok(task);
    assert.strictEqual(task.reminders.length, 2);
    assert.strictEqual(task.reminders[0].reminderAt, '2026-03-20T10:00:00.000Z');
    assert.strictEqual(task.reminders[1].reminderAt, '2026-03-21T10:00:00.000Z');
  });

  it('deleteReminder deletes a reminder', () => {
    const reminder = createReminder(taskId, '2026-03-20T10:00:00.000Z');
    assert.strictEqual(deleteReminder(reminder.id), true);

    const task = getTaskById(taskId);
    assert.strictEqual(task.reminders.length, 0);
  });

  it('deleteReminder returns false for nonexistent id', () => {
    assert.strictEqual(deleteReminder('nonexistent'), false);
  });
});

// ===========================================================================
// Audit Log
// ===========================================================================

describe('Audit Log', () => {
  let taskId;

  beforeEach(() => {
    taskId = makeTask('Audited Task').id;
  });

  it('getAuditLogs returns empty array initially', () => {
    const logs = getAuditLogs(taskId);
    assert.ok(Array.isArray(logs));
    assert.strictEqual(logs.length, 0);
  });

  it('createAuditLog creates an entry', () => {
    const entry = createAuditLog({
      taskId,
      action: 'created',
      field: null,
      oldValue: null,
      newValue: null,
    });

    assert.ok(entry.id);
    assert.strictEqual(entry.taskId, taskId);
    assert.strictEqual(entry.action, 'created');
    assert.strictEqual(entry.field, null);
    assert.strictEqual(entry.oldValue, null);
    assert.strictEqual(entry.newValue, null);
    assert.ok(entry.createdAt);
  });

  it('createAuditLog with field changes records values', () => {
    const entry = createAuditLog({
      taskId,
      action: 'updated',
      field: 'priority',
      oldValue: 'none',
      newValue: 'high',
    });

    assert.strictEqual(entry.action, 'updated');
    assert.strictEqual(entry.field, 'priority');
    assert.strictEqual(entry.oldValue, 'none');
    assert.strictEqual(entry.newValue, 'high');
  });

  it('getAuditLogs returns entries ordered by created_at DESC', () => {
    createAuditLog({ taskId, action: 'created', field: null, oldValue: null, newValue: null });
    // Use a small delay to ensure different timestamps
    const start = Date.now();
    while (Date.now() - start < 5) {} // busy wait 5ms
    createAuditLog({ taskId, action: 'updated', field: 'title', oldValue: 'Old', newValue: 'New' });

    const logs = getAuditLogs(taskId);
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].action, 'updated');
    assert.strictEqual(logs[1].action, 'created');
  });

  it('getAuditLogs only returns entries for the specified task', () => {
    const task2 = makeTask('Other Task');

    createAuditLog({ taskId, action: 'created', field: null, oldValue: null, newValue: null });
    createAuditLog({ taskId: task2.id, action: 'created', field: null, oldValue: null, newValue: null });

    const logs = getAuditLogs(taskId);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].taskId, taskId);
  });

  it('supports all audit log action types', () => {
    const actions = ['created', 'updated', 'completed', 'uncompleted', 'deleted', 'restored'];

    for (const action of actions) {
      const entry = createAuditLog({
        taskId,
        action,
        field: null,
        oldValue: null,
        newValue: null,
      });
      assert.strictEqual(entry.action, action);
    }

    const logs = getAuditLogs(taskId);
    assert.strictEqual(logs.length, actions.length);
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
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].task.title, 'Buy groceries');
    assert.strictEqual(results[0].score, 1);
    assert.strictEqual(results[0].matches[0].field, 'title');
  });

  it('searchTasks finds tasks by description', () => {
    const results = searchTasks('financial');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].task.title, 'Write report');
    assert.strictEqual(results[0].score, 0.5);
    assert.strictEqual(results[0].matches[0].field, 'description');
  });

  it('searchTasks is case-insensitive', () => {
    const results = searchTasks('GROCERIES');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].task.title, 'Buy groceries');
  });

  it('searchTasks returns empty array for no matches', () => {
    const results = searchTasks('nonexistent query');
    assert.strictEqual(results.length, 0);
  });

  it('searchTasks partial match works', () => {
    const results = searchTasks('repo');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].task.title, 'Write report');
  });

  it('searchTasks finds multiple matches', () => {
    // "Buy groceries" and "Write report" both have 'r' in title
    const results = searchTasks('r');
    assert.strictEqual(results.length, 2);
  });

  it('searchTasks title match has higher score than description match', () => {
    const results = searchTasks('report');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].score, 1);
  });

  it('searchTasks returns task with all relations', () => {
    const results = searchTasks('groceries');
    assert.ok(results[0].task.list);
    assert.ok(results[0].task.subtasks);
    assert.ok(results[0].task.labels);
  });
});
