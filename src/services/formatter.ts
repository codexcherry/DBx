import Table from 'cli-table3';
import chalk from 'chalk';
import { QueryResult } from '../types/database.js';
import { truncateString } from '../utils/helpers.js';

// Purple theme
const purple = chalk.hex('#9D4EDD');
const lightPurple = chalk.hex('#C77DFF');
const darkPurple = chalk.hex('#7209B7');
const accent = chalk.hex('#E0AAFF');
const dim = chalk.hex('#5A189A');

export class ResultFormatter {
  private maxCellWidth = 50;
  private maxRows = 100;

  formatTable(result: QueryResult, options?: { maxRows?: number }): string {
    const limit = options?.maxRows || this.maxRows;
    const rows = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;

    if (rows.length === 0) {
      return chalk.yellow('No results found.');
    }

    const table = new Table({
      head: result.fields.map(f => lightPurple(f)),
      style: {
        head: [],
        border: ['magenta'],
      },
      colWidths: result.fields.map(() => this.maxCellWidth),
      wordWrap: true,
    });

    rows.forEach(row => {
      const values = result.fields.map(field => {
        const value = row[field];
        if (value === null) return dim('NULL');
        if (value === undefined) return dim('undefined');
        
        const str = String(value);
        return accent(truncateString(str, this.maxCellWidth - 3));
      });
      table.push(values);
    });

    let output = table.toString();
    
    if (hasMore) {
      output += `\n${chalk.yellow(`... and ${result.rows.length - limit} more rows`)}`;
    }

    return output;
  }

  formatSummary(result: QueryResult): string {
    const parts = [
      accent(`✓ Query executed successfully`),
      dim(`Rows: ${result.rowCount}`),
      dim(`Time: ${result.executionTime}ms`),
    ];

    if (result.affectedRows !== undefined) {
      parts.push(dim(`Affected: ${result.affectedRows}`));
    }

    return parts.join(' | ');
  }

  formatError(error: Error): string {
    return chalk.red(`✗ ${error.message}`);
  }

  formatWarning(message: string): string {
    return chalk.yellow(`⚠ ${message}`);
  }

  formatInfo(message: string): string {
    return lightPurple(`ℹ ${message}`);
  }

  formatSuccess(message: string): string {
    return accent(`✓ ${message}`);
  }

  formatSQL(sql: string): string {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
      'ON', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
      'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE',
      'AS', 'IN', 'NOT', 'NULL', 'IS', 'LIKE', 'BETWEEN', 'EXISTS',
    ];

    let formatted = sql;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, purple(keyword));
    });

    return formatted;
  }

  formatSchema(tableName: string, columns: any[]): string {
    const table = new Table({
      head: [
        lightPurple('Column'),
        lightPurple('Type'),
        lightPurple('Nullable'),
        lightPurple('Key'),
      ],
      style: {
        head: [],
        border: ['magenta'],
      },
    });

    columns.forEach(col => {
      table.push([
        accent(col.name),
        chalk.yellow(col.type),
        col.nullable ? 'YES' : 'NO',
        col.isPrimaryKey ? chalk.green('PRI') : col.isForeignKey ? chalk.blue('FOR') : '',
      ]);
    });

    return `\n${purple('▸ ')}${lightPurple(tableName)}\n${table.toString()}`;
  }

  formatList(items: string[], title?: string): string {
    let output = '';
    
    if (title) {
      output += lightPurple(title) + '\n';
    }

    items.forEach((item, index) => {
      output += dim(`  ${index + 1}. `) + accent(item) + '\n';
    });

    return output;
  }
}

export const formatter = new ResultFormatter();
