'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow, isPast, startOfDay, isThisYear } from 'date-fns';
import {
  Search,
  Clock,
  AlertTriangle,
  Repeat,
  ListTodo,
  CheckCircle2,
} from 'lucide-react';
import Fuse from 'fuse.js';
import { useAppStore } from '@/lib/store';
import type { Task } from '@/lib/types';
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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

function estimateDisplay(estimate: string | null): string | null {
  if (!estimate) return null;
  const [h, m] = estimate.split(':').map(Number);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return null;
}

export function SearchResults() {
  const { searchQuery, setSelectedTaskId, selectedTaskId } = useAppStore();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllTasks() {
      setLoading(true);
      try {
        const res = await fetch('/api/tasks?showCompleted=true');
        if (res.ok) {
          const data: Task[] = await res.json();
          setAllTasks(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchAllTasks();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || allTasks.length === 0) {
      setResults(allTasks);
      return;
    }

    const fuse = new Fuse(allTasks, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'labels.name', weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
    });

    const fuseResults = fuse.search(searchQuery);
    setResults(fuseResults.map((r) => r.item));
  }, [searchQuery, allTasks]);

  const handleToggle = useCallback(async (task: Task) => {
    setAllTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, completed: !t.completed } : t,
      ),
    );
    try {
      await fetch(`/api/tasks/${task.id}/toggle`, { method: 'POST' });
    } catch {
      setAllTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: task.completed } : t,
        ),
      );
    }
  }, []);

  const handleDelete = useCallback(async (taskId: string) => {
    setAllTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch {
      // silent
    }
  }, [selectedTaskId, setSelectedTaskId]);

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold">Search Results</h1>
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-2 pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
                <Skeleton className="mt-0.5 size-4 rounded-[4px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold">
          Search: &quot;{searchQuery}&quot;
        </h1>
        <Badge variant="secondary" className="text-xs">
          {results.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-4">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Search className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No results found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search term.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            <AnimatePresence>
              {results.map((task) => {
                const overdue = isOverdue(task);
                const subtasks = task.subtasks ?? [];
                const completedSubs = subtasks.filter((s) => s.completed).length;
                const labels = task.labels ?? [];
                const est = estimateDisplay(task.estimate);
                const isSelected = task.id === selectedTaskId;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                    className={`group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-transparent hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggle(task)}
                        className={task.completed ? 'opacity-60' : ''}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        {task.priority !== 'none' && (
                          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${priorityColor(task.priority)}`} />
                        )}
                        <span className={`flex-1 text-sm leading-snug ${task.completed ? 'text-muted-foreground line-through' : ''}`}>
                          {task.title}
                        </span>
                        {task.recurring && (
                          <Repeat className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="mt-0.5 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}>
                              <Pencil className="mr-2 size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}>
                              <Trash2 className="mr-2 size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {task.date && (
                          <Badge variant={overdue ? 'destructive' : 'outline'} className="gap-1 text-[11px] px-1.5 py-0 h-5">
                            {overdue && <AlertTriangle className="size-3" />}
                            <Clock className="size-3" />
                            {formatDateBadge(task.date)}
                          </Badge>
                        )}
                        {est && (
                          <Badge variant="outline" className="gap-1 text-[11px] px-1.5 py-0 h-5">
                            <Clock className="size-3" /> {est}
                          </Badge>
                        )}
                        {subtasks.length > 0 && (
                          <Badge variant="outline" className="gap-1 text-[11px] px-1.5 py-0 h-5">
                            <ListTodo className="size-3" /> {completedSubs}/{subtasks.length}
                          </Badge>
                        )}
                        {labels.map((label) => (
                          <Badge
                            key={label.id}
                            className="gap-1 text-[11px] px-1.5 py-0 h-5"
                            style={{ backgroundColor: `${label.color}15`, color: label.color, borderColor: `${label.color}30` }}
                          >
                            {label.name}
                          </Badge>
                        ))}
                        {task.list && (
                          <Badge variant="outline" className="gap-1 text-[11px] px-1.5 py-0 h-5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: task.list.color }} />
                            {task.list.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
