import { describe, it, expect } from 'vitest';
import {
  parseConnectionString,
  isSelectQuery,
  isDangerousQuery,
  extractTableNames,
  formatDuration,
} from '../src/utils/helpers';

describe('Helpers', () => {
  describe('parseConnectionString', () => {
    it('should parse MySQL connection string', () => {
      const result = parseConnectionString('mysql://user:pass@localhost:3306/mydb');
      expect(result.type).toBe('mysql');
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(3306);
      expect(result.user).toBe('user');
      expect(result.password).toBe('pass');
      expect(result.database).toBe('mydb');
    });

    it('should parse SQLite connection string', () => {
      const result = parseConnectionString('sqlite://./data/test.db');
      expect(result.type).toBe('sqlite');
      expect(result.filename).toBe('./data/test.db');
    });

    it('should parse PostgreSQL connection string', () => {
      const result = parseConnectionString('postgresql://user:pass@localhost:5432/mydb');
      expect(result.type).toBe('postgresql');
      expect(result.port).toBe(5432);
    });
  });

  describe('isSelectQuery', () => {
    it('should identify SELECT queries', () => {
      expect(isSelectQuery('SELECT * FROM users')).toBe(true);
      expect(isSelectQuery('  select id from orders')).toBe(true);
      expect(isSelectQuery('SHOW TABLES')).toBe(true);
    });

    it('should reject non-SELECT queries', () => {
      expect(isSelectQuery('DELETE FROM users')).toBe(false);
      expect(isSelectQuery('UPDATE users SET name = "test"')).toBe(false);
    });
  });

  describe('isDangerousQuery', () => {
    it('should identify dangerous queries', () => {
      expect(isDangerousQuery('DELETE FROM users')).toBe(true);
      expect(isDangerousQuery('DROP TABLE users')).toBe(true);
      expect(isDangerousQuery('TRUNCATE TABLE users')).toBe(true);
    });

    it('should allow safe queries', () => {
      expect(isDangerousQuery('SELECT * FROM users')).toBe(false);
      expect(isDangerousQuery('INSERT INTO users VALUES (1, "test")')).toBe(false);
    });
  });

  describe('extractTableNames', () => {
    it('should extract table names from SQL', () => {
      const tables = extractTableNames('SELECT * FROM users JOIN orders ON users.id = orders.user_id');
      expect(tables).toContain('users');
      expect(tables).toContain('orders');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(2500)).toBe('2.50s');
    });

    it('should format minutes', () => {
      expect(formatDuration(125000)).toBe('2.08m');
    });
  });
});
