export type AiProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC';

export interface AiConfiguration {
  provider: AiProvider;
  model: string;
  configured?: boolean;
  maskedApiKey?: string;
}

export interface SaveAiConfigurationRequest {
  provider: AiProvider;
  model: string;
  apiKey: string;
}

export interface AiModelOption {
  id: string;
  name?: string;
  provider?: AiProvider;
}
