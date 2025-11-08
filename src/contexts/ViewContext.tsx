import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface ViewSelection {
  type: 'all' | 'company' | 'centre';
  id: string;
  name: string;
}

interface ViewContextType {
  selectedView: ViewSelection | null;
  setSelectedView: (view: ViewSelection | null) => void;
  isConsolidated: boolean;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider = ({ children }: { children: ReactNode }) => {
  const [selectedView, setSelectedView] = useState<ViewSelection | null>(null);
  
  const isConsolidated = selectedView?.type === 'all' || selectedView?.type === 'company';

  // Persistir en localStorage
  useEffect(() => {
    if (selectedView) {
      localStorage.setItem('accounting-view', JSON.stringify(selectedView));
    }
  }, [selectedView]);

  // Cargar desde localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('accounting-view');
    if (saved) {
      try {
        setSelectedView(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved view:', e);
      }
    }
  }, []);

  return (
    <ViewContext.Provider value={{ selectedView, setSelectedView, isConsolidated }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useView must be used within ViewProvider');
  }
  return context;
};
