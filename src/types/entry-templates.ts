export interface EntryTemplate {
  id: string;
  name: string;
  description: string | null;
  centro_code: string | null;
  category: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntryTemplateLine {
  id: string;
  template_id: string;
  line_number: number;
  account_code: string;
  movement_type: 'debit' | 'credit';
  amount_formula: string | null;
  description: string | null;
  created_at: string;
}

export interface EntryTemplateWithLines extends EntryTemplate {
  entry_template_lines: EntryTemplateLine[];
}

export interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  lines: {
    account_code: string;
    movement_type: 'debit' | 'credit';
    amount_formula: string;
    description: string;
  }[];
}
