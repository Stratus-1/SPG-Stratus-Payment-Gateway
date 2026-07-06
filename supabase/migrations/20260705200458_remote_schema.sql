create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'income', 'cost_of_sales', 'expense')),
  normal_balance text not null check (normal_balance in ('debit', 'credit')),
  parent_account_id uuid references public.accounts(id) on delete restrict,
  description text,
  is_active boolean not null default true,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_type_idx on public.accounts (account_type);
create index if not exists accounts_parent_idx on public.accounts (parent_account_id);
create index if not exists accounts_active_idx on public.accounts (is_active);

insert into public.accounts (code, name, account_type, normal_balance, description, is_system, sort_order)
values
  ('1000', 'Assets', 'asset', 'debit', 'Root account for company assets.', true, 1000),
  ('2000', 'Liabilities', 'liability', 'credit', 'Root account for company liabilities.', true, 2000),
  ('3000', 'Equity', 'equity', 'credit', 'Root account for owner equity and retained earnings.', true, 3000),
  ('4000', 'Income', 'income', 'credit', 'Root account for revenue accounts.', true, 4000),
  ('5000', 'Cost of Sales', 'cost_of_sales', 'debit', 'Direct costs linked to client delivery and resale.', true, 5000),
  ('6000', 'Operating Expenses', 'expense', 'debit', 'Root account for operating expenses.', true, 6000)
on conflict (code) do update
set
  name = excluded.name,
  account_type = excluded.account_type,
  normal_balance = excluded.normal_balance,
  description = excluded.description,
  is_system = excluded.is_system,
  sort_order = excluded.sort_order;

insert into public.accounts (
  code,
  name,
  account_type,
  normal_balance,
  parent_account_id,
  description,
  is_system,
  sort_order
)
values
  ('1010', 'Cash at Bank', 'asset', 'debit', (select id from public.accounts where code = '1000'), 'Primary operating bank account.', true, 1010),
  ('1100', 'Accounts Receivable', 'asset', 'debit', (select id from public.accounts where code = '1000'), 'Amounts owed by clients for issued invoices.', true, 1100),
  ('1200', 'VAT Input / Claimable', 'asset', 'debit', (select id from public.accounts where code = '1000'), 'VAT claimable on valid supplier tax invoices.', true, 1200),
  ('1300', 'Hardware Inventory', 'asset', 'debit', (select id from public.accounts where code = '1000'), 'Hardware purchased for resale or client installations before delivery.', true, 1300),
  ('2010', 'Accounts Payable', 'liability', 'credit', (select id from public.accounts where code = '2000'), 'Supplier bills and unpaid expenses.', true, 2010),
  ('2100', 'VAT Output / Payable', 'liability', 'credit', (select id from public.accounts where code = '2000'), 'VAT charged to clients on taxable supplies.', true, 2100),
  ('2200', 'VAT Control', 'liability', 'credit', (select id from public.accounts where code = '2000'), 'Net VAT payable or receivable after period close.', true, 2200),
  ('2300', 'Customer Deposits / Deferred Income', 'liability', 'credit', (select id from public.accounts where code = '2000'), 'Client deposits received before delivery or invoicing completion.', true, 2300),
  ('3010', 'Owner Equity', 'equity', 'credit', (select id from public.accounts where code = '3000'), 'Founder/shareholder capital introduced.', true, 3010),
  ('3100', 'Retained Earnings', 'equity', 'credit', (select id from public.accounts where code = '3000'), 'Accumulated profits retained by the company.', true, 3100),
  ('4010', 'Sales Revenue', 'income', 'credit', (select id from public.accounts where code = '4000'), 'General sales revenue.', true, 4010),
  ('4100', 'Subscription Revenue', 'income', 'credit', (select id from public.accounts where code = '4000'), 'Recurring SaaS and support subscription revenue.', true, 4100),
  ('4200', 'Integration Services Revenue', 'income', 'credit', (select id from public.accounts where code = '4000'), 'Implementation, automation, and integration services revenue.', true, 4200),
  ('4300', 'Hardware Revenue', 'income', 'credit', (select id from public.accounts where code = '4000'), 'Hardware resale revenue, including Shelly and automation equipment.', true, 4300),
  ('4400', 'Installation Revenue', 'income', 'credit', (select id from public.accounts where code = '4000'), 'Electrical or field installation revenue charged to clients.', true, 4400),
  ('5010', 'Hardware Cost of Sales', 'cost_of_sales', 'debit', (select id from public.accounts where code = '5000'), 'Direct hardware costs for client projects.', true, 5010),
  ('5100', 'Contractor / Installation Cost of Sales', 'cost_of_sales', 'debit', (select id from public.accounts where code = '5000'), 'Electrician, contractor, and subcontracted installation costs.', true, 5100),
  ('5200', 'Payment Processing Cost of Sales', 'cost_of_sales', 'debit', (select id from public.accounts where code = '5000'), 'Direct payment gateway and processing costs.', true, 5200),
  ('6010', 'Software Subscriptions', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Internal SaaS tools and subscriptions.', true, 6010),
  ('6100', 'Cloud Infrastructure', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Hosting, cloud, database, and infrastructure costs.', true, 6100),
  ('6200', 'Payroll & Contractors', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Staff, payroll, contractors, and operational labour.', true, 6200),
  ('6300', 'Marketing', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Advertising, marketing, and customer acquisition spend.', true, 6300),
  ('6400', 'Travel', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Travel, mileage, lodging, and related business travel.', true, 6400),
  ('6500', 'Office', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Office, admin, stationery, equipment, and general overhead.', true, 6500),
  ('6600', 'Professional Services', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Accounting, legal, consulting, and advisory fees.', true, 6600),
  ('6700', 'Bank Fees', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'Bank charges and account fees.', true, 6700),
  ('6800', 'Tax & Compliance', 'expense', 'debit', (select id from public.accounts where code = '6000'), 'CIPC, SARS, compliance, filing, and statutory costs.', true, 6800)
on conflict (code) do update
set
  name = excluded.name,
  account_type = excluded.account_type,
  normal_balance = excluded.normal_balance,
  parent_account_id = excluded.parent_account_id,
  description = excluded.description,
  is_system = excluded.is_system,
  sort_order = excluded.sort_order;

alter table public.expenses add column if not exists account_id uuid references public.accounts(id) on delete restrict;
alter table public.income add column if not exists account_id uuid references public.accounts(id) on delete restrict;
alter table public.recurring_costs add column if not exists account_id uuid references public.accounts(id) on delete restrict;
alter table public.budgets add column if not exists account_id uuid references public.accounts(id) on delete restrict;

create index if not exists expenses_account_idx on public.expenses (account_id);
create index if not exists income_account_idx on public.income (account_id);
create index if not exists recurring_costs_account_idx on public.recurring_costs (account_id);
create index if not exists budgets_account_idx on public.budgets (account_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

drop policy if exists "Authenticated users can manage accounts" on public.accounts;
create policy "Authenticated users can manage accounts"
on public.accounts for all
to authenticated
using (true)
with check (true);

update public.expenses
set account_id = case
  when category = 'Software & SaaS' then (select id from public.accounts where code = '6010')
  when category = 'Cloud Infrastructure' then (select id from public.accounts where code = '6100')
  when category = 'Payroll & Contractors' then (select id from public.accounts where code = '6200')
  when category = 'Marketing' then (select id from public.accounts where code = '6300')
  when category = 'Travel' then (select id from public.accounts where code = '6400')
  when category = 'Office' then (select id from public.accounts where code = '6500')
  when category = 'Professional Services' then (select id from public.accounts where code = '6600')
  when category = 'Bank Fees' then (select id from public.accounts where code = '6700')
  when category = 'Tax & Compliance' then (select id from public.accounts where code = '6800')
  else (select id from public.accounts where code = '6500')
end
where account_id is null;

update public.income
set account_id = case
  when category in ('Retainers', 'Support') then (select id from public.accounts where code = '4100')
  when category in ('Software Development', 'Consulting', 'SquashHub Integrations') then (select id from public.accounts where code = '4200')
  when category = 'Licensing' then (select id from public.accounts where code = '4100')
  else (select id from public.accounts where code = '4010')
end
where account_id is null;

update public.recurring_costs
set account_id = case
  when category = 'Cloud Infrastructure' then (select id from public.accounts where code = '6100')
  when category = 'Bank Fees' then (select id from public.accounts where code = '6700')
  else (select id from public.accounts where code = '6010')
end
where account_id is null;

update public.budgets
set account_id = case
  when category = 'Software & SaaS' then (select id from public.accounts where code = '6010')
  when category = 'Cloud Infrastructure' then (select id from public.accounts where code = '6100')
  when category = 'Payroll & Contractors' then (select id from public.accounts where code = '6200')
  when category = 'Marketing' then (select id from public.accounts where code = '6300')
  when category = 'Travel' then (select id from public.accounts where code = '6400')
  when category = 'Office' then (select id from public.accounts where code = '6500')
  when category = 'Professional Services' then (select id from public.accounts where code = '6600')
  when category = 'Bank Fees' then (select id from public.accounts where code = '6700')
  when category = 'Tax & Compliance' then (select id from public.accounts where code = '6800')
  else (select id from public.accounts where code = '6500')
end
where account_id is null;
