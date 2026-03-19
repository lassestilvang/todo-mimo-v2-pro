'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { TaskList } from '@/components/task-list';
import { TaskDetailPanel } from '@/components/task-detail';
import { SearchResults } from '@/components/search-results';

export function AppShell() {
  const { sidebarOpen, setSidebarOpen, selectedTaskId, searchQuery } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [setSidebarOpen]);

  const showSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(!isMobile || sidebarOpen) && (
          <motion.div
            initial={isMobile ? { x: -280 } : false}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`${
              isMobile
                ? 'fixed inset-y-0 left-0 z-40'
                : 'relative'
            }`}
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen && !isMobile ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </Button>
          <div className="flex-1" />
        </header>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Task list / Search results */}
          <main className="flex-1 overflow-hidden">
            {showSearch ? <SearchResults /> : <TaskList />}
          </main>

          {/* Task detail panel (desktop) */}
          {!isMobile && <TaskDetailPanel />}
        </div>
      </div>

      {/* Task detail panel (mobile - as sheet) */}
      {isMobile && <TaskDetailPanel />}
    </div>
  );
}
