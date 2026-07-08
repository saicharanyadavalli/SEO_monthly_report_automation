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
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5', provider: 'Anthropic' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude Sonnet 3.7', provider: 'Anthropic' },
  { id: 'glm-5', name: 'GLM-5', provider: 'Zhipu' },
];
