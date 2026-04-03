#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { DBxREPL } from './repl.js';
import { DatabaseConnectionManager } from './core/connection.js';
import { SchemaEngine } from './core/schema.js';
import { QueryExecutor } from './core/executor.js';
import { MemorySystem } from './core/memory.js';
import { OllamaService } from './services/ollama.js';
import { connectCommand } from './commands/connect.js';
import { tablesCommand } from './commands/tables.js';
import { schemaCommand } from './commands/schema.js';
import { askCommand } from './commands/ask.js';
import { historyCommand } from './commands/history.js';
import { logger } from './utils/logger.js';
import { AppConfig } from './types/config.js';

// Load environment variables
dotenv.config();

// Purple theme
const purple = chalk.hex('#9D4EDD');
const lightPurple = chalk.hex('#C77DFF');
const accent = chalk.hex('#E0AAFF');

// Global state
let connection: DatabaseConnectionManager | null = null;
let schemaEngine: SchemaEngine | null = null;
let executor: QueryExecutor | null = null;
let memory: MemorySystem | null = null;
let ollama: OllamaService | null = null;

// Load configuration
function loadConfig(): AppConfig {
  return {
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      temperature: 0.1,
    },
    database: {
      maxSchemaTables: parseInt(process.env.MAX_SCHEMA_TABLES || '50'),
      queryTimeout: parseInt(process.env.QUERY_TIMEOUT || '30000'),
      enableCache: true,
    },
    app: {
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      enableMemory: process.env.ENABLE_MEMORY !== 'false',
      memorySize: 50,
      safeMode: true,
      autoFix: false,
    },
  };
}

// Initialize services
function initializeServices(config: AppConfig): void {
  if (!connection) {
    throw new Error('Not connected to database. Use "connect" command first.');
  }

  if (!schemaEngine) {
    schemaEngine = new SchemaEngine(connection);
  }

  if (!executor) {
    executor = new QueryExecutor(connection, config.database.queryTimeout);
  }

  if (!memory) {
    memory = new MemorySystem(config.app.memorySize);
  }

  if (!ollama) {
    ollama = new OllamaService(config.ollama);
  }
}

// Create CLI program
const program = new Command();

program
  .name('dbx')
  .description('AI-Powered Database Intelligence Assistant')
  .version('1.0.0');

// Interactive REPL mode (default)
program
  .command('repl', { isDefault: true })
  .description('Start interactive REPL mode (default)')
  .action(async () => {
    try {
      const config = loadConfig();
      logger.setLevel(config.app.logLevel);
      
      const repl = new DBxREPL(config);
      await repl.start();
    } catch (error) {
      logger.error('REPL failed', error);
      process.exit(1);
    }
  });

// Connect command
program
  .command('connect <connection-string>')
  .description('Connect to a database')
  .action(async (connectionString: string) => {
    try {
      connection = await connectCommand(connectionString);
      const config = loadConfig();
      initializeServices(config);
      logger.success('Ready to accept queries!');
    } catch (error) {
      logger.error('Connection failed', error);
      process.exit(1);
    }
  });

// Tables command
program
  .command('tables')
  .description('List all tables in the database')
  .action(async () => {
    try {
      if (!schemaEngine) {
        throw new Error('Not connected. Use "connect" command first.');
      }
      await tablesCommand(schemaEngine);
    } catch (error) {
      logger.error('Command failed', error);
      process.exit(1);
    }
  });

// Schema command
program
  .command('schema [table]')
  .description('Show database schema (all tables or specific table)')
  .action(async (table?: string) => {
    try {
      if (!schemaEngine) {
        throw new Error('Not connected. Use "connect" command first.');
      }
      await schemaCommand(schemaEngine, table);
    } catch (error) {
      logger.error('Command failed', error);
      process.exit(1);
    }
  });

// Ask command
program
  .command('ask <question>')
  .description('Ask a question in natural language')
  .option('-d, --dry-run', 'Validate query without executing')
  .option('-e, --explain', 'Show query execution plan')
  .option('-f, --auto-fix', 'Automatically fix SQL errors')
  .action(async (question: string, options: any) => {
    try {
      if (!schemaEngine || !executor || !ollama || !memory) {
        throw new Error('Not connected. Use "connect" command first.');
      }

      // Test Ollama connection
      const ollamaConnected = await ollama.testConnection();
      if (!ollamaConnected) {
        throw new Error(
          'Cannot connect to Ollama. Make sure Ollama is running (ollama serve)'
        );
      }

      await askCommand(question, schemaEngine, executor, ollama, memory, options);
    } catch (error) {
      logger.error('Command failed', error);
      process.exit(1);
    }
  });

// History command
program
  .command('history')
  .description('Show query history')
  .option('-l, --limit <number>', 'Limit number of results', '20')
  .action((options: any) => {
    try {
      if (!memory) {
        throw new Error('Not connected. Use "connect" command first.');
      }
      const limit = parseInt(options.limit);
      historyCommand(memory, limit);
    } catch (error) {
      logger.error('Command failed', error);
      process.exit(1);
    }
  });

// Disconnect command
program
  .command('disconnect')
  .description('Disconnect from database')
  .action(async () => {
    try {
      if (connection) {
        await connection.disconnect();
        connection = null;
        schemaEngine = null;
        executor = null;
        logger.success('Disconnected');
      } else {
        logger.warn('Not connected');
      }
    } catch (error) {
      logger.error('Disconnect failed', error);
      process.exit(1);
    }
  });

// Test command (for development)
program
  .command('test')
  .description('Test Ollama connection')
  .action(async () => {
    try {
      const config = loadConfig();
      const testOllama = new OllamaService(config.ollama);
      
      logger.info('Testing Ollama connection...');
      const connected = await testOllama.testConnection();
      
      if (connected) {
        logger.success('Ollama is running');
        const models = await testOllama.listModels();
        console.log(lightPurple('\nAvailable models:'));
        models.forEach(m => console.log(accent(`  - ${m}`)));
      } else {
        logger.error('Cannot connect to Ollama');
        console.log(chalk.yellow('\nMake sure Ollama is running:'));
        console.log(chalk.gray('  ollama serve'));
      }
    } catch (error) {
      logger.error('Test failed', error);
      process.exit(1);
    }
  });

// Set log level
const config = loadConfig();
logger.setLevel(config.app.logLevel);

// Display banner only if no command provided
if (process.argv.length === 2) {
  console.log();
  console.log(purple('   ██████╗ ██████╗ ██╗  ██╗'));
  console.log(purple('   ██╔══██╗██╔══██╗╚██╗██╔╝'));
  console.log(purple('   ██║  ██║██████╔╝ ╚███╔╝'));
  console.log(purple('   ██║  ██║██╔══██╗ ██╔██╗'));
  console.log(purple('   ██████╔╝██████╔╝██╔╝ ██╗'));
  console.log(purple('   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝'));
  console.log();
  console.log(accent('   Database Intelligence Assistant'));
  console.log(chalk.hex('#5A189A')('   Powered by Ollama AI'));
  console.log();
  console.log(lightPurple('Starting interactive mode...'));
  console.log(chalk.hex('#5A189A')('Type "help" for commands or just ask questions!\n'));
}

// Parse arguments
program.parse();
