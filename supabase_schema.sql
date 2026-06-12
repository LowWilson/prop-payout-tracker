-- Supabase SQL Editorでこのまま実行

create table if not exists prop_firms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  firm_id uuid references prop_firms(id) on delete cascade,
  firm_name text,
  amount numeric not null,
  payout_date date,
  memo text,
  created_at timestamptz not null default now()
);

alter table prop_firms enable row level security;
alter table payouts enable row level security;

drop policy if exists "Users can view own prop firms" on prop_firms;
drop policy if exists "Users can insert own prop firms" on prop_firms;
drop policy if exists "Users can update own prop firms" on prop_firms;
drop policy if exists "Users can delete own prop firms" on prop_firms;

drop policy if exists "Users can view own payouts" on payouts;
drop policy if exists "Users can insert own payouts" on payouts;
drop policy if exists "Users can update own payouts" on payouts;
drop policy if exists "Users can delete own payouts" on payouts;

create policy "Users can view own prop firms"
on prop_firms for select
using (auth.uid() = user_id);

create policy "Users can insert own prop firms"
on prop_firms for insert
with check (auth.uid() = user_id);

create policy "Users can update own prop firms"
on prop_firms for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own prop firms"
on prop_firms for delete
using (auth.uid() = user_id);

create policy "Users can view own payouts"
on payouts for select
using (auth.uid() = user_id);

create policy "Users can insert own payouts"
on payouts for insert
with check (auth.uid() = user_id);

create policy "Users can update own payouts"
on payouts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own payouts"
on payouts for delete
using (auth.uid() = user_id);
