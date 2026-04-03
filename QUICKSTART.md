# DBx Quick Start Guide

## Prerequisites

1. **Node.js** (>= 18.0.0)
2. **Ollama** installed and running

## Installation

### 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### 2. Start Ollama

```bash
ollama serve
```

### 3. Pull a Model

```bash
# Recommended: Llama 3.2 (fast and accurate)
ollama pull llama3.2

# Alternative: Mistral
ollama pull mistral

# Alternative: CodeLlama (better for SQL)
ollama pull codellama
```

### 4. Install DBx Dependencies

```bash
cd DBx
npm install
```

### 5. Configure Environment

```bash
# .env file is already created with defaults
# Edit if needed:
# - OLLAMA_MODEL=llama3.2
# - OLLAMA_BASE_URL=http://localhost:11434
```

## Quick Test

### Test Ollama Connection

```bash
npm run dev test
```

Expected output:
```
✓ Ollama is running

Available models:
  - llama3.2
```

## First Database Connection

### SQLite (Easiest - No Setup Required)

```bash
# Connect to SQLite database
npm run dev connect sqlite://./test.db

# List tables
npm run dev tables

# Ask a question
npm run dev ask "create a users table with id, name, and email"
```

### MySQL

```bash
# Start MySQL (if not running)
# Then connect:
npm run dev connect mysql://root:password@localhost:3306/mydb
```

### PostgreSQL

```bash
npm run dev connect postgresql://user:password@localhost:5432/mydb
```

## Example Workflow

```bash
# 1. Connect
npm run dev connect sqlite://./demo.db

# 2. Check tables
npm run dev tables

# 3. View schema
npm run dev schema

# 4. Ask questions
npm run dev ask "show me all users"
npm run dev ask "count orders by status"
npm run dev ask "find customers who ordered in the last 30 days"

# 5. View history
npm run dev history

# 6. Disconnect
npm run dev disconnect
```

## Common Issues

### "Cannot connect to Ollama"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it:
ollama serve
```

### "Model not found"

```bash
# Pull the model
ollama pull llama3.2

# Or change model in .env
OLLAMA_MODEL=mistral
```

### "Database connection failed"

- Check connection string format
- Verify database is running
- Check credentials
- Ensure database exists

## Tips

1. **Use Dry Run** for dangerous queries:
   ```bash
   npm run dev ask "delete old records" --dry-run
   ```

2. **Explain Complex Queries**:
   ```bash
   npm run dev ask "complex query" --explain
   ```

3. **Follow-up Questions** use context:
   ```bash
   npm run dev ask "show all orders"
   npm run dev ask "filter those by status pending"
   ```

4. **View Schema** before asking:
   ```bash
   npm run dev schema
   ```

## Next Steps

- Read full [README.md](./README.md)
- Check [sample-queries.md](./examples/sample-queries.md)
- Build for production: `npm run build`
- Run tests: `npm test`

## Support

For issues:
1. Check Ollama is running: `ollama serve`
2. Verify model is installed: `ollama list`
3. Test connection: `npm run dev test`
4. Check logs with: `LOG_LEVEL=debug npm run dev ask "query"`
