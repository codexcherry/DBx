import knex, { Knex } from 'knex';
import {
  ConnectionConfig,
  DatabaseConnection,
  DatabaseType,
  QueryResult,
  TableInfo,
  TableSchema,
  ColumnInfo,
} from '../types/database.js';
import { ConnectionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class DatabaseConnectionManager implements DatabaseConnection {
  public config: ConnectionConfig;
  public isConnected: boolean = false;
  private client: Knex | null = null;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      logger.info(`Connecting to ${this.config.type} database...`);

      const knexConfig = this.buildKnexConfig();
      this.client = knex(knexConfig);

      // Test connection
      await this.testConnection();
      
      this.isConnected = true;
      logger.success(`Connected to ${this.config.type} database`);
    } catch (error) {
      this.isConnected = false;
      throw new ConnectionError(
        `Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { config: this.config, error }
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isConnected = false;
      logger.info('Disconnected from database');
    }
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.client) {
      throw new ConnectionError('Not connected to database');
    }

    try {
      const startTime = Date.now();
      const result = await this.client.raw(sql, params);
      const executionTime = Date.now() - startTime;

      // Handle different database result formats
      const rows = this.extractRows(result);
      const fields = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        rows,
        fields,
        rowCount: rows.length,
        executionTime,
        affectedRows: result.rowCount || (Array.isArray(result) && result.length > 0 ? result[0].affectedRows : undefined),
      };
    } catch (error) {
      throw new ConnectionError(
        `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sql, params, error }
      );
    }
  }

  async getTables(): Promise<TableInfo[]> {
    if (!this.client) {
      throw new ConnectionError('Not connected to database');
    }

    try {
      let tables: TableInfo[] = [];

      switch (this.config.type) {
        case 'mysql':
          const mysqlResult = await this.client.raw('SHOW TABLES');
          tables = mysqlResult[0].map((row: any) => ({
            name: Object.values(row)[0] as string,
          }));
          break;

        case 'postgresql':
          const pgResult = await this.client.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
          `);
          tables = pgResult.rows.map((row: any) => ({
            name: row.table_name,
            schema: 'public',
          }));
          break;

        case 'sqlite':
          const sqliteResult = await this.client.raw(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
          `);
          tables = sqliteResult.map((row: any) => ({
            name: row.name,
          }));
          break;

        case 'mssql':
          const mssqlResult = await this.client.raw(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
          `);
          tables = mssqlResult.map((row: any) => ({
            name: row.TABLE_NAME,
          }));
          break;
      }

      return tables;
    } catch (error) {
      throw new ConnectionError(
        `Failed to fetch tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    if (!this.client) {
      throw new ConnectionError('Not connected to database');
    }

    try {
      const columns = await this.getColumns(tableName);
      const primaryKeys = columns.filter(c => c.isPrimaryKey).map(c => c.name);
      const foreignKeys = columns
        .filter(c => c.isForeignKey)
        .map(c => ({
          columnName: c.name,
          referencedTable: c.referencedTable!,
          referencedColumn: c.referencedColumn!,
        }));

      return {
        name: tableName,
        columns,
        primaryKeys,
        foreignKeys,
        indexes: [],
      };
    } catch (error) {
      throw new ConnectionError(
        `Failed to fetch schema for table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { tableName, error }
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.raw('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  private buildKnexConfig(): Knex.Config {
    const baseConfig: Knex.Config = {
      client: this.getKnexClient(),
    };

    if (this.config.type === 'sqlite') {
      return {
        ...baseConfig,
        connection: {
          filename: this.config.filename || ':memory:',
        },
        useNullAsDefault: true,
      };
    }

    return {
      ...baseConfig,
      connection: {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      },
    };
  }

  private getKnexClient(): string {
    const clientMap: Record<DatabaseType, string> = {
      mysql: 'mysql2',
      postgresql: 'pg',
      sqlite: 'sqlite3',
      mssql: 'mssql',
    };
    return clientMap[this.config.type];
  }

  private extractRows(result: any): any[] {
    // Handle MySQL/MariaDB results
    if (Array.isArray(result) && result.length > 0) {
      if (Array.isArray(result[0])) {
        return result[0];
      }
      return result;
    }
    
    // Handle PostgreSQL results
    if (result && result.rows) {
      return result.rows;
    }
    
    // Handle SQLite results
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      // For DDL statements (CREATE, DROP, etc.)
      if (result.changes !== undefined || result.lastID !== undefined) {
        return [];
      }
    }
    
    return [];
  }

  private async getColumns(tableName: string): Promise<ColumnInfo[]> {
    if (!this.client) return [];

    switch (this.config.type) {
      case 'mysql':
        return this.getMySQLColumns(tableName);
      case 'postgresql':
        return this.getPostgreSQLColumns(tableName);
      case 'sqlite':
        return this.getSQLiteColumns(tableName);
      case 'mssql':
        return this.getMSSQLColumns(tableName);
      default:
        return [];
    }
  }

  private async getMySQLColumns(tableName: string): Promise<ColumnInfo[]> {
    const result = await this.client!.raw(`DESCRIBE ${tableName}`);
    return result[0].map((row: any) => ({
      name: row.Field,
      type: row.Type,
      nullable: row.Null === 'YES',
      defaultValue: row.Default,
      isPrimaryKey: row.Key === 'PRI',
      isForeignKey: row.Key === 'MUL',
    }));
  }

  private async getPostgreSQLColumns(tableName: string): Promise<ColumnInfo[]> {
    const result = await this.client!.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ?
    `, [tableName]);

    return result.rows.map((row: any) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: false,
      isForeignKey: false,
    }));
  }

  private async getSQLiteColumns(tableName: string): Promise<ColumnInfo[]> {
    const result = await this.client!.raw(`PRAGMA table_info(${tableName})`);
    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      isPrimaryKey: row.pk === 1,
      isForeignKey: false,
    }));
  }

  private async getMSSQLColumns(tableName: string): Promise<ColumnInfo[]> {
    const result = await this.client!.raw(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = ?
    `, [tableName]);

    return result.map((row: any) => ({
      name: row.COLUMN_NAME,
      type: row.DATA_TYPE,
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      isPrimaryKey: false,
      isForeignKey: false,
    }));
  }
}
