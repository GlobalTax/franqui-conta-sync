import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalFiltersState {
  selectedFranchiseeId: string | null;
  selectedCompanyId: string | null;
  selectedCentreCode: string | null;
  
  setFranchiseeId: (id: string | null) => void;
  setCompanyId: (id: string | null) => void;
  setCentreCode: (code: string | null) => void;
  
  // Helper to set all at once
  setFilters: (filters: {
    franchiseeId?: string | null;
    companyId?: string | null;
    centreCode?: string | null;
  }) => void;
  
  // Reset filters
  reset: () => void;
}

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      selectedFranchiseeId: null,
      selectedCompanyId: null,
      selectedCentreCode: null,
      
      setFranchiseeId: (id) => {
        set({ 
          selectedFranchiseeId: id,
          // Reset dependent filters
          selectedCompanyId: null,
          selectedCentreCode: null,
        });
      },
      
      setCompanyId: (id) => {
        set({ 
          selectedCompanyId: id,
          // Reset dependent filter
          selectedCentreCode: null,
        });
      },
      
      setCentreCode: (code) => {
        set({ selectedCentreCode: code });
      },
      
      setFilters: (filters) => {
        set({
          selectedFranchiseeId: filters.franchiseeId !== undefined ? filters.franchiseeId : undefined,
          selectedCompanyId: filters.companyId !== undefined ? filters.companyId : undefined,
          selectedCentreCode: filters.centreCode !== undefined ? filters.centreCode : undefined,
        });
      },
      
      reset: () => {
        set({
          selectedFranchiseeId: null,
          selectedCompanyId: null,
          selectedCentreCode: null,
        });
      },
    }),
    {
      name: 'global-filters-storage',
    }
  )
);
