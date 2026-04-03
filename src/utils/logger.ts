import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Purple theme colors
const purple = chalk.hex('#9D4EDD');
const lightPurple = chalk.hex('#C77DFF');
const darkPurple = chalk.hex('#7209B7');
const accent = chalk.hex('#E0AAFF');

class Logger {
  private level: LogLevel = 'info';
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(lightPurple(`[DBx] ${message}`), ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(accent(`✓ ${message}`), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow(`⚠ ${message}`), ...args);
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red(`✗ ${message}`));
      if (error) {
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
          if (this.level === 'debug' && error.stack) {
            console.error(chalk.gray(error.stack));
          }
        } else {
          console.error(chalk.red(JSON.stringify(error, null, 2)));
        }
      }
    }
  }

  table(data: any[]): void {
    console.table(data);
  }

  // Purple-themed methods
  banner(text: string): void {
    console.log(purple(text));
  }

  highlight(text: string): void {
    console.log(darkPurple(text));
  }

  accent(text: string): void {
    console.log(accent(text));
  }
}

export const logger = new Logger();
