// ============================================================================
// FISCAL TYPES - Interfaces compartidas
// ============================================================================

export interface NormalizationChange {
  field: string;
  before: any;
  after: any;
  rule: string;
}

export interface NormalizeLiteResult {
  normalized: any;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface NormalizeFullResult {
  normalized: any;
  changes: NormalizationChange[];
  warnings: string[];
}

export interface NormalizeBackendResult {
  normalized: any;
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  autofix_applied: string[];
}
