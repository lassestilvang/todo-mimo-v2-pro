'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast, parseISO, isThisYear, startOfDay } from 'date-fns';
import {
  Plus,
  Clock,
  MoreHorizontal,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Repeat,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Task, ViewType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateBadge(dateStr: string): string {
  const date = startOfDay(parseISO(dateStr));
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

function isOverdue(task: Task): boolean {
  if (!task.date || task.completed) return false;
  return isPast(startOfDay(parseISO(task.date)));
}

function priorityColor(p: Task['priority']): string {
  switch (p) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-blue-500';
    default: return '';
  }
}

function viewTitle(view: ViewType | null): string {
  switch (view) {
    case 'today': return 'Today';
    case 'next7days': return 'Next 7 Days';
    case 'upcoming': return 'Upcoming';
    case 'all': return 'All Tasks';
    default: return 'Tasks';
  }
}

function groupKey(task: Task, isViewMode: boolean): string {
  if (!isViewMode) return 'all';
  if (!task.date) return 'no-date';
  if (isOverdue(task)) return 'overdue';
  const date = startOfDay(parseISO(task.date));
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  return task.date;
}

function groupLabel(key: string): string {
  switch (key) {
    case 'overdue': return 'Overdue';
    case 'today': return 'Today';
    case 'tomorrow': return 'Tomorrow';
    case 'no-date': return 'No Date';
    default: return formatDateBadge(key);
  }
}

function estimateDisplay(estimate: string | null): string | null {
  if (!estimate) return null;
  const [h, m] = estimate.split(':').map(Number);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskList() {
  const {
    selectedListId,
    selectedView,
    selectedLabelId,
    selectedTaskId,
    showCompleted,
    setSelectedTaskId,
    setShowCompleted,
  } = useAppStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [inboxId, setInboxId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Determine display title
  const headerTitle = selectedView
    ? viewTitle(selectedView)
    : selectedListId
      ? tasks[0]?.list?.name ?? 'Tasks'
      : selectedLabelId
        ? tasks[0]?.labels?.find((l) => l.id === selectedLabelId)?.name ?? 'Label'
        : 'Tasks';

  // Fetch inbox list ID
  useEffect(() => {
    fetch('/api/lists')
      .then((r) => r.json())
      .then((lists: { id: string; isInbox: boolean }[]) => {
        const inbox = lists.find((l) => l.isInbox);
        if (inbox) setInboxId(inbox.id);
      })
      .catch(() => {});
  }, []);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedListId) params.set('listId', selectedListId);
    if (selectedView) params.set('view', selectedView);
    if (selectedLabelId) params.set('labelId', selectedLabelId);
    params.set('showCompleted', String(showCompleted));

    try {
      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const data: Task[] = await res.json();
        setTasks(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [selectedListId, selectedView, selectedLabelId, showCompleted]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Toggle task completion
  const handleToggle = useCallback(
    async (task: Task) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: !t.completed } : t,
        ),
      );
      try {
        await fetch(`/api/tasks/${task.id}/toggle`, { method: 'POST' });
      } catch {
        // revert on error
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, completed: task.completed } : t,
          ),
        );
      }
    },
    [],
  );

  // Delete task
  const handleDelete = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch {
      fetchTasks();
    }
  }, [selectedTaskId, setSelectedTaskId, fetchTasks]);

  // Add new task
  const handleAddTask = useCallback(async () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    const listId = selectedListId ?? inboxId;
    if (!listId) return;

    let date: string | null = null;
    if (selectedView === 'today') {
      date = format(new Date(), 'yyyy-MM-dd');
    }

    setNewTaskTitle('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, listId, date }),
      });
      if (res.ok) {
        const created: Task = await res.json();
        setTasks((prev) => [...prev, created]);
      }
    } catch {
      // silent fail
    }
  }, [newTaskTitle, selectedListId, inboxId, selectedView]);

  // Group tasks
  const isViewMode = !!selectedView;
  const groupMap = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = groupKey(task, isViewMode);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(task);
  }

  // Sort group keys: overdue first, then today, tomorrow, date asc, no-date last
  const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => {
    if (a === 'overdue') return -1;
    if (b === 'overdue') return 1;
    if (a === 'today') return -1;
    if (b === 'today') return 1;
    if (a === 'tomorrow') return -1;
    if (b === 'tomorrow') return 1;
    if (a === 'no-date') return 1;
    if (b === 'no-date') return -1;
    return a.localeCompare(b);
  });

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="truncate text-lg font-semibold">{headerTitle}</h1>
          {!loading && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {tasks.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant={showCompleted ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs"
          >
            <CheckCircle2 className="mr-1 size-3.5" />
            {showCompleted ? 'Hide completed' : 'Show completed'}
          </Button>
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 px-4">
        {loading ? (
          <TaskListSkeleton />
        ) : tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-6 pb-4">
            {sortedKeys.map((key) => {
              const groupTasks = groupMap.get(key)!;
              const isCollapsed = collapsedGroups.has(key);
              const isDateGroup = isViewMode && sortedKeys.length > 1;

              return (
                <div key={key}>
                  {isDateGroup ? (
                    <button
                      onClick={() => toggleGroup(key)}
                      className="group mb-2 flex w-full items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                      {key === 'overdue' && (
                        <AlertTriangle className="size-3.5 text-red-500" />
                      )}
                      {groupLabel(key)}
                      <span className="text-xs text-muted-foreground">
                        ({groupTasks.length})
                      </span>
                    </button>
                  ) : null}

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col">
                          <AnimatePresence>
                            {groupTasks.map((task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                isSelected={task.id === selectedTaskId}
                                onSelect={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                                onToggle={() => handleToggle(task)}
                                onDelete={() => handleDelete(task.id)}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Quick add */}
      <div className="border-t border-border px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTask();
          }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={!newTaskTitle.trim() || (!selectedListId && !inboxId)}
          >
            <Plus className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskItem
// ---------------------------------------------------------------------------

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function TaskItem({ task, isSelected, onSelect, onToggle, onDelete }: TaskItemProps) {
  const overdue = isOverdue(task);
  const subtasks = task.subtasks ?? [];
  const completedSubs = subtasks.filter((s) => s.completed).length;
  const labels = task.labels ?? [];
  const est = estimateDisplay(task.estimate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
      onClick={onSelect}
      className={`group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        isSelected
          ? 'border-primary/40 bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      }`}
    >
      {/* Checkbox */}
      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={task.completed}
          onCheckedChange={onToggle}
          className={task.completed ? 'opacity-60' : ''}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {/* Priority dot */}
          {task.priority !== 'none' && (
            <span
              className={`mt-1.5 size-2 shrink-0 rounded-full ${priorityColor(task.priority)}`}
            />
          )}

          {/* Title */}
          <span
            className={`flex-1 text-sm leading-snug ${
              task.completed ? 'text-muted-foreground line-through' : ''
            }`}
          >
            {task.title}
          </span>

          {/* Recurring icon */}
          {task.recurring && (
            <Repeat className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          )}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="mt-0.5 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Date badge */}
          {task.date && (
            <Badge
              variant={overdue ? 'destructive' : 'outline'}
              className="gap-1 text-[11px] px-1.5 py-0 h-5"
            >
              {overdue && <AlertTriangle className="size-3" />}
              <Clock className="size-3" />
              {formatDateBadge(task.date)}
            </Badge>
          )}

          {/* Estimate */}
          {est && (
            <Badge variant="outline" className="gap-1 text-[11px] px-1.5 py-0 h-5">
              <Clock className="size-3" />
              {est}
            </Badge>
          )}

          {/* Subtask progress */}
          {subtasks.length > 0 && (
            <Badge variant="outline" className="gap-1 text-[11px] px-1.5 py-0 h-5">
              <ListTodo className="size-3" />
              {completedSubs}/{subtasks.length}
            </Badge>
          )}

          {/* Labels */}
          {labels.map((label) => (
            <Badge
              key={label.id}
              className="gap-1 text-[11px] px-1.5 py-0 h-5"
              style={{
                backgroundColor: `${label.color}15`,
                color: label.color,
                borderColor: `${label.color}30`,
              }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// TaskListSkeleton
// ---------------------------------------------------------------------------

function TaskListSkeleton() {
  return (
    <div className="flex flex-col gap-2 pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5"
        >
          <Skeleton className="mt-0.5 size-4 rounded-[4px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ListTodo className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No tasks yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add a task below to get started.
        </p>
      </div>
    </div>
  );
}
