import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalFiltersState {
  selectedFranchiseeId: string | null;
  selectedCentreCode: string | null;
  
  setFranchiseeId: (id: string | null) => void;
  setCentreCode: (code: string | null) => void;
  
  setFilters: (filters: {
    franchiseeId?: string | null;
    centreCode?: string | null;
  }) => void;
  
  reset: () => void;
}

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      selectedFranchiseeId: null,
      selectedCentreCode: null,
      
      setFranchiseeId: (id) => {
        set({ selectedFranchiseeId: id });
      },
      
      setCentreCode: (code) => {
        set({ selectedCentreCode: code });
      },
      
      setFilters: (filters) => {
        set((state) => ({
          selectedFranchiseeId: filters.franchiseeId !== undefined ? filters.franchiseeId : state.selectedFranchiseeId,
          selectedCentreCode: filters.centreCode !== undefined ? filters.centreCode : state.selectedCentreCode,
        }));
      },
      
      reset: () => {
        set({
          selectedFranchiseeId: null,
          selectedCentreCode: null,
        });
      },
    }),
    {
      name: 'global-filters-v2',
    }
  )
);
