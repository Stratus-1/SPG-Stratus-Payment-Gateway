# Stratus Finance Control

Private internal finance management app for Stratus Software Solutions.

This is a single-company app, not a multi-tenant SaaS platform. There are no tenant tables, organization switchers, or customer-facing account boundaries.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Recharts
- CSV, Excel, and PDF exports

## Modules

- Dashboard: income, expenses, net profit/loss, VAT claimable/payable, burn rate, top expense categories, revenue vs expense chart, cash flow chart, SaaS recurring cost summary
- Chart of Accounts: structured assets, liabilities, equity, income, cost of sales, and expense accounts with normal debit/credit balances
- Scan: camera/file capture, OCR extraction, editable review, then save as expense, income, or recurring cost
- Expenses: CRUD, VAT calculation, receipt/invoice upload to private Supabase Storage
- Income: CRUD, VAT calculation, invoice/payment status tracking
- Recurring Costs: SaaS and service burn tracking
- Budget vs Actual: monthly category budgets with actuals calculated from expenses
- Reports: Profit & Loss, VAT, cash flow, expense breakdown, SaaS spend, exports
- Settings: company name, VAT rate, currency, categories, departments, projects/clients

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
cp .env.example .env.local
```

Set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

3. Run the database setup in the Supabase SQL editor.

Fast path:

```sql
-- File: supabase/full-setup.sql
-- Creates all finance tables, RLS policies, storage policies, confirms the main admin user,
-- and seeds the Gordon's Bay Squash Club quote.
```

Schema only:

```sql
-- File: supabase/schema.sql
```

Existing database upgrade:

```sql
-- File: supabase/migrations/20260705200458_remote_schema.sql
-- Adds the chart of accounts and account mappings to existing finance tables.
```

4. Optional seed data:

```sql
-- Run after schema.sql to add the Gordon's Bay Squash Club quote.
-- File: supabase/seed-gordons-bay-squash-club-quote.sql
```

5. Create at least one Supabase Auth user for internal finance access.

6. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Security Model

- Login is required via Supabase Auth.
- Next.js Proxy protects all app routes except `/login`.
- RLS allows authenticated internal users to manage finance data.
- Storage bucket `finance-attachments` is private and authenticated-only.
- Scanning uses in-browser OCR, so document text extraction runs locally in the browser before saving to Supabase.
- The app intentionally does not implement tenant isolation because it is for one internal company only.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
```

## Deployment

Deploy to Vercel and set the same Supabase environment variables in the Vercel project settings.
# SPG-Stratus-Payment-Gateway
# SPG-Stratus-Payment-Gateway
