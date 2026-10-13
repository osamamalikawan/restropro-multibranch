create table public.chains (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table public.chain_members (
  chain_id uuid not null references public.chains(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager')),
  created_at timestamptz not null default now(), primary key (chain_id, user_id));
create table public.chain_branches (
  chain_id uuid not null references public.chains(id) on delete cascade,
  restaurant_id uuid not null unique references public.restaurants(id) on delete cascade,
  branch_name text, created_at timestamptz not null default now(), primary key (chain_id, restaurant_id));
alter table public.chains enable row level security;
alter table public.chain_members enable row level security;
alter table public.chain_branches enable row level security;
create policy "members read own chain" on public.chains for select using (id in (select chain_id from public.chain_members where user_id = auth.uid()));
create policy "members read own membership" on public.chain_members for select using (user_id = auth.uid());
create policy "members read own branches" on public.chain_branches for select using (chain_id in (select chain_id from public.chain_members where user_id = auth.uid()));
-- Link an owner (run in the SQL editor):
-- insert into chains(name) values ('My Chain') returning id;
-- insert into chain_members(chain_id,user_id) values ('<chain id>','<auth user id>');
-- insert into chain_branches(chain_id,restaurant_id,branch_name) values ('<chain id>','<restaurant id>','Gulgasht');
