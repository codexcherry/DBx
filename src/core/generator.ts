import { OllamaService } from '../services/ollama.js';
import { SchemaInfo } from '../types/database.js';
import { GeneratedQuery, QueryPlan, QueryIntent } from '../types/query.js';
import { logger } from '../utils/logger.js';
import { isDangerousQuery } from '../utils/helpers.js';

export class SQLGenerator {
  private ollama: OllamaService;

  constructor(ollama: OllamaService) {
    this.ollama = ollama;
  }

  async generateSQL(
    naturalLanguage: string,
    schema: SchemaInfo,
    plan: QueryPlan,
    dbType: string
  ): Promise<GeneratedQuery> {
    logger.debug('Generating SQL...');

    const systemPrompt = this.buildGenerationPrompt(schema, dbType);
    const userPrompt = this.buildUserPrompt(naturalLanguage, plan);

    const response = await this.ollama.generate(userPrompt, systemPrompt);
    const query = this.parseQueryResponse(response.content, plan.intent);

    logger.debug(`SQL generated: ${query.sql.substring(0, 100)}...`);
    return query;
  }

  private buildGenerationPrompt(schema: SchemaInfo, dbType: string): string {
    const schemaText = this.formatSchemaForPrompt(schema);
    
    return `You are an expert SQL generator for ${dbType} databases.

${schemaText}

Rules:
1. Generate ONLY valid ${dbType} SQL
2. Use proper table and column names from the schema
3. Add appropriate JOINs when needed
4. Include WHERE clauses for filtering
5. Use LIMIT for large result sets
6. Return response in this JSON format:

{
  "sql": "SELECT * FROM users WHERE id = 1",
  "explanation": "This query fetches a user by ID",
  "confidence": 0.95
}

IMPORTANT:
- Return ONLY the JSON, no additional text
- Ensure SQL is safe and follows best practices
- Use parameterized queries when possible`;
  }

  private buildUserPrompt(naturalLanguage: string, plan: QueryPlan): string {
    let prompt = `Generate SQL for: "${naturalLanguage}"\n\n`;
    
    prompt += `Query intent: ${plan.intent}\n`;
    prompt += `Required tables: ${plan.requiredTables.join(', ')}\n\n`;
    
    if (plan.steps.length > 0) {
      prompt += 'Steps:\n';
      plan.steps.forEach((step, i) => {
        prompt += `${i + 1}. ${step.description}\n`;
      });
    }

    return prompt;
  }

  private formatSchemaForPrompt(schema: SchemaInfo): string {
    let text = 'Database Schema:\n\n';

    Object.entries(schema.tables).forEach(([tableName, tableSchema]) => {
      text += `Table: ${tableName}\n`;
      text += 'Columns: ';
      
      const columns = tableSchema.columns.map(col => {
        let colStr = `${col.name} (${col.type})`;
        if (col.isPrimaryKey) colStr += ' PK';
        if (col.isForeignKey) colStr += ` FK->${col.referencedTable}`;
        return colStr;
      });
      
      text += columns.join(', ');
      text += '\n\n';
    });

    return text;
  }

  private parseQueryResponse(response: string, intent: QueryIntent): GeneratedQuery {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const sql = parsed.sql.trim();

      return {
        sql,
        explanation: parsed.explanation || 'No explanation provided',
        intent,
        isDangerous: isDangerousQuery(sql),
        warnings: this.detectWarnings(sql),
        confidence: parsed.confidence || 0.8,
      };
    } catch (error) {
      logger.warn('Failed to parse SQL response, attempting extraction');
      return this.extractSQLFromText(response, intent);
    }
  }

  private extractSQLFromText(text: string, intent: QueryIntent): GeneratedQuery {
    // Try to find SQL in code blocks
    const codeBlockMatch = text.match(/```sql?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      const sql = codeBlockMatch[1].trim();
      return {
        sql,
        explanation: 'Extracted from code block',
        intent,
        isDangerous: isDangerousQuery(sql),
        warnings: this.detectWarnings(sql),
        confidence: 0.7,
      };
    }

    // Try to find SQL keywords
    const sqlMatch = text.match(/(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)[\s\S]*?;/i);
    if (sqlMatch) {
      const sql = sqlMatch[0].trim();
      return {
        sql,
        explanation: 'Extracted from text',
        intent,
        isDangerous: isDangerousQuery(sql),
        warnings: this.detectWarnings(sql),
        confidence: 0.6,
      };
    }

    throw new Error('Could not extract SQL from response');
  }

  private detectWarnings(sql: string): string[] {
    const warnings: string[] = [];
    const sqlLower = sql.toLowerCase();

    if (!sqlLower.includes('limit') && sqlLower.startsWith('select')) {
      warnings.push('Query has no LIMIT clause - may return many rows');
    }

    if (sqlLower.includes('select *')) {
      warnings.push('Using SELECT * - consider specifying columns');
    }

    if (sqlLower.includes('delete') && !sqlLower.includes('where')) {
      warnings.push('DELETE without WHERE - will delete all rows!');
    }

    if (sqlLower.includes('update') && !sqlLower.includes('where')) {
      warnings.push('UPDATE without WHERE - will update all rows!');
    }

    return warnings;
  }
}
