import inquirer from 'inquirer';
import ora from 'ora';
import { SchemaEngine } from '../core/schema.js';
import { TableSelector } from '../core/selector.js';
import { QueryPlanner } from '../core/planner.js';
import { SQLGenerator } from '../core/generator.js';
import { QueryValidator } from '../core/validator.js';
import { QueryExecutor } from '../core/executor.js';
import { MemorySystem } from '../core/memory.js';
import { OllamaService } from '../services/ollama.js';
import { formatter } from '../services/formatter.js';
import { logger } from '../utils/logger.js';
import { generateId } from '../utils/helpers.js';
import { QueryHistory } from '../types/query.js';

export async function askCommand(
  question: string,
  schemaEngine: SchemaEngine,
  executor: QueryExecutor,
  ollama: OllamaService,
  memory: MemorySystem,
  options: {
    dryRun?: boolean;
    explain?: boolean;
    autoFix?: boolean;
  } = {}
): Promise<void> {
  const spinner = ora();

  try {
    // Get schema
    spinner.start('Loading schema...');
    const fullSchema = await schemaEngine.getFullSchema();
    spinner.succeed('Schema loaded');

    // Select relevant tables
    spinner.start('Analyzing query...');
    const selector = new TableSelector(10);
    const relevantTables = selector.selectRelevantTables(question, fullSchema);
    const filteredSchema = schemaEngine.getSchemaForTables(relevantTables);
    
    if (!filteredSchema) {
      throw new Error('No relevant tables found');
    }
    spinner.succeed(`Selected ${relevantTables.length} relevant tables`);

    // Create query plan
    spinner.start('Creating query plan...');
    const planner = new QueryPlanner(ollama);
    const context = memory.getContext();
    const plan = await planner.createPlan(question, filteredSchema, context);
    spinner.succeed('Query plan created');

    // Generate SQL
    spinner.start('Generating SQL...');
    const generator = new SQLGenerator(ollama);
    const query = await generator.generateSQL(
      question,
      filteredSchema,
      plan,
      'mysql' // TODO: Get from connection
    );
    spinner.succeed('SQL generated');

    // Display generated SQL
    console.log('\n' + formatter.formatSQL(query.sql));
    console.log(formatter.formatInfo(query.explanation));

    if (query.warnings.length > 0) {
      query.warnings.forEach(w => console.log(formatter.formatWarning(w)));
    }

    // Validate query
    const validator = new QueryValidator(!options.dryRun);
    const validation = validator.validate(query);

    if (!validation.isValid) {
      console.log(formatter.formatError(new Error('Query validation failed')));
      validation.errors.forEach(e => {
        console.log(formatter.formatWarning(`${e.type}: ${e.message}`));
      });
      
      if (options.autoFix) {
        console.log(formatter.formatInfo('Auto-fix not yet implemented'));
      }
      return;
    }

    // Show warnings
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => console.log(formatter.formatWarning(w)));
    }

    // Confirm dangerous queries
    if (validator.requiresConfirmation(query)) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'This query will modify data. Continue?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(formatter.formatInfo('Query cancelled'));
        return;
      }
    }

    // Dry run
    if (options.dryRun) {
      spinner.start('Performing dry run...');
      const dryRunResult = await executor.dryRun(query);
      
      if (dryRunResult.isValid) {
        spinner.succeed('Dry run successful - query is valid');
      } else {
        spinner.fail(`Dry run failed: ${dryRunResult.error}`);
      }
      return;
    }

    // Explain
    if (options.explain) {
      spinner.start('Getting execution plan...');
      const explainResult = await executor.explain(query);
      spinner.succeed('Execution plan:');
      console.table(explainResult);
      return;
    }

    // Execute query
    spinner.start('Executing query...');
    const execution = await executor.execute(query);
    
    if (execution.error) {
      spinner.fail('Query failed');
      console.log(formatter.formatError(execution.error));
      
      // Save to history
      const historyEntry: QueryHistory = {
        id: generateId(),
        timestamp: new Date(),
        naturalLanguage: question,
        generatedSQL: query.sql,
        intent: query.intent,
        success: false,
        error: execution.error.message,
      };
      memory.addQuery(historyEntry);
      
      return;
    }

    spinner.succeed(formatter.formatSummary(execution.result!));

    // Display results
    if (execution.result!.rows.length > 0) {
      console.log('\n' + formatter.formatTable(execution.result!));
    } else {
      console.log(formatter.formatInfo('No results returned'));
    }

    // Save to history
    const historyEntry: QueryHistory = {
      id: generateId(),
      timestamp: new Date(),
      naturalLanguage: question,
      generatedSQL: query.sql,
      intent: query.intent,
      success: true,
      rowCount: execution.result!.rowCount,
      executionTime: execution.duration,
    };
    memory.addQuery(historyEntry);

  } catch (error) {
    spinner.fail('Command failed');
    logger.error('Ask command failed', error);
    throw error;
  }
}
