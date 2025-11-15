import { useState } from "react";

export type MigrationStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface FiscalYearConfig {
  year: number;
  startDate: string;
  endDate: string;
  centroCode: string;
  fiscalYearId?: string;
}

export interface MigrationState {
  step: MigrationStep;
  fiscalYear: FiscalYearConfig;
  migrationRunId?: string; // ID del migration_run para tracking
  apertura: {
    completed: boolean;
    entryId?: string;
    date?: string;
  };
  diario: {
    completed: boolean;
    entriesCount: number;
    totalDebit?: number;
    totalCredit?: number;
  };
  iva: {
    emitidas: {
      completed: boolean;
      count: number;
    };
    recibidas: {
      completed: boolean;
      count: number;
    };
  };
  bancos: {
    completed: boolean;
    movements: number;
    skipped: boolean;
  };
  cierre: {
    completed: boolean;
    closedAt?: string;
  };
}

const initialState: MigrationState = {
  step: 1,
  fiscalYear: {
    year: new Date().getFullYear() - 1,
    startDate: '',
    endDate: '',
    centroCode: '',
  },
  apertura: {
    completed: false,
  },
  diario: {
    completed: false,
    entriesCount: 0,
  },
  iva: {
    emitidas: {
      completed: false,
      count: 0,
    },
    recibidas: {
      completed: false,
      count: 0,
    },
  },
  bancos: {
    completed: false,
    movements: 0,
    skipped: false,
  },
  cierre: {
    completed: false,
  },
};

export function useHistoricalMigration() {
  const [state, setState] = useState<MigrationState>(initialState);

  const setFiscalYear = (config: FiscalYearConfig) => {
    setState(s => ({ ...s, fiscalYear: config }));
  };

  const setMigrationRunId = (id: string) => {
    setState(s => ({ ...s, migrationRunId: id }));
  };

  const nextStep = () => {
    setState(s => ({ ...s, step: (Math.min(s.step + 1, 6) as MigrationStep) }));
  };

  const prevStep = () => {
    setState(s => ({ ...s, step: (Math.max(s.step - 1, 1) as MigrationStep) }));
  };

  const goToStep = (step: MigrationStep) => {
    setState(s => ({ ...s, step }));
  };

  const markAperturaComplete = (entryId: string, date: string) => {
    setState(s => ({
      ...s,
      apertura: { completed: true, entryId, date },
    }));
  };

  const markDiarioComplete = (entriesCount: number, totalDebit: number, totalCredit: number) => {
    setState(s => ({
      ...s,
      diario: { completed: true, entriesCount, totalDebit, totalCredit },
    }));
  };

  const markIVAEmitidasComplete = (count: number) => {
    setState(s => ({
      ...s,
      iva: {
        ...s.iva,
        emitidas: { completed: true, count },
      },
    }));
  };

  const markIVARecibidasComplete = (count: number) => {
    setState(s => ({
      ...s,
      iva: {
        ...s.iva,
        recibidas: { completed: true, count },
      },
    }));
  };

  const markBancosComplete = (movements: number) => {
    setState(s => ({
      ...s,
      bancos: { completed: true, movements, skipped: false },
    }));
  };

  const skipBancos = () => {
    setState(s => ({
      ...s,
      bancos: { completed: true, movements: 0, skipped: true },
    }));
  };

  const markCierreComplete = (closedAt: string) => {
    setState(s => ({
      ...s,
      cierre: { completed: true, closedAt },
    }));
  };

  const reset = () => {
    setState(initialState);
  };

  const canProceed = (currentStep: MigrationStep): boolean => {
    switch (currentStep) {
      case 1:
        return !!(state.fiscalYear.centroCode && state.fiscalYear.startDate && state.fiscalYear.endDate);
      case 2:
        return state.apertura.completed;
      case 3:
        return state.diario.completed;
      case 4:
        return state.iva.emitidas.completed && state.iva.recibidas.completed;
      case 5:
        return state.bancos.completed || state.bancos.skipped;
      case 6:
        return false; // Last step
      default:
        return false;
    }
  };

  return {
    state,
    setFiscalYear,
    setMigrationRunId,
    nextStep,
    prevStep,
    goToStep,
    markAperturaComplete,
    markDiarioComplete,
    markIVAEmitidasComplete,
    markIVARecibidasComplete,
    markBancosComplete,
    skipBancos,
    markCierreComplete,
    reset,
    canProceed,
  };
}
