// ============================================================================
// FISCAL BACKEND - Barrel export
// ============================================================================

export * from './normalize-backend.ts';

// Re-export legacy normalize-es for backward compatibility
export { fiscalNormalizerES, validateSpanishVAT } from './normalize-es.ts';
