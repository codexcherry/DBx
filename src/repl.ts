import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { DatabaseConnectionManager } from './core/connection.js';
import { SchemaEngine } from './core/schema.js';
import { QueryExecutor } from './core/executor.js';
import { MemorySystem } from './core/memory.js';
import { OllamaService } from './services/ollama.js';
import { TableSelector } from './core/selector.js';
import { QueryPlanner } from './core/planner.js';
import { SQLGenerator } from './core/generator.js';
import { QueryValidator } from './core/validator.js';
import { formatter } from './services/formatter.js';
import { logger } from './utils/logger.js';
import { parseConnectionString } from './utils/helpers.js';
import { generateId } from './utils/helpers.js';
import { AppConfig } from './types/config.js';
import { QueryHistory } from './types/query.js';

// Purple theme
const purple = chalk.hex('#9D4EDD');
const lightPurple = chalk.hex('#C77DFF');
const darkPurple = chalk.hex('#7209B7');
const accent = chalk.hex('#E0AAFF');
const dim = chalk.hex('#5A189A');

export class DBxREPL {
  private connection: DatabaseConnectionManager | null = null;
  private schemaEngine: SchemaEngine | null = null;
  private executor: QueryExecutor | null = null;
  private memory: MemorySystem;
  private ollama: OllamaService;
  private config: AppConfig;
  private isRunning: boolean = false;

  constructor(config: AppConfig) {
    this.config = config;
    this.memory = new MemorySystem(config.app.memorySize);
    this.ollama = new OllamaService(config.ollama);
  }

  async start(): Promise<void> {
    this.showBanner();
    await this.checkOllama();
    
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        await this.promptUser();
      } catch (error) {
        if (error instanceof Error && error.message === 'User force closed the prompt') {
          break;
        }
        logger.error('Error in REPL', error);
      }
    }

    await this.cleanup();
  }

  private showBanner(): void {
    console.clear();
    console.log();
    console.log(purple('   ██████╗ ██████╗ ██╗  ██╗'));
    console.log(purple('   ██╔══██╗██╔══██╗╚██╗██╔╝'));
    console.log(purple('   ██║  ██║██████╔╝ ╚███╔╝'));
    console.log(purple('   ██║  ██║██╔══██╗ ██╔██╗'));
    console.log(purple('   ██████╔╝██████╔╝██╔╝ ██╗'));
    console.log(purple('   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝'));
    console.log();
    console.log(accent('   Database Intelligence Assistant'));
    console.log(dim('   Powered by Ollama AI'));
    console.log();
  }

  private async checkOllama(): Promise<void> {
    const spinner = ora({
      text: lightPurple('Checking Ollama connection...'),
      color: 'magenta',
    }).start();

    try {
      const connected = await this.ollama.testConnection();
      
      if (connected) {
        const models = await this.ollama.listModels();
        const hasModel = models.some(m => m.includes(this.config.ollama.model));
        
        if (hasModel) {
          spinner.succeed(accent(`✓ Ollama connected (${this.config.ollama.model})`));
        } else {
          spinner.warn(chalk.yellow(`⚠ Model ${this.config.ollama.model} not found`));
          console.log(dim(`  Available: ${models.join(', ')}`));
          console.log(chalk.yellow(`\n  Pull it with: ollama pull ${this.config.ollama.model}\n`));
        }
      } else {
        spinner.fail(chalk.red('✗ Cannot connect to Ollama'));
        console.log(chalk.yellow('\n  Make sure Ollama is running:'));
        console.log(chalk.gray('    ollama serve\n'));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('✗ Ollama check failed'));
      throw error;
    }
  }

  private async promptUser(): Promise<void> {
    const promptText = this.connection
      ? lightPurple('dbx') + darkPurple(' > ')
      : purple('dbx ') + dim('(not connected)') + darkPurple(' > ');

    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: promptText,
        prefix: '',
      },
    ]);

    const trimmed = input.trim();
    if (!trimmed) return;

    await this.handleCommand(trimmed);
  }

  private async handleCommand(input: string): Promise<void> {
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();

    try {
      switch (command) {
        case 'connect':
          await this.handleConnect(parts.slice(1).join(' '));
          break;
        case 'disconnect':
          await this.handleDisconnect();
          break;
        case 'tables':
          await this.handleTables();
          break;
        case 'schema':
          await this.handleSchema(parts[1]);
          break;
        case 'history':
          this.handleHistory();
          break;
        case 'clear':
          console.clear();
          this.showBanner();
          break;
        case 'help':
          this.showHelp();
          break;
        case 'exit':
        case 'quit':
          this.isRunning = false;
          break;
        default:
          // Treat as natural language query
          await this.handleQuery(input);
          break;
      }
    } catch (error) {
      logger.error('Command failed', error);
    }

    console.log(); // Add spacing
  }

  private async handleConnect(connectionString: string): Promise<void> {
    if (!connectionString) {
      console.log(chalk.red('Usage: connect <connection-string>'));
      console.log(chalk.gray('Example: connect sqlite://./test.db'));
      return;
    }

    const spinner = ora({
      text: lightPurple('Connecting to database...'),
      color: 'magenta',
    }).start();

    try {
      const config = parseConnectionString(connectionString);
      this.connection = new DatabaseConnectionManager(config);
      await this.connection.connect();
      
      this.schemaEngine = new SchemaEngine(this.connection);
      this.executor = new QueryExecutor(this.connection, this.config.database.queryTimeout);
      
      spinner.succeed(accent(`✓ Connected to ${config.type} database`));
      
      // Load schema synchronously to avoid prompt issues
      const schemaSpinner = ora({
        text: dim('Loading schema...'),
        color: 'magenta',
      }).start();
      
      try {
        const schema = await this.schemaEngine!.getFullSchema();
        const tableCount = Object.keys(schema.tables).length;
        
        if (tableCount === 0) {
          schemaSpinner.info(dim('Database is empty (no tables found)'));
          console.log();
          console.log(lightPurple('💡 Tip: Create tables by asking:'));
          console.log(dim('  "create a users table with id, name, and email"'));
          console.log(dim('  "create a products table with id, name, price, and description"'));
          console.log();
        } else {
          schemaSpinner.succeed(dim(`Schema loaded: ${tableCount} tables`));
          console.log();
        }
      } catch (error) {
        schemaSpinner.warn(dim('Schema load warning - will retry on first query'));
        logger.debug('Schema load error:', error);
        console.log();
      }
      
    } catch (error) {
      spinner.fail(chalk.red('✗ Connection failed'));
      throw error;
    }
  }

  private async handleDisconnect(): Promise<void> {
    if (!this.connection) {
      console.log(chalk.yellow('Not connected'));
      return;
    }

    await this.connection.disconnect();
    this.connection = null;
    this.schemaEngine = null;
    this.executor = null;
    
    console.log(accent('✓ Disconnected'));
  }

  private async handleTables(): Promise<void> {
    if (!this.schemaEngine) {
      console.log(chalk.red('Not connected. Use: connect <connection-string>'));
      return;
    }

    const spinner = ora({
      text: lightPurple('Fetching tables...'),
      color: 'magenta',
    }).start();

    try {
      const tables = await this.schemaEngine.getTableNames();
      spinner.succeed(accent(`✓ Found ${tables.length} tables`));
      
      console.log();
      tables.forEach((table, i) => {
        console.log(lightPurple(`  ${i + 1}. `) + accent(table));
      });
    } catch (error) {
      spinner.fail(chalk.red('✗ Failed to fetch tables'));
      throw error;
    }
  }

  private async handleSchema(tableName?: string): Promise<void> {
    if (!this.schemaEngine) {
      console.log(chalk.red('Not connected. Use: connect <connection-string>'));
      return;
    }

    const spinner = ora({
      text: lightPurple('Fetching schema...'),
      color: 'magenta',
    }).start();

    try {
      if (tableName) {
        const schema = await this.schemaEngine.getTableSchema(tableName);
        spinner.succeed(accent(`✓ Schema for ${tableName}`));
        console.log(formatter.formatSchema(tableName, schema.columns));
      } else {
        const schema = await this.schemaEngine.getFullSchema();
        spinner.succeed(accent(`✓ Full schema (${Object.keys(schema.tables).length} tables)`));
        
        Object.entries(schema.tables).forEach(([name, tableSchema]) => {
          console.log(formatter.formatSchema(name, tableSchema.columns));
        });
      }
    } catch (error) {
      spinner.fail(chalk.red('✗ Failed to fetch schema'));
      throw error;
    }
  }

  private handleHistory(): void {
    const history = this.memory.getQueryHistory(20);
    
    if (history.length === 0) {
      console.log(dim('No query history'));
      return;
    }

    console.log(lightPurple(`\nQuery History (${history.length} queries):\n`));

    history.forEach((entry, index) => {
      const status = entry.success ? accent('✓') : chalk.red('✗');
      const time = entry.executionTime ? dim(`${entry.executionTime}ms`) : '';
      const rows = entry.rowCount !== undefined ? dim(`${entry.rowCount} rows`) : '';
      
      console.log(`${status} ${darkPurple(`#${index + 1}`)} ${lightPurple(entry.naturalLanguage)}`);
      console.log(`   ${dim(entry.generatedSQL)}`);
      if (time || rows) {
        console.log(`   ${time} ${rows}`);
      }
      if (entry.error) {
        console.log(`   ${chalk.red(entry.error)}`);
      }
      console.log();
    });
  }

  private async handleQuery(question: string): Promise<void> {
    if (!this.connection || !this.schemaEngine || !this.executor) {
      console.log(chalk.red('Not connected. Use: connect <connection-string>'));
      return;
    }

    let spinner = ora({
      text: lightPurple('Analyzing query...'),
      color: 'magenta',
    }).start();

    try {
      // Get schema
      const fullSchema = await this.schemaEngine.getFullSchema();
      spinner.text = lightPurple('Selecting relevant tables...');

      // Select tables
      const selector = new TableSelector(10);
      const relevantTables = selector.selectRelevantTables(question, fullSchema);
      const filteredSchema = this.schemaEngine.getSchemaForTables(relevantTables);
      
      if (!filteredSchema) {
        throw new Error('No relevant tables found');
      }

      spinner.succeed(accent(`✓ Selected ${relevantTables.length} tables: ${relevantTables.join(', ')}`));

      // Create plan
      spinner = ora({
        text: lightPurple('Creating query plan...'),
        color: 'magenta',
      }).start();

      const planner = new QueryPlanner(this.ollama);
      const context = this.memory.getContext();
      const plan = await planner.createPlan(question, filteredSchema, context);
      
      spinner.succeed(accent(`✓ Plan created (${plan.intent})`));

      // Generate SQL
      spinner = ora({
        text: lightPurple('Generating SQL...'),
        color: 'magenta',
      }).start();

      const generator = new SQLGenerator(this.ollama);
      const query = await generator.generateSQL(
        question,
        filteredSchema,
        plan,
        this.connection.config.type
      );

      spinner.succeed(accent('✓ SQL generated'));

      // Display SQL
      console.log();
      console.log(darkPurple('━'.repeat(60)));
      console.log(formatter.formatSQL(query.sql));
      console.log(darkPurple('━'.repeat(60)));
      console.log(dim(query.explanation));

      if (query.warnings.length > 0) {
        console.log();
        query.warnings.forEach(w => console.log(chalk.yellow(`⚠ ${w}`)));
      }

      // Validate
      const validator = new QueryValidator(true);
      const validation = validator.validate(query);

      if (!validation.isValid) {
        console.log(chalk.red('\n✗ Query validation failed'));
        validation.errors.forEach(e => {
          console.log(chalk.red(`  ${e.type}: ${e.message}`));
        });
        return;
      }

      // Confirm if dangerous
      if (validator.requiresConfirmation(query)) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: chalk.yellow('This query will modify data. Continue?'),
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(dim('Query cancelled'));
          return;
        }
      }

      // Execute
      spinner = ora({
        text: lightPurple('Executing query...'),
        color: 'magenta',
      }).start();

      const execution = await this.executor.execute(query);

      if (execution.error) {
        spinner.fail(chalk.red('✗ Query failed'));
        console.log(chalk.red(execution.error.message));
        
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
        this.memory.addQuery(historyEntry);
        
        return;
      }

      spinner.succeed(accent(`✓ Query executed in ${execution.duration}ms`));

      // Display results
      if (execution.result!.rows.length > 0) {
        console.log();
        console.log(formatter.formatTable(execution.result!, { maxRows: 50 }));
        console.log();
        console.log(dim(`${execution.result!.rowCount} rows returned`));
      } else {
        console.log(dim('\nNo results returned'));
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
      this.memory.addQuery(historyEntry);

    } catch (error) {
      spinner.fail(chalk.red('✗ Query failed'));
      throw error;
    }
  }

  private showHelp(): void {
    console.log(lightPurple('\nAvailable Commands:\n'));
    
    const commands = [
      ['connect <url>', 'Connect to database'],
      ['disconnect', 'Disconnect from database'],
      ['tables', 'List all tables'],
      ['schema [table]', 'Show schema'],
      ['history', 'Show query history'],
      ['clear', 'Clear screen'],
      ['help', 'Show this help'],
      ['exit', 'Exit DBx'],
      ['<question>', 'Ask in natural language'],
    ];

    commands.forEach(([cmd, desc]) => {
      console.log(`  ${accent(cmd.padEnd(20))} ${dim(desc)}`);
    });

    console.log(lightPurple('\nExamples:\n'));
    console.log(dim('  show me all users'));
    console.log(dim('  count orders by status'));
    console.log(dim('  find customers who ordered in last 30 days'));
  }

  private async cleanup(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
    }
    console.log(accent('\n✓ Goodbye!\n'));
  }
}
