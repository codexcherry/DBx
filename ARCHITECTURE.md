# DBx Architecture

## Overview

DBx is an AI-powered database intelligence assistant that converts natural language to SQL using Ollama. The architecture is inspired by Claude Code's modular design with clear separation of concerns.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│                    (Commander.js)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Command Layer                             │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Connect  │  Tables  │  Schema  │   Ask    │ History  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Core Layer                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Connection Manager  →  Schema Engine                │  │
│  │         ↓                      ↓                      │  │
│  │  Table Selector  →  Query Planner  →  SQL Generator  │  │
│  │         ↓                      ↓                      │  │
│  │  Query Validator  →  Query Executor                  │  │
│  │         ↓                      ↓                      │  │
│  │  Memory System   ←  Result Formatter                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────────┬──────────────────┐                    │
│  │  Ollama Service  │  Result Formatter │                   │
│  └──────────────────┴──────────────────┘                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  External Services                           │
│  ┌──────────────────┬──────────────────┐                    │
│  │  Ollama AI       │  Database (SQL)   │                   │
│  └──────────────────┴──────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Connection Manager (`core/connection.ts`)

**Responsibility**: Database connection lifecycle management

**Features**:
- Multi-database support (MySQL, PostgreSQL, SQLite, MSSQL)
- Connection pooling via Knex.js
- Connection testing and validation
- Query execution with timeout handling

**Key Methods**:
- `connect()`: Establish database connection
- `disconnect()`: Close connection
- `query()`: Execute raw SQL
- `getTables()`: Fetch table list
- `getTableSchema()`: Get table structure

### 2. Schema Engine (`core/schema.ts`)

**Responsibility**: Database schema extraction and caching

**Features**:
- Full schema extraction
- Schema caching (5-minute TTL)
- Relationship detection
- AI-friendly schema formatting

**Key Methods**:
- `getFullSchema()`: Extract complete schema
- `getTableSchema()`: Get specific table
- `formatSchemaForAI()`: Format for LLM consumption
- `clearCache()`: Invalidate cache

### 3. Table Selector (`core/selector.ts`)

**Responsibility**: Smart table selection to reduce context size

**Algorithm**:
1. Score tables by relevance to query
2. Match table/column names with query keywords
3. Expand with related tables via foreign keys
4. Limit to top N tables (default: 10)

**Scoring System**:
- Exact table name match: +100
- Partial table name match: +50
- Column name match: +30
- Common pattern match: +40

### 4. Query Planner (`core/planner.ts`)

**Responsibility**: Create execution plan from natural language

**Process**:
1. Send query + schema to Ollama
2. Parse JSON response with query intent
3. Identify required tables
4. Break into logical steps
5. Estimate complexity

**Output**:
```typescript
{
  intent: 'select' | 'insert' | 'update' | 'delete',
  requiredTables: ['users', 'orders'],
  steps: [
    { description: 'Fetch users', type: 'fetch' }
  ],
  estimatedComplexity: 'simple' | 'moderate' | 'complex',
  warnings: []
}
```

### 5. SQL Generator (`core/generator.ts`)

**Responsibility**: Generate SQL from natural language + plan

**Process**:
1. Build system prompt with schema
2. Include query plan context
3. Send to Ollama
4. Parse SQL from response
5. Detect warnings (missing LIMIT, SELECT *, etc.)

**Safety Features**:
- Validates SQL syntax
- Detects dangerous operations
- Adds confidence score
- Provides explanation

### 6. Query Validator (`core/validator.ts`)

**Responsibility**: Validate and secure queries before execution

**Checks**:
- **Syntax**: Balanced quotes, parentheses
- **Security**: Dangerous keywords (DELETE, DROP, TRUNCATE)
- **Performance**: Missing LIMIT, SELECT *, inefficient patterns
- **Logic**: DELETE/UPDATE without WHERE

**Modes**:
- Safe mode: Block dangerous operations
- Normal mode: Warn but allow with confirmation

### 7. Query Executor (`core/executor.ts`)

**Responsibility**: Execute validated queries

**Features**:
- Timeout handling
- Dry run mode (validate without executing)
- Query explanation (EXPLAIN)
- Error handling and retry

### 8. Memory System (`core/memory.ts`)

**Responsibility**: Context and history management

**Storage**:
- Query history (last 50 queries)
- Context memory (last 100 entries)
- Success/failure tracking

**Features**:
- Follow-up query context
- History search
- Statistics tracking
- Import/export

## Service Layer

### Ollama Service (`services/ollama.ts`)

**Responsibility**: AI model communication

**Methods**:
- `generate()`: Single prompt generation
- `chat()`: Multi-turn conversation
- `testConnection()`: Health check
- `listModels()`: Available models

**Configuration**:
- Base URL (default: http://localhost:11434)
- Model selection (default: llama3.2)
- Temperature (default: 0.1 for deterministic SQL)

### Result Formatter (`services/formatter.ts`)

**Responsibility**: Pretty output formatting

**Features**:
- Table rendering (cli-table3)
- SQL syntax highlighting
- Color-coded messages
- Schema visualization

## Data Flow

### Query Execution Flow

```
User Input: "show me all users"
    ↓
1. Schema Engine
   - Load cached schema or fetch from DB
   - Extract table/column information
    ↓
2. Table Selector
   - Score tables by relevance
   - Select top N tables (e.g., "users")
    ↓
3. Query Planner (Ollama)
   - Analyze intent: "select"
   - Required tables: ["users"]
   - Steps: [{ fetch users }]
    ↓
4. SQL Generator (Ollama)
   - Generate: "SELECT * FROM users LIMIT 100"
   - Explanation: "Fetches all user records"
   - Confidence: 0.95
    ↓
5. Query Validator
   - Check syntax: ✓
   - Check security: ✓ (SELECT is safe)
   - Check performance: ⚠ (SELECT * warning)
    ↓
6. User Confirmation (if needed)
   - Display SQL
   - Show warnings
   - Request confirmation for dangerous ops
    ↓
7. Query Executor
   - Execute with timeout
   - Catch errors
   - Measure execution time
    ↓
8. Result Formatter
   - Format as table
   - Show summary (rows, time)
   - Display results
    ↓
9. Memory System
   - Save to history
   - Update context for follow-ups
```

## Error Handling

### Error Hierarchy

```
DBxError (base)
├── ConnectionError
├── SchemaError
├── QueryError
├── ValidationError
├── AIError
└── ConfigError
```

### Error Recovery

1. **Connection Errors**: Retry with exponential backoff
2. **Query Errors**: Offer auto-fix via AI (future)
3. **AI Errors**: Fallback to simpler prompts
4. **Validation Errors**: Show suggestions

## Performance Optimizations

### 1. Schema Caching
- Cache TTL: 5 minutes
- Reduces DB round trips
- Invalidate on schema changes

### 2. Table Selection
- Limit to 10 tables max
- Reduces AI context size
- Faster response times

### 3. Query Timeout
- Default: 30 seconds
- Prevents hanging queries
- Configurable per query

### 4. Memory Management
- Circular buffer (50 queries)
- Automatic cleanup
- Efficient search

## Security Features

### 1. Query Validation
- Dangerous keyword detection
- Pattern matching for destructive ops
- Safe mode enforcement

### 2. Confirmation Prompts
- Required for DELETE, DROP, TRUNCATE
- Required for UPDATE without WHERE
- Bypass in non-interactive mode

### 3. Read-Only Mode (Future)
- Block all write operations
- Useful for production databases
- Configurable per connection

## Configuration

### Environment Variables

```env
# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Database
MAX_SCHEMA_TABLES=50
QUERY_TIMEOUT=30000

# Application
LOG_LEVEL=info
ENABLE_MEMORY=true
```

### Runtime Configuration

```typescript
{
  ollama: {
    baseUrl: string,
    model: string,
    temperature: number
  },
  database: {
    maxSchemaTables: number,
    queryTimeout: number,
    enableCache: boolean
  },
  app: {
    logLevel: 'debug' | 'info' | 'warn' | 'error',
    enableMemory: boolean,
    memorySize: number,
    safeMode: boolean,
    autoFix: boolean
  }
}
```

## Testing Strategy

### Unit Tests
- Helpers (parsing, formatting)
- Validators (syntax, security)
- Formatters (output rendering)

### Integration Tests
- Database connections
- Schema extraction
- Query execution

### E2E Tests
- Full query flow
- Error scenarios
- Edge cases

## Future Enhancements

### Phase 1 (Current)
- ✅ Multi-database support
- ✅ Natural language to SQL
- ✅ Query validation
- ✅ Memory system

### Phase 2
- [ ] Auto query fixing
- [ ] Query optimization suggestions
- [ ] Batch query execution
- [ ] Export results (CSV, JSON)

### Phase 3
- [ ] Query templates
- [ ] Visual query builder
- [ ] Performance analytics
- [ ] Multi-database queries

### Phase 4
- [ ] Cloud database support
- [ ] Team collaboration
- [ ] Query sharing
- [ ] Advanced security features

## Dependencies

### Core
- `knex`: SQL query builder
- `mysql2`, `pg`, `sqlite3`, `mssql`: Database drivers
- `commander`: CLI framework
- `inquirer`: Interactive prompts

### AI
- Native `fetch` for Ollama API

### Utilities
- `chalk`: Terminal colors
- `cli-table3`: Table rendering
- `ora`: Spinners
- `zod`: Schema validation

### Development
- `typescript`: Type safety
- `tsx`: TypeScript execution
- `vitest`: Testing framework

## Comparison with Claude Code

### Similarities
- Modular architecture
- Tool-based system
- Permission validation
- Memory/context management
- CLI-first design

### Differences
- **Simpler**: Focused on database queries only
- **Ollama**: Local AI instead of API
- **Specialized**: SQL-specific optimizations
- **Lightweight**: Fewer dependencies

## Contributing

See project structure:
```
DBx/
├── src/
│   ├── commands/     # CLI commands
│   ├── core/         # Core business logic
│   ├── services/     # External services
│   ├── types/        # TypeScript types
│   └── utils/        # Utilities
├── tests/            # Test files
├── examples/         # Usage examples
└── README.md         # Documentation
```

Follow patterns from Claude Code:
- Single responsibility per module
- Clear interfaces
- Comprehensive error handling
- Extensive logging
