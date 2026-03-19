'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  CalendarRange,
  CalendarPlus,
  ListIcon,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sun,
  Moon,
  AlertCircle,
  Tag,
  Hash,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import type { TaskList, Label, ViewType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TasksByView {
  today: number;
  next7days: number;
  upcoming: number;
  all: number;
  overdue: number;
}

interface TasksByList {
  [listId: string]: number;
}

interface TasksByLabel {
  [labelId: string]: number;
}

const viewConfig: {
  type: ViewType;
  label: string;
  icon: typeof CalendarDays;
}[] = [
  { type: 'today', label: 'Today', icon: CalendarDays },
  { type: 'next7days', label: 'Next 7 Days', icon: CalendarRange },
  { type: 'upcoming', label: 'Upcoming', icon: CalendarPlus },
  { type: 'all', label: 'All', icon: ListIcon },
];

const itemVariants = {
  hidden: { opacity: 0, x: -12, height: 0 },
  visible: { opacity: 1, x: 0, height: 'auto' },
  exit: { opacity: 0, x: 12, height: 0 },
};

export function Sidebar() {
  const {
    selectedListId,
    selectedView,
    selectedLabelId,
    setSelectedListId,
    setSelectedView,
    setSelectedLabelId,
    setSearchQuery,
    setSidebarOpen,
  } = useAppStore();

  const { theme, setTheme } = useTheme();

  const [lists, setLists] = useState<TaskList[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [tasksByView, setTasksByView] = useState<TasksByView>({
    today: 0,
    next7days: 0,
    upcoming: 0,
    all: 0,
    overdue: 0,
  });
  const [tasksByList, setTasksByList] = useState<TasksByList>({});
  const [tasksByLabel, setTasksByLabel] = useState<TasksByLabel>({});

  const [searchInput, setSearchInput] = useState('');

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editListDialogOpen, setEditListDialogOpen] = useState(false);
  const [listName, setListName] = useState('');
  const [listEmoji, setListEmoji] = useState('');
  const [listColor, setListColor] = useState('#6366f1');
  const [editingList, setEditingList] = useState<TaskList | null>(null);

  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [editLabelDialogOpen, setEditLabelDialogOpen] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [labelIcon, setLabelIcon] = useState('');
  const [labelColor, setLabelColor] = useState('#6366f1');
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);

  useEffect(() => {
    fetchLists();
    fetchLabels();
    fetchTaskCounts();
  }, []);

  async function fetchLists() {
    setLoadingLists(true);
    try {
      const res = await fetch('/api/lists');
      if (res.ok) {
        const data = await res.json();
        setLists(data);
        const counts: TasksByList = {};
        for (const list of data) {
          const countRes = await fetch(`/api/lists/${list.id}/tasks`);
          if (countRes.ok) {
            const tasks = await countRes.json();
            counts[list.id] = tasks.filter(
              (t: { completed: boolean }) => !t.completed,
            ).length;
          }
        }
        setTasksByList(counts);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingLists(false);
    }
  }

  async function fetchLabels() {
    setLoadingLabels(true);
    try {
      const res = await fetch('/api/labels');
      if (res.ok) {
        const data = await res.json();
        setLabels(data);
        const counts: TasksByLabel = {};
        for (const label of data) {
          const countRes = await fetch(`/api/labels/${label.id}/tasks`);
          if (countRes.ok) {
            const tasks = await countRes.json();
            counts[label.id] = tasks.filter(
              (t: { completed: boolean }) => !t.completed,
            ).length;
          }
        }
        setTasksByLabel(counts);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingLabels(false);
    }
  }

  async function fetchTaskCounts() {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const tasks: {
          completed: boolean;
          date: string | null;
        }[] = await res.json();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const in7Days = new Date(now);
        in7Days.setDate(in7Days.getDate() + 7);

        let today = 0;
        let next7days = 0;
        let upcoming = 0;
        let overdue = 0;

        for (const task of tasks) {
          if (task.completed) continue;
          if (task.date) {
            const taskDate = new Date(task.date);
            if (task.date === todayStr) {
              today++;
              next7days++;
            } else if (taskDate <= in7Days && taskDate > now) {
              next7days++;
              upcoming++;
            } else if (taskDate > in7Days) {
              upcoming++;
            } else if (taskDate < now && task.date !== todayStr) {
              overdue++;
            }
          }
        }

        const all = tasks.filter((t) => !t.completed).length;

        setTasksByView({ today, next7days, upcoming, all, overdue });
      }
    } catch {
      // silent fail
    }
  }

  function selectView(view: ViewType) {
    setSelectedView(view);
    setSelectedListId(null);
    setSelectedLabelId(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  function selectList(listId: string) {
    setSelectedListId(listId);
    setSelectedView(null);
    setSelectedLabelId(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  function selectLabel(labelId: string) {
    setSelectedLabelId(labelId);
    setSelectedView(null);
    setSelectedListId(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchInput(value);
    setSearchQuery(value);
    if (value.trim()) {
      setSelectedView(null);
      setSelectedListId(null);
      setSelectedLabelId(null);
    }
  }

  async function handleCreateList() {
    if (!listName.trim()) return;
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: listName.trim(),
          emoji: listEmoji.trim() || '📋',
          color: listColor,
        }),
      });
      if (res.ok) {
        const newList = await res.json();
        setLists((prev) => [...prev, newList]);
        setTasksByList((prev) => ({ ...prev, [newList.id]: 0 }));
        setListDialogOpen(false);
        setListName('');
        setListEmoji('');
        setListColor('#6366f1');
      }
    } catch {
      // silent fail
    }
  }

  async function handleEditList() {
    if (!editingList || !listName.trim()) return;
    try {
      const res = await fetch(`/api/lists/${editingList.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: listName.trim(),
          emoji: listEmoji.trim() || '📋',
          color: listColor,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLists((prev) =>
          prev.map((l) => (l.id === updated.id ? updated : l)),
        );
        setEditListDialogOpen(false);
        setEditingList(null);
        setListName('');
        setListEmoji('');
        setListColor('#6366f1');
      }
    } catch {
      // silent fail
    }
  }

  async function handleDeleteList(listId: string) {
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLists((prev) => prev.filter((l) => l.id !== listId));
        setTasksByList((prev) => {
          const next = { ...prev };
          delete next[listId];
          return next;
        });
        if (selectedListId === listId) {
          setSelectedListId(null);
          setSelectedView('today');
        }
      }
    } catch {
      // silent fail
    }
  }

  function openEditListDialog(list: TaskList) {
    setEditingList(list);
    setListName(list.name);
    setListEmoji(list.emoji);
    setListColor(list.color);
    setEditListDialogOpen(true);
  }

  async function handleCreateLabel() {
    if (!labelName.trim()) return;
    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: labelName.trim(),
          icon: labelIcon.trim() || '🏷️',
          color: labelColor,
        }),
      });
      if (res.ok) {
        const newLabel = await res.json();
        setLabels((prev) => [...prev, newLabel]);
        setTasksByLabel((prev) => ({ ...prev, [newLabel.id]: 0 }));
        setLabelDialogOpen(false);
        setLabelName('');
        setLabelIcon('');
        setLabelColor('#6366f1');
      }
    } catch {
      // silent fail
    }
  }

  async function handleEditLabel() {
    if (!editingLabel || !labelName.trim()) return;
    try {
      const res = await fetch(`/api/labels/${editingLabel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: labelName.trim(),
          icon: labelIcon.trim() || '🏷️',
          color: labelColor,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLabels((prev) =>
          prev.map((l) => (l.id === updated.id ? updated : l)),
        );
        setEditLabelDialogOpen(false);
        setEditingLabel(null);
        setLabelName('');
        setLabelIcon('');
        setLabelColor('#6366f1');
      }
    } catch {
      // silent fail
    }
  }

  async function handleDeleteLabel(labelId: string) {
    try {
      const res = await fetch(`/api/labels/${labelId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLabels((prev) => prev.filter((l) => l.id !== labelId));
        setTasksByLabel((prev) => {
          const next = { ...prev };
          delete next[labelId];
          return next;
        });
        if (selectedLabelId === labelId) {
          setSelectedLabelId(null);
          setSelectedView('today');
        }
      }
    } catch {
      // silent fail
    }
  }

  function openEditLabelDialog(label: Label) {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelIcon(label.icon);
    setLabelColor(label.color);
    setEditLabelDialogOpen(true);
  }

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      {/* Search */}
      <div className="border-b border-sidebar-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchInput}
            onChange={handleSearch}
            className="h-9 pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-3">
          {/* Views Section */}
          <div className="mb-1 px-2 py-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Views
            </span>
          </div>

          {viewConfig.map((view) => {
            const Icon = view.icon;
            const isActive = selectedView === view.type;
            const count =
              tasksByView[view.type as keyof Omit<TasksByView, 'overdue'>];
            return (
              <button
                key={view.type}
                onClick={() => selectView(view.type)}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{view.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}

          {/* Overdue */}
          {tasksByView.overdue > 0 && (
            <button
              onClick={() => {
                setSelectedView('all');
                setSelectedListId(null);
                setSelectedLabelId(null);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="flex-1 text-left">Overdue</span>
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
                {tasksByView.overdue}
              </Badge>
            </button>
          )}

          <Separator className="my-2" />

          {/* Lists Section */}
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Lists
            </span>
          </div>

          {loadingLists ? (
            <div className="flex flex-col gap-1 px-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {lists.map((list) => {
                const isActive = selectedListId === list.id;
                const count = tasksByList[list.id] || 0;
                return (
                  <motion.div
                    key={list.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    layout
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }`}
                        onClick={() => selectList(list.id)}
                        onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
                      >
                        <span className="shrink-0 text-base leading-none">
                          {list.emoji}
                        </span>
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: list.color }}
                        />
                        <span className="flex-1 truncate text-left">{list.name}</span>
                        {count > 0 && (
                          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                            {count}
                          </Badge>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="right" sideOffset={8}>
                        <DropdownMenuItem
                          onClick={() => openEditListDialog(list)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDeleteList(list.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          <button
            onClick={() => {
              setListName('');
              setListEmoji('');
              setListColor('#6366f1');
              setListDialogOpen(true);
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Plus className="size-4 shrink-0" />
            <span>Add List</span>
          </button>

          <Separator className="my-2" />

          {/* Labels Section */}
          <div className="mb-1 px-2 py-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Labels
            </span>
          </div>

          {loadingLabels ? (
            <div className="flex flex-col gap-1 px-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {labels.map((label) => {
                const isActive = selectedLabelId === label.id;
                const count = tasksByLabel[label.id] || 0;
                return (
                  <motion.div
                    key={label.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    layout
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }`}
                        onClick={() => selectLabel(label.id)}
                        onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
                      >
                        <Tag className="size-4 shrink-0" />
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 truncate text-left">{label.name}</span>
                        {count > 0 && (
                          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                            {count}
                          </Badge>
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="right" sideOffset={8}>
                        <DropdownMenuItem
                          onClick={() => openEditLabelDialog(label)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDeleteLabel(label.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          <button
            onClick={() => {
              setLabelName('');
              setLabelIcon('');
              setLabelColor('#6366f1');
              setLabelDialogOpen(true);
            }}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Plus className="size-4 shrink-0" />
            <span>Add Label</span>
          </button>
        </div>
      </ScrollArea>

      {/* Footer - Theme Toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </Button>
      </div>

      {/* Create List Dialog */}
      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add List</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="w-16">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Emoji
                </label>
                <Input
                  placeholder="📋"
                  value={listEmoji}
                  onChange={(e) => setListEmoji(e.target.value)}
                  className="text-center text-lg"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Name
                </label>
                <Input
                  placeholder="List name"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateList();
                  }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={listColor}
                  onChange={(e) => setListColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-input"
                />
                <span className="text-sm text-muted-foreground">{listColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setListDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={!listName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={editListDialogOpen} onOpenChange={setEditListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="w-16">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Emoji
                </label>
                <Input
                  placeholder="📋"
                  value={listEmoji}
                  onChange={(e) => setListEmoji(e.target.value)}
                  className="text-center text-lg"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Name
                </label>
                <Input
                  placeholder="List name"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditList();
                  }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={listColor}
                  onChange={(e) => setListColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-input"
                />
                <span className="text-sm text-muted-foreground">{listColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditListDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditList} disabled={!listName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Label Dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Label</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="w-16">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Icon
                </label>
                <Input
                  placeholder="🏷️"
                  value={labelIcon}
                  onChange={(e) => setLabelIcon(e.target.value)}
                  className="text-center text-lg"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Name
                </label>
                <Input
                  placeholder="Label name"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateLabel();
                  }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={labelColor}
                  onChange={(e) => setLabelColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-input"
                />
                <span className="text-sm text-muted-foreground">{labelColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLabel} disabled={!labelName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Label Dialog */}
      <Dialog open={editLabelDialogOpen} onOpenChange={setEditLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="w-16">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Icon
                </label>
                <Input
                  placeholder="🏷️"
                  value={labelIcon}
                  onChange={(e) => setLabelIcon(e.target.value)}
                  className="text-center text-lg"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Name
                </label>
                <Input
                  placeholder="Label name"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditLabel();
                  }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={labelColor}
                  onChange={(e) => setLabelColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-input"
                />
                <span className="text-sm text-muted-foreground">{labelColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditLabelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditLabel} disabled={!labelName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
