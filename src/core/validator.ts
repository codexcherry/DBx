import { GeneratedQuery, QueryValidation, ValidationError } from '../types/query.js';
import { isDangerousQuery, isSelectQuery } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

export class QueryValidator {
  private safeMode: boolean;
  private dangerousKeywords = ['delete', 'drop', 'truncate', 'alter'];
  private destructivePatterns = [
    /delete\s+from\s+\w+\s*$/i, // DELETE without WHERE
    /update\s+\w+\s+set\s+.*\s*$/i, // UPDATE without WHERE
    /drop\s+(table|database)/i,
    /truncate\s+table/i,
  ];

  constructor(safeMode: boolean = true) {
    this.safeMode = safeMode;
  }

  validate(query: GeneratedQuery): QueryValidation {
    logger.debug('Validating query...');

    const errors: ValidationError[] = [];
    const warnings: string[] = [...query.warnings];

    // Check for dangerous operations
    if (this.safeMode && query.isDangerous) {
      errors.push({
        type: 'security',
        message: 'Dangerous operation detected in safe mode',
        severity: 'error',
      });
    }

    // Check for destructive patterns
    this.destructivePatterns.forEach(pattern => {
      if (pattern.test(query.sql)) {
        errors.push({
          type: 'security',
          message: `Potentially destructive operation: ${pattern.source}`,
          severity: 'error',
        });
      }
    });

    // Basic syntax validation
    const syntaxErrors = this.validateSyntax(query.sql);
    errors.push(...syntaxErrors);

    // Performance warnings
    const perfWarnings = this.checkPerformance(query.sql);
    warnings.push(...perfWarnings);

    const isValid = errors.filter(e => e.severity === 'error').length === 0;

    logger.debug(`Validation result: ${isValid ? 'PASS' : 'FAIL'}`);

    return {
      isValid,
      isDangerous: query.isDangerous,
      errors,
      warnings,
      suggestions: this.generateSuggestions(query.sql, errors),
    };
  }

  requiresConfirmation(query: GeneratedQuery): boolean {
    return query.isDangerous || !isSelectQuery(query.sql);
  }

  private validateSyntax(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for basic SQL structure
    if (!sql.trim()) {
      errors.push({
        type: 'syntax',
        message: 'Empty SQL query',
        severity: 'error',
      });
      return errors;
    }

    // Check for unclosed quotes
    const singleQuotes = (sql.match(/'/g) || []).length;
    const doubleQuotes = (sql.match(/"/g) || []).length;
    
    if (singleQuotes % 2 !== 0) {
      errors.push({
        type: 'syntax',
        message: 'Unclosed single quote',
        severity: 'error',
      });
    }
    
    if (doubleQuotes % 2 !== 0) {
      errors.push({
        type: 'syntax',
        message: 'Unclosed double quote',
        severity: 'error',
      });
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of sql) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        errors.push({
          type: 'syntax',
          message: 'Unbalanced parentheses',
          severity: 'error',
        });
        break;
      }
    }
    
    if (parenCount > 0) {
      errors.push({
        type: 'syntax',
        message: 'Unclosed parentheses',
        severity: 'error',
      });
    }

    return errors;
  }

  private checkPerformance(sql: string): string[] {
    const warnings: string[] = [];
    const sqlLower = sql.toLowerCase();

    // Check for SELECT *
    if (sqlLower.includes('select *')) {
      warnings.push('Consider selecting specific columns instead of SELECT *');
    }

    // Check for missing LIMIT
    if (sqlLower.startsWith('select') && !sqlLower.includes('limit')) {
      warnings.push('Consider adding a LIMIT clause to prevent large result sets');
    }

    // Check for OR in WHERE clause
    if (sqlLower.includes('where') && sqlLower.includes(' or ')) {
      warnings.push('OR conditions may prevent index usage');
    }

    // Check for LIKE with leading wildcard
    if (sqlLower.match(/like\s+['"]%/)) {
      warnings.push('LIKE with leading wildcard prevents index usage');
    }

    // Check for functions in WHERE clause
    if (sqlLower.match(/where.*\w+\(/)) {
      warnings.push('Functions in WHERE clause may prevent index usage');
    }

    return warnings;
  }

  private generateSuggestions(sql: string, errors: ValidationError[]): string[] {
    const suggestions: string[] = [];

    if (errors.some(e => e.message.includes('DELETE') || e.message.includes('UPDATE'))) {
      suggestions.push('Add a WHERE clause to limit affected rows');
      suggestions.push('Consider using a transaction for safety');
    }

    if (sql.toLowerCase().includes('select *')) {
      suggestions.push('Specify exact columns needed for better performance');
    }

    if (!sql.toLowerCase().includes('limit') && sql.toLowerCase().startsWith('select')) {
      suggestions.push('Add LIMIT clause to control result size');
    }

    return suggestions;
  }

  setSafeMode(enabled: boolean): void {
    this.safeMode = enabled;
    logger.info(`Safe mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}
