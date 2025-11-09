type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

/**
 * Centralized logger for the application.
 * 
 * Features:
 * - Suppresses debug logs in production
 * - Suppresses all logs in test environment
 * - Adds timestamp and context to every log
 * - Maintains console.warn and console.error for important messages
 * 
 * Usage:
 * import { logger } from '@/lib/logger';
 * 
 * logger.debug('ComponentName', 'Debug message', { data });
 * logger.info('HookName', 'Info message', value);
 * logger.warn('ServiceName', 'Warning message');
 * logger.error('UtilName', 'Error message', error);
 */

function log(level: LogLevel, context: string, ...args: any[]) {
  // Suppress all logs in test mode
  if (isTest) return;
  
  // Suppress debug logs in production
  if (!isDev && level === 'debug') return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${context}]`;
  
  // eslint-disable-next-line no-console
  console[level](prefix, ...args);
}

export const logger = {
  debug: (context: string, ...args: any[]) => log('debug', context, ...args),
  info: (context: string, ...args: any[]) => log('info', context, ...args),
  warn: (context: string, ...args: any[]) => log('warn', context, ...args),
  error: (context: string, ...args: any[]) => log('error', context, ...args),
};
