# Order Processing Backend

A production-grade backend system for multi-tenant order processing built with Next.js, Supabase PostgreSQL, and TypeScript. This system prioritizes data integrity, concurrency safety, and security.

## Architecture Overview

This is a **backend-only** system with no frontend UI. All business logic is implemented as PostgreSQL RPC functions executed within atomic transactions.

### Why RPC Functions Instead of Application Logic?

1. **Transaction Safety**: All operations execute in a single database transaction, ensuring consistency
2. **Race Condition Prevention**: `SELECT ... FOR UPDATE` row locks prevent concurrent modification conflicts
3. **Tenant Isolation**: RLS policies enforce business_id filtering at the database layer, not application code
4. **Atomicity**: All-or-nothing semantics: if validation fails anywhere, the entire transaction rolls back

## Database Schema

### Tables

**businesses**

- `id` (UUID, PK) - Tenant identifier
- `name` (TEXT) - Business name

**customers**

- `id` (UUID, PK)
- `business_id` (UUID, FK) - Tenant isolation
- `name` (TEXT)
- `credit_limit` (DECIMAL) - Maximum allowed balance
- `created_at` (TIMESTAMP)

**products**

- `id` (UUID, PK)
- `business_id` (UUID, FK)
- `name` (TEXT)
- `stock` (INTEGER)
- `price` (DECIMAL)
- `created_at` (TIMESTAMP)

**customer_balances**

- `customer_id` (UUID, PK/FK)
- `business_id` (UUID, FK)
- `balance` (DECIMAL) - Current outstanding balance
- `updated_at` (TIMESTAMP)

**orders**

- `id` (UUID, PK)
- `business_id` (UUID, FK)
- `customer_id` (UUID, FK)
- `total_amount` (DECIMAL)
- `created_at` (TIMESTAMP)

**order_items**

- `id` (UUID, PK)
- `order_id` (UUID, FK)
- `product_id` (UUID, FK)
- `quantity` (INTEGER)
- `unit_price` (DECIMAL)
- `created_at` (TIMESTAMP)

**Key Design Decision**: Every table includes `business_id` for multi-tenant isolation. No table relies solely on foreign key relationships for tenant safety.

## Row Level Security (RLS)

All tables have RLS enabled. Users can only access rows where:

```sql
business_id = auth.jwt()->>'business_id'
```

A helper function extracts the business_id from the JWT claims:

```sql
CREATE OR REPLACE FUNCTION get_current_business_id() RETURNS UUID AS $$
  SELECT (auth.jwt()->>'business_id')::uuid
$$ LANGUAGE SQL STABLE;
```

### RLS Policies

Each table has policies for SELECT, INSERT, and UPDATE (where applicable) that filter by business_id.

## Transaction Safety: The `process_purchase` RPC

The core business logic is implemented as a single PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION process_purchase(
  p_business_id UUID,
  p_customer_id UUID,
  p_items item
) RETURNS item
```

### How It Works

1. **Lock customer balance** (SELECT ... FOR UPDATE)

   - Prevents concurrent purchases from the same customer simultaneously executing without seeing each other's updates

2. **Lock each product** (SELECT ... FOR UPDATE)

   - Prevents overselling: another purchase can't decrement stock while we're validating stock

3. **Validate credit limit**

   - Check: `(current_balance + purchase_amount) <= credit_limit`
   - If validation fails, raise exception → automatic rollback

4. **Validate product stock**

   - For each item, verify: `product.stock >= item.quantity`
   - If validation fails, raise exception → automatic rollback

5. **Insert order and order_items**

   - Create order record with total_amount
   - Create one row per item with product_id, quantity, unit_price

6. **Decrement product stock**

   - `UPDATE products SET stock = stock - quantity`

7. **Increment customer balance**
   - `UPDATE customer_balances SET balance = balance + total_amount`

### Why Row Locking Matters

Without row locks, this race condition is possible:

```
Thread 1: SELECT balance = 900, credit_limit = 1000
Thread 2: SELECT balance = 900, credit_limit = 1000
Thread 1: INSERT order for $500 → balance = 1400 (over limit!)
Thread 2: INSERT order for $500 → balance = 1400 (over limit!)
```

With `SELECT ... FOR UPDATE`, Thread 2 waits until Thread 1 commits, then sees the updated balance.

### Atomicity Guarantee

If _any_ validation fails (credit limit, stock), the entire transaction rolls back:

- No order is created
- No balance is updated
- No stock is decremented
- Client receives error message

This prevents partial/inconsistent state.

## API Endpoints

### POST /api/purchase

Process a purchase order. Calls the `process_purchase` RPC.

**Request Headers:**

- `x-business-id: <UUID>` - Tenant identifier (in production, from JWT)

**Request Body:**

```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "product_id": "650e8400-e29b-41d4-a716-446655440001",
      "quantity": 5,
      "unit_price": 100.0
    },
    {
      "product_id": "750e8400-e29b-41d4-a716-446655440002",
      "quantity": 2,
      "unit_price": 50.0
    }
  ]
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "order_id": "850e8400-e29b-41d4-a716-446655440003",
    "total_amount": 600.0,
    "customer_balance": 600.0
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Purchase exceeds credit limit. Current balance: 500, Purchase amount: 600, Credit limit: 1000"
}
```

### GET /api/customers/overdue

Retrieve customers with unpaid balances older than 30 days. Calls the `get_overdue_customers` RPC.

**Request Headers:**

- `x-business-id: <UUID>` - Tenant identifier

**Query Parameters:**

- `days=30` (optional, default 30) - Override the overdue threshold

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "customer_id": "550e8400-e29b-41d4-a716-446655440000",
      "customer_name": "Acme Corp",
      "balance": 5000.0,
      "oldest_order_date": "2024-12-10T10:30:00Z",
      "days_since_order": 35
    }
  ]
}
```

## Setup & Deployment

### Environment Variables

**Required (set in Vercel/deployment):**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `NEXT_PUBLIC_DEFAULT_BUSINESS_ID` - Default business_id for testing (or pass `x-business-id` header)

### Running Locally

1. Set environment variables in `.env.local`
2. Run database schema, RLS, and functions migrations in Supabase SQL editor:
   - `db/schema.sql`
   - `db/rls.sql`
   - `db/functions.sql`
3. Start the development server:
   ```bash
   npm run dev
   ```

### Testing with curl

```bash
# Create purchase
curl -X POST http://localhost:3000/api/purchase \
  -H "x-business-id: 550e8400-e29b-41d4-a716-446655440099" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "product_id": "650e8400-e29b-41d4-a716-446655440001",
        "quantity": 1,
        "unit_price": 100.00
      }
    ]
  }'

# Get overdue customers
curl "http://localhost:3000/api/customers/overdue" \
  -H "x-business-id: 550e8400-e29b-41d4-a716-446655440099"
```

## Concurrency & Performance

### Locking Strategy

- Row locks are held only during the transaction (milliseconds)
- PostgreSQL's MVCC (Multi-Version Concurrency Control) allows readers to proceed while writers are locked
- No table-level locks; only specific rows are locked

## Production Checklist

- [ ] Configure JWT claims in Supabase to include `business_id`
- [ ] Test RLS policies by querying as different authenticated users
- [ ] Load test `/api/purchase` with concurrent requests to verify lock handling
- [ ] Monitor database connections and lock times
- [ ] Set up database backups and point-in-time recovery
- [ ] Enable audit logging for compliance
- [ ] Deploy with proper error monitoring (Sentry, DataDog, etc.)

## Files

```
/app
  /api
    /purchase
      route.ts           # POST/GET purchase endpoint
    /customers
      /overdue
        route.ts         # GET overdue customers endpoint
/db
  schema.sql             # Table definitions and indexes
  rls.sql                # Row Level Security policies
  functions.sql          # RPC functions
/lib
  /supabase
    client.ts            # Singleton Supabase client
  /repositories
    customer.repo.ts     # Customer data access helpers
    product.repo.ts      # Product data access helpers
    order.repo.ts        # Order data access helpers
/types
  index.ts               # Shared TypeScript types
```

## Design Decisions Explained

### Why Not Use an ORM?

Raw SQL with Postgres RPC functions gives us:

- Precise control over transaction boundaries
- Direct access to row locking primitives
- Clear, auditable SQL for compliance
- Zero ORM serialization overhead
