export interface ReportMetadata {
  id: string; // usually filename
  client_key: string;
  month: string;
  slide_list: string[];
  model_used: string;
  generated_at: string; // ISO string
  file_size_mb: number;
  file_path: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
}

export const SUPPORTED_LLM_MODELS: LLMModel[] = [
  { id: 'glm-5', name: 'GLM-5', provider: 'Zhipu' },
  { id: 'glm-4-7', name: 'GLM-4-7', provider: 'Zhipu' },
  { id: 'glm-4-7-flash', name: 'GLM-4-7 Flash', provider: 'Zhipu' },
];
