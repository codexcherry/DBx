import { DatabaseConnectionManager } from '../core/connection.js';
import { parseConnectionString } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { ConnectionError } from '../utils/errors.js';

export async function connectCommand(connectionString: string): Promise<DatabaseConnectionManager> {
  try {
    logger.info('Parsing connection string...');
    const config = parseConnectionString(connectionString);
    
    const connection = new DatabaseConnectionManager(config);
    await connection.connect();
    
    return connection;
  } catch (error) {
    if (error instanceof ConnectionError) {
      throw error;
    }
    throw new ConnectionError(
      `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
