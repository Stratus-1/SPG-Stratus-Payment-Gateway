-- Confirms the main internal finance app login user.
-- Run this in the Supabase SQL editor only after the Auth user exists.
--
-- User created via public Auth signup:
-- admin@stratsol.co.za

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmation_token = '',
  confirmation_sent_at = null,
  updated_at = now()
where lower(email) = 'admin@stratsol.co.za';

