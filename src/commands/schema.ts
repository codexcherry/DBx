import { SchemaEngine } from '../core/schema.js';
import { formatter } from '../services/formatter.js';
import { logger } from '../utils/logger.js';

export async function schemaCommand(
  schemaEngine: SchemaEngine,
  tableName?: string
): Promise<void> {
  try {
    if (tableName) {
      // Show specific table schema
      logger.info(`Fetching schema for table: ${tableName}`);
      const tableSchema = await schemaEngine.getTableSchema(tableName);
      console.log(formatter.formatSchema(tableName, tableSchema.columns));
    } else {
      // Show all tables schema
      logger.info('Fetching full database schema...');
      const schema = await schemaEngine.getFullSchema();
      
      Object.entries(schema.tables).forEach(([name, tableSchema]) => {
        console.log(formatter.formatSchema(name, tableSchema.columns));
      });

      console.log(`\n${formatter.formatSuccess(`Total tables: ${Object.keys(schema.tables).length}`)}`);
    }
  } catch (error) {
    logger.error('Failed to fetch schema', error);
    throw error;
  }
}
