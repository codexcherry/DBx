import { SchemaEngine } from '../core/schema.js';
import { formatter } from '../services/formatter.js';
import { logger } from '../utils/logger.js';

export async function tablesCommand(schemaEngine: SchemaEngine): Promise<void> {
  try {
    logger.info('Fetching tables...');
    
    const tableNames = await schemaEngine.getTableNames();
    
    if (tableNames.length === 0) {
      console.log(formatter.formatWarning('No tables found in database'));
      return;
    }

    console.log(formatter.formatList(tableNames, `\nTables (${tableNames.length}):`));
  } catch (error) {
    logger.error('Failed to fetch tables', error);
    throw error;
  }
}
