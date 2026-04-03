import { MemorySystem } from '../core/memory.js';
import { formatter } from '../services/formatter.js';
import chalk from 'chalk';

export function historyCommand(memory: MemorySystem, limit?: number): void {
  const history = memory.getQueryHistory(limit);

  if (history.length === 0) {
    console.log(formatter.formatInfo('No query history'));
    return;
  }

  console.log(chalk.bold(`\nQuery History (${history.length} queries):\n`));

  history.forEach((entry, index) => {
    const status = entry.success ? chalk.green('✓') : chalk.red('✗');
    const time = entry.executionTime ? chalk.gray(`${entry.executionTime}ms`) : '';
    const rows = entry.rowCount !== undefined ? chalk.gray(`${entry.rowCount} rows`) : '';
    
    console.log(`${status} ${chalk.cyan(`#${index + 1}`)} ${entry.naturalLanguage}`);
    console.log(`   ${chalk.gray(entry.generatedSQL)}`);
    if (time || rows) {
      console.log(`   ${time} ${rows}`);
    }
    if (entry.error) {
      console.log(`   ${chalk.red(entry.error)}`);
    }
    console.log();
  });

  const stats = memory.getStats();
  console.log(chalk.bold('Statistics:'));
  console.log(`  Total: ${stats.totalQueries}`);
  console.log(`  ${chalk.green('Successful')}: ${stats.successfulQueries}`);
  console.log(`  ${chalk.red('Failed')}: ${stats.failedQueries}`);
}
