export interface SOAPNote {
  soap_note_id: number;
  html_content: string;
  billing_codes?: {
    icd10?: Array<string | { code: string; description?: string }>;
    cpt?: Array<string | { code: string; description?: string }>;
  };
  created_at?: string;
}

