# DBx Usage Guide

## Interactive Mode (Recommended)

The best way to use DBx is in interactive REPL mode:

```bash
npm run dev
# or
npm run dev repl
```

This starts an interactive session where you can:
- Connect to databases
- Ask questions in natural language
- View results immediately
- Keep context between queries
- Use command history

### Interactive Commands

```bash
# Connection
connect sqlite://./test.db
connect mysql://user:pass@localhost:3306/mydb
disconnect

# Schema exploration
tables
schema
schema users

# Queries (just type naturally!)
show me all users
count orders by status
find customers who ordered in last 30 days

# Utilities
history
clear
help
exit
```

## Single Command Mode

For scripting or one-off queries:

```bash
# Connect first (connection doesn't persist)
npm run dev connect sqlite://./test.db

# Then run queries
npm run dev ask "show me all users"
npm run dev tables
npm run dev schema users
npm run dev history
```

## Examples

### Basic Workflow

```bash
# Start interactive mode
npm run dev

# Connect to database
dbx > connect sqlite://./test.db
✓ Connected to sqlite database
Schema loaded: 5 tables

# Explore tables
dbx > tables
✓ Found 5 tables
  1. users
  2. orders
  3. products
  4. categories
  5. order_items

# Ask questions
dbx > show me all users
✓ Selected 1 tables: users
✓ Plan created (select)
✓ SQL generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT * FROM users LIMIT 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fetches all user records with a limit of 100

✓ Query executed in 15ms

┌────┬──────────┬─────────────────────┬────────────┐
│ id │ name     │ email               │ created_at │
├────┼──────────┼─────────────────────┼────────────┤
│ 1  │ John Doe │ john@example.com    │ 2024-01-01 │
│ 2  │ Jane Doe │ jane@example.com    │ 2024-01-02 │
└────┴──────────┴─────────────────────┴────────────┘

2 rows returned

# Follow-up query (uses context!)
dbx > filter those by name containing John
✓ Selected 1 tables: users
✓ Plan created (select)
✓ SQL generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT * FROM users WHERE name LIKE '%John%' LIMIT 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...

# View history
dbx > history
Query History (2 queries):

✓ #1 show me all users
   SELECT * FROM users LIMIT 100
   15ms 2 rows

✓ #2 filter those by name containing John
   SELECT * FROM users WHERE name LIKE '%John%' LIMIT 100
   12ms 1 rows

# Exit
dbx > exit
✓ Goodbye!
```

### Complex Queries

```bash
dbx > what are the top 5 customers by total order amount?
✓ Selected 3 tables: customers, orders, order_items
✓ Plan created (aggregate)
✓ SQL generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 
  c.id,
  c.name,
  SUM(oi.quantity * oi.price) as total_amount
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
GROUP BY c.id, c.name
ORDER BY total_amount DESC
LIMIT 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

### Dangerous Operations

```bash
dbx > delete old orders
✓ Selected 1 tables: orders
✓ Plan created (delete)
✓ SQL generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELETE FROM orders WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deletes orders older than 90 days

? This query will modify data. Continue? (y/N)
```

## Tips

1. **Use Interactive Mode** - Much better UX than single commands
2. **Follow-up Questions** - Context is preserved between queries
3. **Natural Language** - Just ask like you're talking to a person
4. **Check Schema First** - Use `tables` and `schema` to understand structure
5. **Review SQL** - Always check the generated SQL before confirming
6. **Use History** - Learn from previous queries

## Keyboard Shortcuts

- `Ctrl+C` - Cancel current input
- `Ctrl+D` - Exit (same as `exit` command)
- `Up/Down` - Navigate command history
- `Tab` - Auto-complete (if available)

## Configuration

Edit `.env` to customize:

```env
# Use different model
OLLAMA_MODEL=mistral

# Increase timeout for slow queries
QUERY_TIMEOUT=60000

# Enable debug logging
LOG_LEVEL=debug
```

## Troubleshooting

### "Not connected" error
You need to connect first in interactive mode:
```bash
dbx > connect sqlite://./test.db
```

### "Cannot connect to Ollama"
Make sure Ollama is running:
```bash
ollama serve
```

### Slow responses
- Use a faster model: `OLLAMA_MODEL=qwen2.5-coder:1.5b`
- Reduce schema size: `MAX_SCHEMA_TABLES=20`
- Check Ollama performance: `ollama ps`

### Poor SQL quality
- Try a different model: `codellama`, `mistral`
- Provide more context in your question
- Check schema with `schema` command
- Review and learn from `history`
