import { QueryHistory, QueryContext } from '../types/query.js';
import { MemoryEntry } from '../types/config.js';
import { generateId } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export class MemorySystem {
  private queryHistory: QueryHistory[] = [];
  private contextMemory: MemoryEntry[] = [];
  private maxHistorySize: number;
  private maxMemorySize: number;

  constructor(maxHistorySize: number = 50, maxMemorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
    this.maxMemorySize = maxMemorySize;
  }

  addQuery(query: QueryHistory): void {
    this.queryHistory.push(query);
    
    // Trim history if needed
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory = this.queryHistory.slice(-this.maxHistorySize);
    }

    logger.debug(`Query added to history (${this.queryHistory.length} total)`);
  }

  addMemory(type: MemoryEntry['type'], data: any, metadata?: Record<string, any>): void {
    const entry: MemoryEntry = {
      id: generateId(),
      timestamp: new Date(),
      type,
      data,
      metadata,
    };

    this.contextMemory.push(entry);

    // Trim memory if needed
    if (this.contextMemory.length > this.maxMemorySize) {
      this.contextMemory = this.contextMemory.slice(-this.maxMemorySize);
    }

    logger.debug(`Memory entry added (${this.contextMemory.length} total)`);
  }

  getQueryHistory(limit?: number): QueryHistory[] {
    if (limit) {
      return this.queryHistory.slice(-limit);
    }
    return [...this.queryHistory];
  }

  getLastQuery(): QueryHistory | null {
    return this.queryHistory[this.queryHistory.length - 1] || null;
  }

  getLastSuccessfulQuery(): QueryHistory | null {
    for (let i = this.queryHistory.length - 1; i >= 0; i--) {
      if (this.queryHistory[i].success) {
        return this.queryHistory[i];
      }
    }
    return null;
  }

  getContext(): QueryContext {
    return {
      previousQueries: this.getQueryHistory(5),
      lastResult: this.getLastSuccessfulQuery(),
    };
  }

  searchHistory(keyword: string): QueryHistory[] {
    const keywordLower = keyword.toLowerCase();
    return this.queryHistory.filter(
      q =>
        q.naturalLanguage.toLowerCase().includes(keywordLower) ||
        q.generatedSQL.toLowerCase().includes(keywordLower)
    );
  }

  getMemoryByType(type: MemoryEntry['type']): MemoryEntry[] {
    return this.contextMemory.filter(m => m.type === type);
  }

  getRecentMemory(limit: number = 10): MemoryEntry[] {
    return this.contextMemory.slice(-limit);
  }

  clear(): void {
    this.queryHistory = [];
    this.contextMemory = [];
    logger.info('Memory cleared');
  }

  clearHistory(): void {
    this.queryHistory = [];
    logger.info('Query history cleared');
  }

  getStats(): {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    memoryEntries: number;
  } {
    const successful = this.queryHistory.filter(q => q.success).length;
    const failed = this.queryHistory.length - successful;

    return {
      totalQueries: this.queryHistory.length,
      successfulQueries: successful,
      failedQueries: failed,
      memoryEntries: this.contextMemory.length,
    };
  }

  exportHistory(): string {
    return JSON.stringify(this.queryHistory, null, 2);
  }

  importHistory(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.queryHistory = imported;
        logger.success(`Imported ${imported.length} queries`);
      }
    } catch (error) {
      logger.error('Failed to import history', error);
    }
  }
}
