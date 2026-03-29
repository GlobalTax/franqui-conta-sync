import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalFiltersState {
  selectedFranchiseeId: string | null;
  selectedCompanyId: string | null;
  selectedCentreCode: string | null;
  
  setFranchiseeId: (id: string | null) => void;
  setCompanyId: (id: string | null) => void;
  setCentreCode: (code: string | null) => void;
  
  setFilters: (filters: {
    franchiseeId?: string | null;
    companyId?: string | null;
    centreCode?: string | null;
  }) => void;
  
  reset: () => void;
}

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      selectedFranchiseeId: null,
      selectedCompanyId: null,
      selectedCentreCode: null,
      
      setFranchiseeId: (id) => {
        // Only change franchiseeId — sync hook handles the rest
        set({ selectedFranchiseeId: id });
      },
      
      setCompanyId: (id) => {
        set({ selectedCompanyId: id });
      },
      
      setCentreCode: (code) => {
        set({ selectedCentreCode: code });
      },
      
      setFilters: (filters) => {
        set((state) => ({
          selectedFranchiseeId: filters.franchiseeId !== undefined ? filters.franchiseeId : state.selectedFranchiseeId,
          selectedCompanyId: filters.companyId !== undefined ? filters.companyId : state.selectedCompanyId,
          selectedCentreCode: filters.centreCode !== undefined ? filters.centreCode : state.selectedCentreCode,
        }));
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
