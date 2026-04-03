import { DatabaseConnection, SchemaInfo, TableSchema } from '../types/database.js';
import { SchemaError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class SchemaEngine {
  private connection: DatabaseConnection;
  private schemaCache: SchemaInfo | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 300000; // 5 minutes

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  async getFullSchema(forceRefresh: boolean = false): Promise<SchemaInfo> {
    if (!forceRefresh && this.isCacheValid()) {
      logger.debug('Using cached schema');
      return this.schemaCache!;
    }

    try {
      logger.debug('Extracting database schema...');
      
      const tables = await this.connection.getTables();
      
      if (tables.length === 0) {
        logger.debug('Database is empty (no tables)');
        this.schemaCache = {
          tables: {},
          relationships: [],
        };
        this.cacheTimestamp = Date.now();
        return this.schemaCache;
      }
      
      const tableSchemas: Record<string, TableSchema> = {};

      for (const table of tables) {
        try {
          const schema = await this.connection.getTableSchema(table.name);
          tableSchemas[table.name] = schema;
        } catch (error) {
          logger.debug(`Failed to load schema for table ${table.name}:`, error);
          // Skip this table and continue
        }
      }

      const relationships = this.extractRelationships(tableSchemas);

      this.schemaCache = {
        tables: tableSchemas,
        relationships,
      };
      this.cacheTimestamp = Date.now();

      logger.debug(`Schema extracted: ${Object.keys(tableSchemas).length} tables loaded`);
      return this.schemaCache;
    } catch (error) {
      logger.debug('Schema extraction error:', error);
      throw new SchemaError(
        `Failed to extract schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error }
      );
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    try {
      return await this.connection.getTableSchema(tableName);
    } catch (error) {
      throw new SchemaError(
        `Failed to get schema for table ${tableName}`,
        { tableName, error }
      );
    }
  }

  async getTableNames(): Promise<string[]> {
    const tables = await this.connection.getTables();
    return tables.map(t => t.name);
  }

  getSchemaForTables(tableNames: string[]): SchemaInfo | null {
    if (!this.schemaCache) return null;

    const filteredTables: Record<string, TableSchema> = {};
    tableNames.forEach(name => {
      if (this.schemaCache!.tables[name]) {
        filteredTables[name] = this.schemaCache!.tables[name];
      }
    });

    const filteredRelationships = this.schemaCache.relationships.filter(
      rel => tableNames.includes(rel.fromTable) && tableNames.includes(rel.toTable)
    );

    return {
      tables: filteredTables,
      relationships: filteredRelationships,
    };
  }

  formatSchemaForAI(schema: SchemaInfo): string {
    let output = 'Database Schema:\n\n';

    Object.entries(schema.tables).forEach(([tableName, tableSchema]) => {
      output += `Table: ${tableName}\n`;
      output += 'Columns:\n';
      
      tableSchema.columns.forEach(col => {
        const attrs = [];
        if (col.isPrimaryKey) attrs.push('PRIMARY KEY');
        if (col.isForeignKey) attrs.push(`FOREIGN KEY -> ${col.referencedTable}.${col.referencedColumn}`);
        if (!col.nullable) attrs.push('NOT NULL');
        
        output += `  - ${col.name}: ${col.type}`;
        if (attrs.length > 0) {
          output += ` (${attrs.join(', ')})`;
        }
        output += '\n';
      });
      
      output += '\n';
    });

    if (schema.relationships.length > 0) {
      output += 'Relationships:\n';
      schema.relationships.forEach(rel => {
        output += `  ${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn} (${rel.type})\n`;
      });
    }

    return output;
  }

  clearCache(): void {
    this.schemaCache = null;
    this.cacheTimestamp = 0;
    logger.debug('Schema cache cleared');
  }

  private isCacheValid(): boolean {
    if (!this.schemaCache) return false;
    return Date.now() - this.cacheTimestamp < this.cacheTTL;
  }

  private extractRelationships(tables: Record<string, TableSchema>) {
    const relationships: SchemaInfo['relationships'] = [];

    Object.values(tables).forEach(table => {
      table.foreignKeys.forEach(fk => {
        relationships.push({
          fromTable: table.name,
          fromColumn: fk.columnName,
          toTable: fk.referencedTable,
          toColumn: fk.referencedColumn,
          type: 'one-to-many',
        });
      });
    });

    return relationships;
  }
}
