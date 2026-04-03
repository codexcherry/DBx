export interface AppConfig {
  ollama: OllamaConfig;
  database: DatabaseConfig;
  app: ApplicationConfig;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  timeout?: number;
}

export interface DatabaseConfig {
  maxSchemaTables: number;
  queryTimeout: number;
  enableCache: boolean;
  cacheDir?: string;
}

export interface ApplicationConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMemory: boolean;
  memorySize: number;
  safeMode: boolean;
  autoFix: boolean;
}

export interface MemoryEntry {
  id: string;
  timestamp: Date;
  type: 'query' | 'result' | 'context' | 'error';
  data: any;
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason?: string;
}
