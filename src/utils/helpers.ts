import { DatabaseType } from '../types/database.js';

export function parseConnectionString(connectionString: string): {
  type: DatabaseType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string;
} {
  try {
    // Handle special characters in password by URL encoding
    let urlString = connectionString;
    
    // For mysql/postgresql, extract and encode password if it contains special chars
    const match = connectionString.match(/^(mysql|postgresql|mssql):\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      const [, protocol, user, password, rest] = match;
      // Encode the password
      const encodedPassword = encodeURIComponent(password);
      urlString = `${protocol}://${user}:${encodedPassword}@${rest}`;
    }
    
    const url = new URL(urlString);
    const type = url.protocol.replace(':', '') as DatabaseType;

    if (type === 'sqlite') {
      // Handle SQLite paths - ensure proper file path
      let filename = url.pathname;
      
      // Remove leading slashes for relative paths
      if (filename.startsWith('//')) {
        filename = filename.substring(2);
      } else if (filename.startsWith('/')) {
        filename = filename.substring(1);
      }
      
      // If no path provided, use default
      if (!filename) {
        filename = './database.db';
      }
      
      return {
        type,
        filename,
      };
    }

    return {
      type,
      host: url.hostname,
      port: url.port ? parseInt(url.port) : getDefaultPort(type),
      user: url.username || undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database: url.pathname.replace('/', '') || undefined,
    };
  } catch (error) {
    throw new Error(`Invalid connection string: ${connectionString}`);
  }
}

export function getDefaultPort(type: DatabaseType): number {
  const ports: Record<DatabaseType, number> = {
    mysql: 3306,
    postgresql: 5432,
    sqlite: 0,
    mssql: 1433,
  };
  return ports[type];
}

export function sanitizeTableName(tableName: string): string {
  return tableName.replace(/[^a-zA-Z0-9_]/g, '');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function isSelectQuery(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  return trimmed.startsWith('select') || trimmed.startsWith('show') || trimmed.startsWith('describe');
}

export function isDangerousQuery(sql: string): boolean {
  const dangerous = ['delete', 'drop', 'truncate', 'alter'];
  const trimmed = sql.trim().toLowerCase();
  return dangerous.some(keyword => trimmed.startsWith(keyword));
}

export function extractTableNames(sql: string): string[] {
  const tables: string[] = [];
  const fromRegex = /from\s+([a-zA-Z0-9_]+)/gi;
  const joinRegex = /join\s+([a-zA-Z0-9_]+)/gi;
  
  let match;
  while ((match = fromRegex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  while ((match = joinRegex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  
  return [...new Set(tables)];
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
