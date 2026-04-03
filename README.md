# DBx - AI-Powered Database Intelligence Assistant

<div align="center">

![DBx Screenshot](assets/s1.jpeg)

**A beautiful, interactive CLI tool that converts natural language to SQL using AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-purple.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-purple.svg)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Powered-purple.svg)](https://ollama.ai)

</div>

---

## ✨ Features

**DBx** is an AI-powered database intelligence assistant with a stunning purple-themed interface inspired by JARVIS. Connect to any SQL database, ask questions in plain English, and get instant results!

### 🎯 Core Capabilities
- 🔌 **Multi-Database Support**: MySQL, PostgreSQL, SQLite, MSSQL
- 🧠 **Natural Language to SQL**: Convert plain English to SQL queries using Ollama
- 💬 **Interactive REPL Mode**: Persistent connection with context-aware conversations
- 🔍 **Smart Schema Analysis**: Automatically extracts and understands database structure
- ⚡ **Intelligent Table Selection**: Only loads relevant tables for your query
- 🛡️ **Query Validation**: Prevents dangerous operations (DELETE, DROP, TRUNCATE)
- 📊 **Beautiful Output**: Purple-themed tables with syntax highlighting
- 🧠 **Context Memory**: Remembers previous queries for follow-up questions
- 🌐 **Cloud AI Support**: Use Ollama cloud models to save system resources

### 🚀 Advanced Features
- Query simulation and preview
- Multi-step query planning
- Schema-aware suggestions
- Query explanation mode
- Connection management
- Safe execution with confirmations
- Auto query fixing

## 📸 Screenshots

The screenshot above shows DBx in action:
- Beautiful purple ASCII art logo
- Connected to MySQL database
- Natural language query: "create a table called orders with id, name, date, and amount"
- AI-generated SQL with explanation
- Query execution with results
- Context-aware follow-up queries

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Ollama installed and running ([Install Ollama](https://ollama.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/codexcherry/dbx.git
cd dbx

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start Ollama (if not running)
ollama serve

# Pull a model (choose one)
ollama pull qwen2.5-coder:7b  # Local, great for SQL
# or
ollama run qwen3.5:cloud      # Cloud, saves system resources
```

### Usage

Start the interactive REPL:

```bash
npm run dev
```

Then connect and query:

```bash
   ██████╗ ██████╗ ██╗  ██╗
   ██╔══██╗██╔══██╗╚██╗██╔╝
   ██║  ██║██████╔╝ ╚███╔╝
   ██║  ██║██╔══██╗ ██╔██╗
   ██████╔╝██████╔╝██╔╝ ██╗
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝

   Database Intelligence Assistant
   Powered by Ollama AI

✓ Ollama connected (qwen3.5:cloud)

dbx > connect mysql://root:password@localhost:3306/mydb
✓ Connected to mysql database
✓ Schema loaded: 38 tables

dbx > show me all users
✓ Selected 1 tables: users
✓ Plan created (select)
✓ SQL generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT * FROM users LIMIT 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fetches all user records

✓ Query executed in 15ms

┌────┬──────────┬─────────────────────┬────────────┐
│ id │ name     │ email               │ created_at │
├────┼──────────┼─────────────────────┼────────────┤
│ 1  │ John Doe │ john@example.com    │ 2024-01-01 │
│ 2  │ Jane Doe │ jane@example.com    │ 2024-01-02 │
└────┴──────────┴─────────────────────┴────────────┘

2 rows returned

dbx > filter those by name containing John
[Uses context from previous query!]
```

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- [Usage Guide](USAGE.md) - Detailed usage examples
- [Architecture](ARCHITECTURE.md) - Technical deep-dive
- [Project Summary](PROJECT_SUMMARY.md) - Complete overview

## 🎨 Why DBx?

- **🎨 Beautiful UI**: Purple-themed, JARVIS-like interactive experience
- **💬 Interactive**: Persistent connection, context-aware conversations
- **🧠 Smart**: AI-powered query generation with Ollama
- **🛡️ Safe**: Comprehensive validation and confirmation prompts
- **⚡ Fast**: Smart table selection, schema caching
- **🔒 Private**: Local AI with Ollama (no API calls)
- **🌐 Cloud Option**: Use cloud models to save system resources
- **📚 Well-Documented**: Extensive guides and examples

## 💡 Examples

### Basic Queries
```bash
dbx > show all tables
dbx > count users
dbx > find active orders
```

### Complex Queries
```bash
dbx > show me revenue by month for the last year
dbx > which products have never been ordered?
dbx > find duplicate email addresses in users table
```

### Follow-up Queries (Context-Aware!)
```bash
dbx > show me all orders
dbx > filter those by status pending
dbx > group them by customer
dbx > sort by date descending
```

### Database Operations
```bash
dbx > create a users table with id, name, email, and created_at
dbx > add a column phone to users table
dbx > show me the schema of orders table
```

## 🔧 Configuration

Edit `.env` file:

```env
# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:cloud

# Alternative models:
# OLLAMA_MODEL=qwen2.5-coder:7b   # Local, code-focused
# OLLAMA_MODEL=llama3.2           # Local, general purpose
# OLLAMA_MODEL=glm-5:cloud        # Cloud, code generation

# Application settings
LOG_LEVEL=info
MAX_SCHEMA_TABLES=50
QUERY_TIMEOUT=30000
ENABLE_MEMORY=true
```

## 🛡️ Safety Features

- **Dangerous Query Detection**: Warns before DELETE, DROP, TRUNCATE operations
- **Confirmation Prompts**: Requires explicit confirmation for destructive operations
- **Query Preview**: See generated SQL before execution
- **Syntax Validation**: Checks for SQL syntax errors
- **Performance Warnings**: Alerts about missing LIMIT, SELECT *, etc.

## 🏗️ Architecture

DBx is built with a modular architecture inspired by Claude Code:

```
CLI Layer (Commander.js)
    ↓
Interactive REPL (Inquirer)
    ↓
Core Modules
├── Connection Manager (Knex.js)
├── Schema Engine (Caching)
├── Table Selector (Smart filtering)
├── Query Planner (AI)
├── SQL Generator (AI)
├── Query Validator (Safety)
├── Query Executor (Timeout handling)
└── Memory System (Context)
    ↓
Services
├── Ollama Service (AI)
└── Result Formatter (Pretty output)
```

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Run tests
npm test
```

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **AI**: Ollama (local & cloud models)
- **Database**: Knex.js with multiple drivers (MySQL, PostgreSQL, SQLite, MSSQL)
- **CLI**: Commander.js, Inquirer
- **UI**: Chalk, Ora, cli-table3
- **Validation**: Zod

## Architecture

```
CLI Layer
    ↓
Command Parser (Commander.js)
    ↓
Connection Manager
    ↓
Schema Engine → Table Selector
    ↓
AI Query Planner (Ollama)
    ↓
SQL Generator
    ↓
Query Validator
    ↓
Query Executor
    ↓
Result Formatter
    ↓
Memory System
```

## Project Structure

```
DBx/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── types/                   # TypeScript types
│   │   ├── database.ts
│   │   ├── query.ts
│   │   └── config.ts
│   ├── core/                    # Core modules
│   │   ├── connection.ts        # Database connection manager
│   │   ├── schema.ts            # Schema extraction engine
│   │   ├── selector.ts          # Smart table selector
│   │   ├── planner.ts           # AI query planner
│   │   ├── generator.ts         # SQL generator
│   │   ├── validator.ts         # Query validator
│   │   ├── executor.ts          # Query executor
│   │   └── memory.ts            # Context memory system
│   ├── services/                # External services
│   │   ├── ollama.ts            # Ollama AI integration
│   │   └── formatter.ts         # Result formatter
│   ├── utils/                   # Utilities
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── helpers.ts
│   └── commands/                # CLI commands
│       ├── connect.ts
│       ├── ask.ts
│       ├── schema.ts
│       └── tables.ts
├── tests/                       # Test files
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Examples

### Basic Queries
```bash
dbx ask "show all tables"
dbx ask "count users"
dbx ask "find active orders"
```

### Complex Queries
```bash
dbx ask "show me revenue by month for the last year"
dbx ask "which products have never been ordered?"
dbx ask "find duplicate email addresses in users table"
```

### Follow-up Queries
```bash
dbx ask "show me all orders"
dbx ask "filter those by status pending"  # Uses context from previous query
dbx ask "group them by customer"
```

## Safety Features

- **Dangerous Query Detection**: Warns before DELETE, DROP, TRUNCATE operations
- **Confirmation Prompts**: Requires explicit confirmation for destructive operations
- **Read-Only Mode**: Option to run in read-only mode
- **Query Preview**: See generated SQL before execution
- **Rollback Support**: Transaction support for safe operations

## Configuration

Edit `.env` file:

```env
# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Application settings
LOG_LEVEL=info
MAX_SCHEMA_TABLES=50
QUERY_TIMEOUT=30000
ENABLE_MEMORY=true
```

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Run tests
npm test
```

## Troubleshooting

### Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

## Support

For issues and questions, please open a GitHub issue.
