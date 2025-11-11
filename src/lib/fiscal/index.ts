// ============================================================================
// FISCAL LIBRARY - Public API
// ============================================================================

export * from './core';
export * from './types';
export * from './composers/normalize-lite';
export * from './composers/normalize-full';

// Re-export legacy for backward compatibility
export { stripAndNormalize } from './fiscal-normalizer-legacy';
export type { NormalizationChange, NormalizationResult } from './fiscal-normalizer-legacy';
