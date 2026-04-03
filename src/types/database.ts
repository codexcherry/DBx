export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'mssql';

export interface ConnectionConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string; // For SQLite
  connectionString?: string;
}

export interface TableInfo {
  name: string;
  schema?: string;
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface SchemaInfo {
  tables: Record<string, TableSchema>;
  relationships: Relationship[];
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  indexes: Index[];
}

export interface ForeignKey {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface QueryResult {
  rows: any[];
  fields: string[];
  rowCount: number;
  executionTime: number;
  affectedRows?: number;
}

export interface DatabaseConnection {
  config: ConnectionConfig;
  isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<QueryResult>;
  getTables(): Promise<TableInfo[]>;
  getTableSchema(tableName: string): Promise<TableSchema>;
  testConnection(): Promise<boolean>;
}
