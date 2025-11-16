// ============================================================================
// MINDEE API TYPES - Invoice API v4
// Documentation: https://developers.mindee.com/docs/invoice-ocr
// ============================================================================

export interface MindeeField<T = string> {
  value: T | null;
  confidence: number;
  polygon?: number[][];
}

export interface MindeeCompanyRegistration {
  value: string;
  type: string;
  confidence: number;
}

export interface MindeeLineItem {
  description: string | null;
  product_code: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  confidence: number;
}

export interface MindeeTax {
  value: number | null;
  rate: number | null;
  code: string | null;
  base: number | null;
  confidence: number;
}

export interface MindeePrediction {
  invoice_number: MindeeField<string>;
  invoice_date: MindeeField<string>;
  due_date: MindeeField<string>;
  supplier_name: MindeeField<string>;
  supplier_address: MindeeField<string>;
  supplier_company_registrations: MindeeCompanyRegistration[];
  customer_name: MindeeField<string>;
  customer_address: MindeeField<string>;
  customer_company_registrations: MindeeCompanyRegistration[];
  total_net: MindeeField<number>;
  total_amount: MindeeField<number>;
  total_tax: MindeeField<number>;
  taxes: MindeeTax[];
  line_items: MindeeLineItem[];
  locale: MindeeField<string>;
  currency: MindeeField<string>;
  payment_details: Array<{
    account_number: string | null;
    iban: string | null;
    swift: string | null;
  }>;
  confidence: number;
}

export interface MindeeDocument {
  id: string;
  name: string;
  n_pages: number;
  is_rotation_applied: boolean;
  inference: {
    started_at: string;
    finished_at: string;
    prediction: MindeePrediction;
    processing_time: number;
    product: {
      name: string;
      version: string;
    };
  };
}

export interface MindeeAPIResponse {
  api_request: {
    status: string;
    status_code: number;
    url: string;
  };
  document: MindeeDocument;
}

export class MindeeError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MindeeError';
  }
}
