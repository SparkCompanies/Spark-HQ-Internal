-- BENEFITS_v1: one-row table behind the Benefits & PTO tab (worker route /benefits-info).
-- Run once in Supabase > SQL editor. The worker writes with the service key, so no RLS policies are needed
-- beyond keeping the table locked to anon (RLS on, no policies = no direct access from the browser).
create table if not exists public.spark_hq_benefits_info (
  id          int primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
alter table public.spark_hq_benefits_info enable row level security;
