import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TestingLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  category: string;
  message: string;
  details?: any;
}

interface TestingState {
  isTestingMode: boolean;
  isSandboxMode: boolean;
  logs: TestingLog[];
  activeOperations: Set<string>;
  
  // Actions
  toggleTestingMode: () => void;
  toggleSandboxMode: () => void;
  addLog: (log: Omit<TestingLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  startOperation: (operationId: string) => void;
  endOperation: (operationId: string) => void;
  isOperationActive: (operationId: string) => boolean;
}

export const useTestingMode = create<TestingState>()(
  persist(
    (set, get) => ({
      isTestingMode: false,
      isSandboxMode: false,
      logs: [],
      activeOperations: new Set(),

      toggleTestingMode: () => {
        set(state => ({ isTestingMode: !state.isTestingMode }));
      },

      toggleSandboxMode: () => {
        set(state => ({ isSandboxMode: !state.isSandboxMode }));
      },

      addLog: (log) => {
        const newLog: TestingLog = {
          ...log,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };
        set(state => ({
          logs: [newLog, ...state.logs].slice(0, 100), // Keep last 100 logs
        }));
      },

      clearLogs: () => {
        set({ logs: [] });
      },

      startOperation: (operationId) => {
        set(state => {
          const newOps = new Set(state.activeOperations);
          newOps.add(operationId);
          return { activeOperations: newOps };
        });
      },

      endOperation: (operationId) => {
        set(state => {
          const newOps = new Set(state.activeOperations);
          newOps.delete(operationId);
          return { activeOperations: newOps };
        });
      },

      isOperationActive: (operationId) => {
        return get().activeOperations.has(operationId);
      },
    }),
    {
      name: 'testing-mode-storage',
      partialize: (state) => ({
        isTestingMode: state.isTestingMode,
        isSandboxMode: state.isSandboxMode,
      }),
    }
  )
);
