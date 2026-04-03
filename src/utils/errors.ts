export class DBxError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DBxError';
  }
}

export class ConnectionError extends DBxError {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class SchemaError extends DBxError {
  constructor(message: string, details?: any) {
    super(message, 'SCHEMA_ERROR', details);
    this.name = 'SchemaError';
  }
}

export class QueryError extends DBxError {
  constructor(message: string, details?: any) {
    super(message, 'QUERY_ERROR', details);
    this.name = 'QueryError';
  }
}

export class ValidationError extends DBxError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AIError extends DBxError {
  constructor(message: string, details?: any) {
    super(message, 'AI_ERROR', details);
    this.name = 'AIError';
  }
}

export class ConfigError extends DBxError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export function handleError(error: unknown): never {
  if (error instanceof DBxError) {
    throw error;
  }
  
  if (error instanceof Error) {
    throw new DBxError(error.message, 'UNKNOWN_ERROR', { originalError: error });
  }
  
  throw new DBxError('An unknown error occurred', 'UNKNOWN_ERROR', { error });
}
