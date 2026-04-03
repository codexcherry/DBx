import { OllamaService } from '../services/ollama.js';
import { SchemaInfo } from '../types/database.js';
import { QueryPlan, QueryIntent, QueryStep } from '../types/query.js';
import { logger } from '../utils/logger.js';

export class QueryPlanner {
  private ollama: OllamaService;

  constructor(ollama: OllamaService) {
    this.ollama = ollama;
  }

  async createPlan(
    naturalLanguage: string,
    schema: SchemaInfo,
    context?: any
  ): Promise<QueryPlan> {
    logger.debug('Creating query plan...');

    const systemPrompt = this.buildPlanningPrompt(schema);
    const userPrompt = this.buildUserPrompt(naturalLanguage, context);

    const response = await this.ollama.generate(userPrompt, systemPrompt);
    const plan = this.parsePlanResponse(response.content);

    logger.debug(`Query plan created: ${plan.intent}, ${plan.requiredTables.length} tables`);
    return plan;
  }

  private buildPlanningPrompt(schema: SchemaInfo): string {
    const tableList = Object.keys(schema.tables).join(', ');
    
    return `You are a SQL query planner. Analyze user requests and create a query plan.

Available tables: ${tableList}

Your response must be in this exact JSON format:
{
  "intent": "select|insert|update|delete|aggregate|join",
  "requiredTables": ["table1", "table2"],
  "steps": [
    {
      "description": "Step description",
      "tables": ["table1"],
      "type": "fetch|filter|join|aggregate|sort"
    }
  ],
  "estimatedComplexity": "simple|moderate|complex",
  "warnings": ["warning1", "warning2"]
}

Rules:
- Only use tables that exist in the schema
- Break complex queries into logical steps
- Identify if query is dangerous (DELETE, DROP, etc.)
- Consider relationships between tables`;
  }

  private buildUserPrompt(naturalLanguage: string, context?: any): string {
    let prompt = `User request: "${naturalLanguage}"\n\n`;
    
    if (context?.previousQueries?.length > 0) {
      prompt += 'Previous queries:\n';
      context.previousQueries.slice(-3).forEach((q: any) => {
        prompt += `- ${q.naturalLanguage}\n`;
      });
      prompt += '\n';
    }

    prompt += 'Create a query plan for this request.';
    return prompt;
  }

  private parsePlanResponse(response: string): QueryPlan {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        intent: this.normalizeIntent(parsed.intent),
        requiredTables: parsed.requiredTables || [],
        steps: parsed.steps || [],
        estimatedComplexity: parsed.estimatedComplexity || 'moderate',
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      logger.warn('Failed to parse plan response, using fallback');
      return this.createFallbackPlan(response);
    }
  }

  private normalizeIntent(intent: string): QueryIntent {
    const intentMap: Record<string, QueryIntent> = {
      select: 'select',
      insert: 'insert',
      update: 'update',
      delete: 'delete',
      create: 'create',
      drop: 'drop',
      alter: 'alter',
      aggregate: 'aggregate',
      join: 'join',
    };

    return intentMap[intent.toLowerCase()] || 'unknown';
  }

  private createFallbackPlan(response: string): QueryPlan {
    return {
      intent: 'select',
      requiredTables: [],
      steps: [
        {
          description: 'Execute query',
          tables: [],
          type: 'fetch',
        },
      ],
      estimatedComplexity: 'moderate',
      warnings: ['Could not create detailed plan'],
    };
  }
}
