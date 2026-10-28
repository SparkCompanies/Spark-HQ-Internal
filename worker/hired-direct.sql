-- HIRED_DIRECT_v1 — run once in Supabase (SQL editor) before turning HIRED_DIRECT_ENABLED on.
-- One row per Asymbl placement that was marked "Client Hired Direct" and nudged to a recruiter.
-- The worker reads/writes this with the service key; the row is also the recruiter's follow-up item in HQ.
create table if not exists public.spark_hq_hired_direct (
  placement_id     text primary key,
  placement_name   text,
  division         text,
  candidate_id     text,
  candidate_name   text,
  candidate_email  text,
  candidate_phone  text,
  address          jsonb,
  client           text,
  job_title        text,
  start_date       date,
  terminated_date  date,
  recruiter_email  text,
  recruiter_name   text,
  recruiter_via    text,           -- candidate owner | placement recruiter | placement owner | fallback
  sent_at          timestamptz not null default now(),
  called_at        timestamptz,
  card_sent_at     timestamptz,
  notes            text,
  updated_by       text
);
create index if not exists spark_hq_hired_direct_recruiter_idx on public.spark_hq_hired_direct (recruiter_email, sent_at desc);
alter table public.spark_hq_hired_direct enable row level security;
-- No policies on purpose: only the worker (service role) touches this table. The browser goes through /hired-direct.
