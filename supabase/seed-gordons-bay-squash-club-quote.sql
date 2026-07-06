-- Gordon's Bay Squash Club quote seed.
-- Apply this after supabase/schema.sql has been run.
--
-- Source: /Users/user/Downloads/Quote GB.pdf
-- Quote: SSS-GBSC-2026-001
-- Date: 2026-06-24

insert into public.company_settings (id)
values (1)
on conflict (id) do nothing;

update public.company_settings
set
  income_categories = case
    when income_categories @> array['SquashHub Integrations']::text[]
      then income_categories
    else income_categories || array['SquashHub Integrations']::text[]
  end,
  projects_clients = case
    when projects_clients @> array['Gordon''s Bay Squash Club']::text[]
      then projects_clients
    else projects_clients || array['Gordon''s Bay Squash Club']::text[]
  end
where id = 1;

insert into public.income (
  date,
  client,
  description,
  invoice_number,
  category,
  account_id,
  amount_excl_vat,
  vat_amount,
  total_amount,
  payment_status,
  project,
  notes
)
select
  '2026-06-24'::date,
  'Gordon''s Bay Squash Club',
  'SquashHub court lighting and geyser automation integration with Shelly relay installation',
  'SSS-GBSC-2026-001',
  'SquashHub Integrations',
  (select id from public.accounts where code = '4200'),
  6549.09,
  982.36,
  7531.45,
  'sent',
  'Gordon''s Bay Squash Club',
  'Quote from Stratus Software Solutions to Gordon''s Bay Squash Club for SquashHub booking integration, court light automation, and geyser control.

Recommended option recorded:
- Option 2: Professional LAN Installation
- Shelly Pro 2PM DIN-rail mountable Wi-Fi relay with power monitoring: R2,701.35 incl VAT
- Ogemray Smart Relay 25A powered by Shelly for geyser control: R1,580.10 incl VAT
- Equipment total: R4,281.45 incl VAT
- Electrical installation estimate: R3,250.00 incl VAT
- Total quote value: R7,531.45 incl VAT
- Amount excl VAT: R6,549.09
- VAT: R982.36
- Deposit required at 50%: R3,765.73 incl VAT

Alternative option noted but not recorded as revenue to avoid double counting:
- Option 1: Standard WiFi Installation
- Equipment total: R3,123.40 incl VAT
- Electrical installation estimate: R3,250.00 incl VAT
- Total including electrical installation: R6,373.40 incl VAT
- Deposit required at 50%: R3,186.70 incl VAT

Payment terms:
- 50% deposit payable upon acceptance.
- Shelly equipment ordered upon receipt of deposit.
- Balance payable upon completion and commissioning.
- Prices include VAT.
- Quotation valid for 30 days from date of issue.

Important accounting note: this is a quote/sent opportunity, not confirmed paid income. Convert/update payment status only once accepted or paid.'
where not exists (
  select 1
  from public.income
  where invoice_number = 'SSS-GBSC-2026-001'
);
