import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalFiscalYearState {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

export const useGlobalFiscalYear = create<GlobalFiscalYearState>()(
  persist(
    (set) => ({
      selectedYear: new Date().getFullYear().toString(),
      setSelectedYear: (year: string) => set({ selectedYear: year }),
    }),
    {
      name: 'fiscal-year-selection',
    }
  )
);
