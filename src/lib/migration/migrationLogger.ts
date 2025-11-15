/**
 * Migration Logger
 * 
 * Purpose: Helper centralizado para registrar eventos de migración en migration_audit_logs
 * 
 * Features:
 * - Registro automático de timestamp y user
 * - Tracking de tiempo de ejecución
 * - Estructuración de detalles en JSONB
 * - Niveles de severidad (info, warning, error, critical)
 * - Integración con Supabase
 * 
 * Usage:
 * ```ts
 * const logger = new MigrationLogger('apertura', migrationRunId, centroCode);
 * logger.start('Iniciando importación de saldos');
 * logger.progress('Procesando cuenta 6000000', { processed: 10, total: 50 });
 * logger.success('Asiento de apertura creado', { entryId: '...' });
 * logger.error('Error al validar cuenta', { error: err.message });
 * ```
 */

import { supabase } from "@/integrations/supabase/client";
import { logger as consoleLogger } from "@/lib/logger";

export type MigrationStep = 'config' | 'apertura' | 'diario' | 'iva_emitidas' | 'iva_recibidas' | 'bancos' | 'cierre' | 'rollback';
export type LogAction = 'start' | 'progress' | 'success' | 'error' | 'warning' | 'validation' | 'rollback';
export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

interface LogEntry {
  stepName: MigrationStep;
  action: LogAction;
  severity: LogSeverity;
  message: string;
  details?: Record<string, any>;
  recordsProcessed?: number;
  recordsTotal?: number;
  executionTimeMs?: number;
}

export class MigrationLogger {
  private stepName: MigrationStep;
  private migrationRunId: string;
  private fiscalYearId?: string;
  private centroCode: string;
  private startTime: number = 0;

  constructor(
    stepName: MigrationStep,
    migrationRunId: string,
    centroCode: string,
    fiscalYearId?: string
  ) {
    this.stepName = stepName;
    this.migrationRunId = migrationRunId;
    this.centroCode = centroCode;
    this.fiscalYearId = fiscalYearId;
  }

  /**
   * Registra el inicio de una operación y comienza el timer
   */
  async start(message: string, details?: Record<string, any>): Promise<void> {
    this.startTime = Date.now();
    await this.log({
      stepName: this.stepName,
      action: 'start',
      severity: 'info',
      message,
      details,
    });
  }

  /**
   * Registra progreso durante una operación
   */
  async progress(
    message: string,
    processed: number,
    total: number,
    details?: Record<string, any>
  ): Promise<void> {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    await this.log({
      stepName: this.stepName,
      action: 'progress',
      severity: 'info',
      message,
      details,
      recordsProcessed: processed,
      recordsTotal: total,
      executionTimeMs: elapsed,
    });
  }

  /**
   * Registra éxito de una operación
   */
  async success(message: string, details?: Record<string, any>): Promise<void> {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    await this.log({
      stepName: this.stepName,
      action: 'success',
      severity: 'info',
      message,
      details,
      executionTimeMs: elapsed,
    });
    this.startTime = 0; // Reset timer
  }

  /**
   * Registra un error crítico
   */
  async error(message: string, error?: Error | string, details?: Record<string, any>): Promise<void> {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const errorDetails = {
      ...details,
      error: typeof error === 'string' ? error : error?.message,
      stack: error instanceof Error ? error.stack : undefined,
    };

    await this.log({
      stepName: this.stepName,
      action: 'error',
      severity: 'error',
      message,
      details: errorDetails,
      executionTimeMs: elapsed,
    });
    this.startTime = 0; // Reset timer
  }

  /**
   * Registra una advertencia (operación continua pero con incidencias)
   */
  async warning(message: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      stepName: this.stepName,
      action: 'warning',
      severity: 'warning',
      message,
      details,
    });
  }

  /**
   * Registra validaciones
   */
  async validation(
    message: string,
    isValid: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      stepName: this.stepName,
      action: 'validation',
      severity: isValid ? 'info' : 'warning',
      message,
      details: { ...details, isValid },
    });
  }

  /**
   * Registra operación de rollback
   */
  async rollback(message: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      stepName: this.stepName,
      action: 'rollback',
      severity: 'critical',
      message,
      details,
    });
  }

  /**
   * Método interno para insertar log en Supabase
   */
  private async log(entry: LogEntry): Promise<void> {
    try {
      // Obtener user actual
      const { data: { user } } = await supabase.auth.getUser();

      // @ts-ignore - migration_audit_logs table not yet in types
      const { error } = await (supabase as any)
        .from('migration_audit_logs')
        .insert({
          migration_run_id: this.migrationRunId,
          fiscal_year_id: this.fiscalYearId,
          centro_code: this.centroCode,
          step_name: entry.stepName,
          action: entry.action,
          severity: entry.severity,
          message: entry.message,
          details: entry.details || {},
          records_processed: entry.recordsProcessed || 0,
          records_total: entry.recordsTotal || 0,
          execution_time_ms: entry.executionTimeMs || 0,
          user_id: user?.id,
          user_email: user?.email,
        });

      if (error) {
        consoleLogger.error('MigrationLogger', 'Failed to insert log', error);
      }

      // También registrar en consola para debugging
      const logLevel = entry.severity === 'error' || entry.severity === 'critical' ? 'error' : 
                       entry.severity === 'warning' ? 'warn' : 'info';
      consoleLogger[logLevel](
        `Migration[${this.stepName}]`,
        entry.message,
        entry.details
      );
    } catch (err) {
      consoleLogger.error('MigrationLogger', 'Exception logging migration event', err);
    }
  }
}

/**
 * Helper para crear logger rápidamente
 */
export function createMigrationLogger(
  stepName: MigrationStep,
  migrationRunId: string,
  centroCode: string,
  fiscalYearId?: string
): MigrationLogger {
  return new MigrationLogger(stepName, migrationRunId, centroCode, fiscalYearId);
}
