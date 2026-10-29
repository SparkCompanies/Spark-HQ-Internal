-- MY_BLUEPRINT_v1: producers acknowledge their published blueprint (worker route /blueprints/ack).
-- Run once in Supabase > SQL editor. RLS on with no policies: only the worker (service key) reads or writes.
create table if not exists public.spark_hq_blueprint_acks (
  id bigserial primary key,
  email text not null,
  blueprint_id uuid not null,
  version text,
  acked_at timestamptz not null default now()
);
create index if not exists spark_hq_blueprint_acks_email on public.spark_hq_blueprint_acks (email, blueprint_id);
alter table public.spark_hq_blueprint_acks enable row level security;
