import { DatabaseConnection, QueryResult } from '../types/database.js';
import { GeneratedQuery, QueryExecution } from '../types/query.js';
import { QueryError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class QueryExecutor {
  private connection: DatabaseConnection;
  private timeout: number;

  constructor(connection: DatabaseConnection, timeout: number = 30000) {
    this.connection = connection;
    this.timeout = timeout;
  }

  async execute(query: GeneratedQuery): Promise<QueryExecution> {
    const startTime = Date.now();

    try {
      logger.info('Executing query...');
      logger.debug(`SQL: ${query.sql}`);

      const result = await this.executeWithTimeout(query.sql, query.params);
      const endTime = Date.now();

      logger.success(`Query executed in ${endTime - startTime}ms`);

      return {
        query,
        result,
        startTime,
        endTime,
        duration: endTime - startTime,
      };
    } catch (error) {
      const endTime = Date.now();
      
      logger.error('Query execution failed', error);

      return {
        query,
        error: error instanceof Error ? error : new Error(String(error)),
        startTime,
        endTime,
        duration: endTime - startTime,
      };
    }
  }

  async dryRun(query: GeneratedQuery): Promise<{ isValid: boolean; error?: string }> {
    try {
      logger.info('Performing dry run...');
      
      // For SELECT queries, add LIMIT 0 to validate without fetching data
      let testSQL = query.sql;
      if (query.intent === 'select' && !testSQL.toLowerCase().includes('limit')) {
        testSQL = `${testSQL} LIMIT 0`;
      }

      await this.connection.query(testSQL, query.params);
      
      logger.success('Dry run successful');
      return { isValid: true };
    } catch (error) {
      logger.warn('Dry run failed', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async explain(query: GeneratedQuery): Promise<any> {
    try {
      logger.info('Getting query execution plan...');
      
      const explainSQL = `EXPLAIN ${query.sql}`;
      const result = await this.connection.query(explainSQL, query.params);
      
      return result.rows;
    } catch (error) {
      throw new QueryError(
        `Failed to explain query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query: query.sql, error }
      );
    }
  }

  private async executeWithTimeout(sql: string, params?: any[]): Promise<QueryResult> {
    return Promise.race([
      this.connection.query(sql, params),
      this.createTimeout(),
    ]);
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new QueryError(`Query timeout after ${this.timeout}ms`));
      }, this.timeout);
    });
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}
