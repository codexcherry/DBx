# Sample Queries

## Basic Queries

```bash
# List all users
npm run dev ask "show me all users"

# Count records
npm run dev ask "how many orders do we have?"

# Find specific records
npm run dev ask "find users with email containing gmail"
```

## Aggregation Queries

```bash
# Sum and average
npm run dev ask "what is the total revenue?"
npm run dev ask "average order amount by customer"

# Group by
npm run dev ask "count orders by status"
npm run dev ask "revenue by month for last year"
```

## Join Queries

```bash
# Simple joins
npm run dev ask "show orders with customer names"
npm run dev ask "list products and their categories"

# Complex joins
npm run dev ask "find customers who ordered product X"
npm run dev ask "show users with their total order count"
```

## Filtering Queries

```bash
# Date filters
npm run dev ask "orders from last 30 days"
npm run dev ask "users created this month"

# Conditional filters
npm run dev ask "active users with more than 5 orders"
npm run dev ask "products with price between 10 and 50"
```

## Advanced Queries

```bash
# Subqueries
npm run dev ask "customers who haven't ordered in 90 days"
npm run dev ask "products that have never been ordered"

# Window functions
npm run dev ask "top 10 customers by revenue"
npm run dev ask "rank products by sales"
```

## Follow-up Queries

```bash
# First query
npm run dev ask "show all orders"

# Follow-up (uses context)
npm run dev ask "filter those by status pending"
npm run dev ask "group them by customer"
npm run dev ask "sort by date descending"
```

## Utility Commands

```bash
# Dry run (validate without executing)
npm run dev ask "delete old records" --dry-run

# Explain query plan
npm run dev ask "complex join query" --explain

# View history
npm run dev history

# Show schema
npm run dev schema users
```
