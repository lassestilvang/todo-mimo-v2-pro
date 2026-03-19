'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  X,
  Calendar,
  Clock,
  Flag,
  Repeat,
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  ListTodo,
  History,
  Bell,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Task, Priority, Subtask, Label, AuditLog, TaskList, RecurringPattern, Reminder } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
  none: 'text-muted-foreground',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

const RECURRING_LABELS: Record<RecurringPattern, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  weekdays: 'Weekdays',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
};

function PropertyRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function AuditLogEntry({ entry }: { entry: AuditLog }) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-xs">
      <span className="text-muted-foreground whitespace-nowrap">
        {format(parseISO(entry.createdAt), 'MMM d, HH:mm')}
      </span>
      <span className="text-foreground">
        {entry.action}
        {entry.field && (
          <>
            {' '}
            <span className="text-muted-foreground">{entry.field}</span>
            {entry.oldValue && (
              <>
                {' from '}
                <span className="line-through text-muted-foreground">{entry.oldValue}</span>
              </>
            )}
            {entry.newValue && (
              <>
                {' to '}
                <span className="font-medium">{entry.newValue}</span>
              </>
            )}
          </>
        )}
      </span>
    </div>
  );
}

function TaskDetailContent({
  task,
  lists,
  labels,
  subtasks,
  reminders,
  auditLogs,
  onUpdate,
  onToggleComplete,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtask,
  onAddLabel,
  onRemoveLabel,
  onAddReminder,
  onDeleteReminder,
  auditLoading,
}: {
  task: Task;
  lists: TaskList[];
  labels: Label[];
  subtasks: Subtask[];
  reminders: Reminder[];
  auditLogs: AuditLog[];
  onUpdate: (field: string, value: string | null) => void;
  onToggleComplete: () => void;
  onDeleteTask: () => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onUpdateSubtask: (subtaskId: string, title: string) => void;
  onAddLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
  onAddReminder: (reminderAt: string) => void;
  onDeleteReminder: (reminderId: string) => void;
  auditLoading: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [showAudit, setShowAudit] = useState(false);
  const [newReminderDatetime, setNewReminderDatetime] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  const taskLabelIds = task.labels?.map((l) => l.id) ?? [];
  const assignedLabels = labels.filter((l) => taskLabelIds.includes(l.id));
  const unassignedLabels = labels.filter((l) => !taskLabelIds.includes(l.id));

  const handleTitleBlur = useCallback(() => {
    if (title.trim() !== task.title) {
      onUpdate('title', title.trim() || task.title);
    }
  }, [title, task.title, onUpdate]);

  const handleDescriptionBlur = useCallback(() => {
    if (description !== (task.description ?? '')) {
      onUpdate('description', description);
    }
  }, [description, task.description, onUpdate]);

  const handleAddSubtask = useCallback(() => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  }, [newSubtaskTitle, onAddSubtask]);

  const handleSubtaskEditBlur = useCallback(() => {
    if (editingSubtaskId && editingSubtaskTitle.trim()) {
      onUpdateSubtask(editingSubtaskId, editingSubtaskTitle.trim());
    }
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  }, [editingSubtaskId, editingSubtaskTitle, onUpdateSubtask]);

  const handleAddReminder = useCallback(() => {
    if (newReminderDatetime) {
      onAddReminder(new Date(newReminderDatetime).toISOString());
      setNewReminderDatetime('');
    }
  }, [newReminderDatetime, onAddReminder]);

  const estimateRef = useRef(task.estimate ?? '');
  const actualTimeRef = useRef(task.actualTime ?? '');

  useEffect(() => {
    estimateRef.current = task.estimate ?? '';
    actualTimeRef.current = task.actualTime ?? '';
  }, [task.estimate, task.actualTime]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 pb-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleComplete}
          className="shrink-0"
        >
          {task.completed ? (
            <CheckCircle2 className="size-5 text-primary" />
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </Button>
        <input
          className="flex-1 bg-transparent text-lg font-semibold outline-none border-none focus:ring-0 placeholder:text-muted-foreground"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Task title"
        />
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 pb-6">
          {/* Description */}
          <div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add a description..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Properties */}
          <div className="space-y-1">
            {/* List */}
            <PropertyRow icon={ListTodo} label="List">
              <Select
                value={task.listId}
                onValueChange={(value) => onUpdate('listId', value)}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: list.color }}
                      />
                      {list.emoji} {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropertyRow>

            {/* Date */}
            <PropertyRow icon={Calendar} label="Date">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger className="inline-flex h-7 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-2.5 text-sm font-normal hover:bg-accent hover:text-accent-foreground">
                  <Calendar className="size-3.5" />
                  {task.date ? format(parseISO(task.date), 'MMM d, yyyy') : 'Pick a date'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={task.date ? parseISO(task.date) : undefined}
                    onSelect={(date) => {
                      onUpdate('date', date ? format(date, 'yyyy-MM-dd') : null);
                      setDateOpen(false);
                    }}
                    initialFocus
                  />
                  {task.date && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onUpdate('date', null);
                          setDateOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </PropertyRow>

            {/* Deadline */}
            <PropertyRow icon={Calendar} label="Deadline">
              <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
                <PopoverTrigger className="inline-flex h-7 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-2.5 text-sm font-normal hover:bg-accent hover:text-accent-foreground">
                  <Calendar className="size-3.5" />
                  {task.deadline ? format(parseISO(task.deadline), 'MMM d, yyyy') : 'Set deadline'}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={task.deadline ? parseISO(task.deadline) : undefined}
                    onSelect={(date) => {
                      onUpdate('deadline', date ? format(date, 'yyyy-MM-dd') : null);
                      setDeadlineOpen(false);
                    }}
                    initialFocus
                  />
                  {task.deadline && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onUpdate('deadline', null);
                          setDeadlineOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </PropertyRow>

            {/* Priority */}
            <PropertyRow icon={Flag} label="Priority">
              <Select
                value={task.priority}
                onValueChange={(value) => onUpdate('priority', value)}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <Flag className={`size-3.5 ${PRIORITY_COLORS[p]}`} />
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropertyRow>

            {/* Estimate */}
            <PropertyRow icon={Clock} label="Estimate">
              <Input
                type="time"
                value={task.estimate ?? ''}
                onChange={(e) => {
                  estimateRef.current = e.target.value;
                }}
                onBlur={() => {
                  if (estimateRef.current !== (task.estimate ?? '')) {
                    onUpdate('estimate', estimateRef.current || null);
                  }
                }}
                className="h-7 text-sm"
              />
            </PropertyRow>

            {/* Actual Time */}
            <PropertyRow icon={Clock} label="Actual Time">
              <Input
                type="time"
                value={task.actualTime ?? ''}
                onChange={(e) => {
                  actualTimeRef.current = e.target.value;
                }}
                onBlur={() => {
                  if (actualTimeRef.current !== (task.actualTime ?? '')) {
                    onUpdate('actualTime', actualTimeRef.current || null);
                  }
                }}
                className="h-7 text-sm"
              />
            </PropertyRow>

            {/* Recurring */}
            <PropertyRow icon={Repeat} label="Recurring">
              <Select
                value={task.recurring ?? 'none'}
                onValueChange={(value) =>
                  onUpdate('recurring', value === 'none' ? null : value)
                }
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Not recurring" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not recurring</SelectItem>
                  {(Object.keys(RECURRING_LABELS) as RecurringPattern[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {RECURRING_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropertyRow>
          </div>

          <Separator />

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Subtasks</span>
                {totalCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{totalCount} completed
                  </span>
                )}
              </div>
            </div>

            {totalCount > 0 && (
              <div className="h-1.5 w-full rounded-full bg-muted mb-3">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="group flex items-center gap-2 py-1 rounded-md hover:bg-muted/50 px-1"
                >
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => onToggleSubtask(subtask)}
                  />
                  {editingSubtaskId === subtask.id ? (
                    <input
                      className="flex-1 bg-transparent text-sm outline-none border-none"
                      value={editingSubtaskTitle}
                      onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                      onBlur={handleSubtaskEditBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubtaskEditBlur();
                        if (e.key === 'Escape') {
                          setEditingSubtaskId(null);
                          setEditingSubtaskTitle('');
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`flex-1 text-sm cursor-pointer ${
                        subtask.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                      onClick={() => {
                        setEditingSubtaskId(subtask.id);
                        setEditingSubtaskTitle(subtask.title);
                      }}
                    >
                      {subtask.title}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => onDeleteSubtask(subtask.id)}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                placeholder="Add subtask..."
                className="h-7 text-sm"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Labels */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Labels</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {assignedLabels.map((label) => (
                <Badge
                  key={label.id}
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => onRemoveLabel(label.id)}
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                  <X className="size-3 ml-0.5" />
                </Badge>
              ))}

              {unassignedLabels.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-xs hover:bg-accent hover:text-accent-foreground">
                    <Plus className="size-3" />
                    Add
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {unassignedLabels.map((label) => (
                      <DropdownMenuItem
                        key={label.id}
                        onClick={() => onAddLabel(label.id)}
                      >
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <Separator />

          {/* Reminders */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Reminders</span>
            </div>

            <div className="space-y-1">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="group flex items-center gap-2 py-1 rounded-md hover:bg-muted/50 px-1"
                >
                  <Bell className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm">
                    {format(parseISO(reminder.reminderAt), 'MMM d, yyyy HH:mm')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => onDeleteReminder(reminder.id)}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Input
                type="datetime-local"
                value={newReminderDatetime}
                onChange={(e) => setNewReminderDatetime(e.target.value)}
                className="h-7 text-sm"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleAddReminder}
                disabled={!newReminderDatetime}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Audit Log */}
          <div>
            <button
              className="flex items-center gap-2 w-full text-left py-1"
              onClick={() => setShowAudit(!showAudit)}
            >
              <History className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Activity</span>
              {showAudit ? (
                <ChevronUp className="size-3.5 text-muted-foreground ml-auto" />
              ) : (
                <ChevronDown className="size-3.5 text-muted-foreground ml-auto" />
              )}
            </button>

            <AnimatePresence>
              {showAudit && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 space-y-0.5">
                    {auditLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No activity yet
                      </p>
                    ) : (
                      auditLogs.map((entry) => (
                        <AuditLogEntry key={entry.id} entry={entry} />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator />

          {/* Delete Task */}
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDeleteTask}
          >
            <Trash2 className="size-4 mr-1.5" />
            Delete Task
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

export function TaskDetailPanel() {
  const { selectedTaskId, setSelectedTaskId } = useAppStore();
  const [task, setTask] = useState<Task | null>(null);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchTask = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        setSubtasks(data.subtasks ?? []);
        setReminders(data.reminders ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch task:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch('/api/lists');
      if (res.ok) setLists(await res.json());
    } catch (err) {
      console.error('Failed to fetch lists:', err);
    }
  }, []);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch('/api/labels');
      if (res.ok) setLabels(await res.json());
    } catch (err) {
      console.error('Failed to fetch labels:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (taskId: string) => {
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/audit`);
      if (res.ok) setAuditLogs(await res.json());
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      fetchTask(selectedTaskId);
      fetchLists();
      fetchLabels();
      fetchAuditLogs(selectedTaskId);
    } else {
      setTask(null);
      setSubtasks([]);
      setReminders([]);
      setAuditLogs([]);
    }
  }, [selectedTaskId, fetchTask, fetchLists, fetchLabels, fetchAuditLogs]);

  const handleClose = useCallback(() => {
    setSelectedTaskId(null);
  }, [setSelectedTaskId]);

  const handleUpdate = useCallback(
    async (field: string, value: string | null | boolean) => {
      if (!task) return;
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        });
        if (res.ok) {
          const updated = await res.json();
          setTask((prev) => (prev ? { ...prev, ...updated } : prev));
        }
      } catch (err) {
        console.error('Failed to update task:', err);
      }
    },
    [task],
  );

  const handleToggleComplete = useCallback(async () => {
    if (!task) return;
    await handleUpdate('completed', !task.completed);
    setTask((prev) =>
      prev ? { ...prev, completed: !prev.completed } : prev,
    );
  }, [task, handleUpdate]);

  const handleDeleteTask = useCallback(async () => {
    if (!task) return;
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [task, setSelectedTaskId]);

  const handleAddSubtask = useCallback(
    async (title: string) => {
      if (!task) return;
      try {
        const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          const newSubtask = await res.json();
          setSubtasks((prev) => [...prev, newSubtask]);
        }
      } catch (err) {
        console.error('Failed to add subtask:', err);
      }
    },
    [task],
  );

  const handleToggleSubtask = useCallback(
    async (subtask: Subtask) => {
      try {
        const res = await fetch(`/api/subtasks/${subtask.id}/toggle`, {
          method: 'POST',
        });
        if (res.ok) {
          const updated = await res.json();
          setSubtasks((prev) =>
            prev.map((s) => (s.id === subtask.id ? { ...s, ...updated } : s)),
          );
        }
      } catch (err) {
        console.error('Failed to toggle subtask:', err);
      }
    },
    [],
  );

  const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
    try {
      await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  }, []);

  const handleUpdateSubtask = useCallback(
    async (subtaskId: string, title: string) => {
      try {
        const res = await fetch(`/api/subtasks/${subtaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          const updated = await res.json();
          setSubtasks((prev) =>
            prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s)),
          );
        }
      } catch (err) {
        console.error('Failed to update subtask:', err);
      }
    },
    [],
  );

  const handleAddLabel = useCallback(
    async (labelId: string) => {
      if (!task) return;
      try {
        const res = await fetch(`/api/tasks/${task.id}/labels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelId }),
        });
        if (res.ok) {
          const label = labels.find((l) => l.id === labelId);
          if (label) {
            setTask((prev) =>
              prev
                ? { ...prev, labels: [...(prev.labels ?? []), label] }
                : prev,
            );
          }
        }
      } catch (err) {
        console.error('Failed to add label:', err);
      }
    },
    [task, labels],
  );

  const handleRemoveLabel = useCallback(
    async (labelId: string) => {
      if (!task) return;
      try {
        const res = await fetch(`/api/tasks/${task.id}/labels`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelId }),
        });
        if (res.ok) {
          setTask((prev) =>
            prev
              ? {
                  ...prev,
                  labels: (prev.labels ?? []).filter((l) => l.id !== labelId),
                }
              : prev,
          );
        }
      } catch (err) {
        console.error('Failed to remove label:', err);
      }
    },
    [task],
  );

  const handleAddReminder = useCallback(
    async (reminderAt: string) => {
      if (!task) return;
      try {
        const res = await fetch(`/api/tasks/${task.id}/reminders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reminderAt }),
        });
        if (res.ok) {
          const newReminder = await res.json();
          setReminders((prev) => [...prev, newReminder]);
        }
      } catch (err) {
        console.error('Failed to add reminder:', err);
      }
    },
    [task],
  );

  const handleDeleteReminder = useCallback(async (reminderId: string) => {
    try {
      await fetch(`/api/reminders/${reminderId}`, { method: 'DELETE' });
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  }, []);

  const isOpen = !!selectedTaskId;

  const content = loading ? (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ) : task ? (
    <TaskDetailContent
      key={task.id}
      task={task}
      lists={lists}
      labels={labels}
      subtasks={subtasks}
      reminders={reminders}
      auditLogs={auditLogs}
      onUpdate={handleUpdate}
      onToggleComplete={handleToggleComplete}
      onDeleteTask={handleDeleteTask}
      onAddSubtask={handleAddSubtask}
      onToggleSubtask={handleToggleSubtask}
      onDeleteSubtask={handleDeleteSubtask}
      onUpdateSubtask={handleUpdateSubtask}
      onAddLabel={handleAddLabel}
      onRemoveLabel={handleRemoveLabel}
      onAddReminder={handleAddReminder}
      onDeleteReminder={handleDeleteReminder}
      auditLoading={auditLoading}
    />
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="right" showCloseButton={false} className="w-full sm:max-w-sm p-0">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="text-sm font-medium">Task Details</span>
            <Button variant="ghost" size="icon-sm" onClick={handleClose}>
              <X className="size-4" />
            </Button>
          </div>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && task && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed top-0 right-0 bottom-0 w-[400px] border-l bg-background z-40 flex flex-col"
        >
          <div className="flex items-center justify-between p-3 border-b shrink-0">
            <span className="text-sm font-medium">Task Details</span>
            <Button variant="ghost" size="icon-sm" onClick={handleClose}>
              <X className="size-4" />
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : task ? (
            <TaskDetailContent
              key={task.id}
              task={task}
              lists={lists}
              labels={labels}
              subtasks={subtasks}
              reminders={reminders}
              auditLogs={auditLogs}
              onUpdate={handleUpdate}
              onToggleComplete={handleToggleComplete}
              onDeleteTask={handleDeleteTask}
              onAddSubtask={handleAddSubtask}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onUpdateSubtask={handleUpdateSubtask}
              onAddLabel={handleAddLabel}
              onRemoveLabel={handleRemoveLabel}
              onAddReminder={handleAddReminder}
              onDeleteReminder={handleDeleteReminder}
              auditLoading={auditLoading}
            />
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
