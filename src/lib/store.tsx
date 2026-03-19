'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ViewType } from '@/lib/types';

interface AppState {
  selectedListId: string | null;
  selectedView: ViewType | null;
  selectedLabelId: string | null;
  selectedTaskId: string | null;
  showCompleted: boolean;
  searchQuery: string;
  sidebarOpen: boolean;
}

interface AppContextValue extends AppState {
  setSelectedListId: (id: string | null) => void;
  setSelectedView: (view: ViewType | null) => void;
  setSelectedLabelId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setShowCompleted: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<ViewType | null>('today');
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <AppContext.Provider
      value={{
        selectedListId,
        selectedView,
        selectedLabelId,
        selectedTaskId,
        showCompleted,
        searchQuery,
        sidebarOpen,
        setSelectedListId,
        setSelectedView,
        setSelectedLabelId,
        setSelectedTaskId,
        setShowCompleted,
        setSearchQuery,
        setSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
