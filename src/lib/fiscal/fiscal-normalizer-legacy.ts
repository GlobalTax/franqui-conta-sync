// ============================================================================
// LEGACY - Backward compatibility wrapper
// @deprecated Use normalizeFull from composers/normalize-full.ts instead
// ============================================================================

import { normalizeFull } from './composers/normalize-full';
import { logger } from '@/lib/logger';
import type { NormalizationChange, NormalizeFullResult } from './types';

export type { NormalizationChange };

export interface NormalizationResult {
  normalized: any;
  changes: NormalizationChange[];
  warnings: string[];
}

/**
 * @deprecated Use normalizeFull instead
 */
export function stripAndNormalize(invoice: any): NormalizationResult {
  logger.warn('fiscal-normalizer-legacy', 'stripAndNormalize is deprecated. Use normalizeFull from @/lib/fiscal instead.');
  return normalizeFull(invoice);
}
