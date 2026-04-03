export interface QueryRequest {
  naturalLanguage: string;
  context?: QueryContext;
  options?: QueryOptions;
}

export interface QueryContext {
  previousQueries: QueryHistory[];
  selectedTables?: string[];
  filters?: Record<string, any>;
  lastResult?: any;
}

export interface QueryOptions {
  dryRun?: boolean;
  explain?: boolean;
  limit?: number;
  timeout?: number;
  safeMode?: boolean;
}

export interface QueryPlan {
  intent: QueryIntent;
  requiredTables: string[];
  steps: QueryStep[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  warnings?: string[];
}

export type QueryIntent =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'create'
  | 'drop'
  | 'alter'
  | 'aggregate'
  | 'join'
  | 'unknown';

export interface QueryStep {
  description: string;
  sql?: string;
  tables: string[];
  type: 'fetch' | 'filter' | 'join' | 'aggregate' | 'sort';
}

export interface GeneratedQuery {
  sql: string;
  params?: any[];
  explanation: string;
  intent: QueryIntent;
  isDangerous: boolean;
  warnings: string[];
  confidence: number;
}

export interface QueryValidation {
  isValid: boolean;
  isDangerous: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggestions?: string[];
}

export interface ValidationError {
  type: 'syntax' | 'security' | 'performance' | 'logic';
  message: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  column?: number;
}

export interface QueryExecution {
  query: GeneratedQuery;
  result?: QueryResult;
  error?: Error;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface QueryHistory {
  id: string;
  timestamp: Date;
  naturalLanguage: string;
  generatedSQL: string;
  intent: QueryIntent;
  success: boolean;
  rowCount?: number;
  executionTime?: number;
  error?: string;
}

export interface QueryResult {
  rows: any[];
  fields: string[];
  rowCount: number;
  executionTime: number;
  affectedRows?: number;
}

export interface QueryExplanation {
  summary: string;
  steps: string[];
  tablesUsed: string[];
  performance: {
    estimatedRows: number;
    indexesUsed: string[];
    warnings: string[];
  };
}
