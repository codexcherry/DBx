import { SchemaInfo } from '../types/database.js';
import { logger } from '../utils/logger.js';

export class TableSelector {
  private maxTables: number = 10;

  constructor(maxTables?: number) {
    if (maxTables) this.maxTables = maxTables;
  }

  selectRelevantTables(query: string, schema: SchemaInfo): string[] {
    logger.debug('Selecting relevant tables for query...');

    const allTables = Object.keys(schema.tables);
    
    if (allTables.length <= this.maxTables) {
      logger.debug(`All ${allTables.length} tables selected (under limit)`);
      return allTables;
    }

    // Score tables based on relevance
    const scores = this.scoreTablesByRelevance(query, schema);
    
    // Sort by score and take top N
    const sortedTables = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.maxTables)
      .map(([table]) => table);

    // Add related tables through foreign keys
    const expandedTables = this.expandWithRelatedTables(sortedTables, schema);

    logger.debug(`Selected ${expandedTables.length} tables: ${expandedTables.join(', ')}`);
    return expandedTables;
  }

  private scoreTablesByRelevance(query: string, schema: SchemaInfo): Record<string, number> {
    const queryLower = query.toLowerCase();
    const scores: Record<string, number> = {};

    Object.entries(schema.tables).forEach(([tableName, tableSchema]) => {
      let score = 0;

      // Exact table name match
      if (queryLower.includes(tableName.toLowerCase())) {
        score += 100;
      }

      // Partial table name match
      const tableWords = tableName.toLowerCase().split('_');
      tableWords.forEach(word => {
        if (queryLower.includes(word)) {
          score += 50;
        }
      });

      // Column name matches
      tableSchema.columns.forEach(col => {
        if (queryLower.includes(col.name.toLowerCase())) {
          score += 30;
        }
      });

      // Common query patterns
      if (queryLower.includes('user') && tableName.toLowerCase().includes('user')) {
        score += 40;
      }
      if (queryLower.includes('order') && tableName.toLowerCase().includes('order')) {
        score += 40;
      }
      if (queryLower.includes('product') && tableName.toLowerCase().includes('product')) {
        score += 40;
      }

      scores[tableName] = score;
    });

    return scores;
  }

  private expandWithRelatedTables(tables: string[], schema: SchemaInfo): string[] {
    const expanded = new Set(tables);

    tables.forEach(table => {
      // Add tables referenced by foreign keys
      const tableSchema = schema.tables[table];
      if (tableSchema) {
        tableSchema.foreignKeys.forEach(fk => {
          if (expanded.size < this.maxTables) {
            expanded.add(fk.referencedTable);
          }
        });
      }

      // Add tables that reference this table
      schema.relationships
        .filter(rel => rel.toTable === table)
        .forEach(rel => {
          if (expanded.size < this.maxTables) {
            expanded.add(rel.fromTable);
          }
        });
    });

    return Array.from(expanded);
  }

  getTablesByKeywords(keywords: string[], schema: SchemaInfo): string[] {
    const tables = new Set<string>();

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      Object.entries(schema.tables).forEach(([tableName, tableSchema]) => {
        // Check table name
        if (tableName.toLowerCase().includes(keywordLower)) {
          tables.add(tableName);
        }

        // Check column names
        tableSchema.columns.forEach(col => {
          if (col.name.toLowerCase().includes(keywordLower)) {
            tables.add(tableName);
          }
        });
      });
    });

    return Array.from(tables);
  }
}
