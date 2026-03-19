'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export function AppShell() {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`hidden flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200 md:flex ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span className="text-lg font-semibold">Daily Planner</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="default" className="w-full justify-start">
              Today
            </Button>
            <Button variant="ghost" size="default" className="w-full justify-start">
              Next 7 Days
            </Button>
            <Button variant="ghost" size="default" className="w-full justify-start">
              Upcoming
            </Button>
            <Button variant="ghost" size="default" className="w-full justify-start">
              All Tasks
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="hidden md:flex"
          >
            <Menu className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="md:hidden">
            <Menu className="size-4" />
          </Button>
          <div className="flex-1" />
        </header>

        {/* Task area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl p-6">
            <h1 className="mb-4 text-2xl font-bold">Today</h1>
            <p className="text-muted-foreground">
              Your tasks for today will appear here.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
