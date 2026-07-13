-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This creates the table to store analysis history for logged-in users

create table if not exists analysis_history (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  analysis_id text not null,
  source_name text,
  source_code text not null,
  language text not null,
  total_smells integer not null default 0,
  overall_score integer not null default 0,
  smells jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now() not null
);

-- Create index for fast lookups by user
create index if not exists idx_analysis_history_user_id on analysis_history(user_id);

-- Create index for ordering by date
create index if not exists idx_analysis_history_created_at on analysis_history(created_at desc);

-- Enable Row Level Security (RLS) so users can only access their own data
alter table analysis_history enable row level security;

-- Policy: users can only see their own analyses
create policy "Users can view own analyses"
  on analysis_history for select
  using (auth.uid() = user_id);

-- Policy: users can insert their own analyses
create policy "Users can insert own analyses"
  on analysis_history for insert
  with check (auth.uid() = user_id);

-- Policy: users can delete their own analyses
create policy "Users can delete own analyses"
  on analysis_history for delete
  using (auth.uid() = user_id);

-- ── Chat usage quota table ──────────────────────────────────────────────────
create table if not exists chat_usage (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  usage_date date not null default current_date,
  count integer not null default 0,
  unique (user_id, usage_date)
);

create index if not exists idx_chat_usage_user_date on chat_usage(user_id, usage_date);

alter table chat_usage enable row level security;

create policy "Users can view own chat usage"
  on chat_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat usage"
  on chat_usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chat usage"
  on chat_usage for update
  using (auth.uid() = user_id);
