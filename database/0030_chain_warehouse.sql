-- Run after 0029_chains.sql. Central warehouse, transfers and the sales summary used by the chain app.
create table if not exists public.chain_warehouse_items (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.chains(id) on delete cascade,
  name text not null, unit text not null default 'pcs', category text,
  quantity numeric not null default 0 check (quantity >= 0),
  min_stock numeric not null default 0, cost numeric not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists ux_chain_wh_item on public.chain_warehouse_items (chain_id, lower(name), unit);
create table if not exists public.chain_warehouse_movements (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.chains(id) on delete cascade,
  item_name text not null, unit text, kind text not null check (kind in ('receive','transfer')),
  qty numeric not null, unit_cost numeric, restaurant_id uuid references public.restaurants(id) on delete set null,
  note text, created_by text, created_at timestamptz not null default now());
create index if not exists ix_chain_wh_mov on public.chain_warehouse_movements (chain_id, created_at desc);
alter table public.chain_warehouse_items enable row level security;
alter table public.chain_warehouse_movements enable row level security;
drop policy if exists "members read wh items" on public.chain_warehouse_items;
drop policy if exists "members read wh moves" on public.chain_warehouse_movements;
create policy "members read wh items" on public.chain_warehouse_items for select using (chain_id in (select chain_id from public.chain_members where user_id = auth.uid()));
create policy "members read wh moves" on public.chain_warehouse_movements for select using (chain_id in (select chain_id from public.chain_members where user_id = auth.uid()));

create or replace function public.chain_warehouse_receive(p_chain uuid, p_item uuid, p_qty numeric, p_unit_cost numeric, p_note text, p_by text)
returns void language plpgsql as $$
declare w public.chain_warehouse_items;
begin
  if p_qty <= 0 then raise exception 'Quantity must be positive'; end if;
  select * into w from public.chain_warehouse_items where id = p_item and chain_id = p_chain for update;
  if not found then raise exception 'Warehouse item not found'; end if;
  update public.chain_warehouse_items set
    cost = case when quantity + p_qty > 0 then round(((quantity * cost) + (p_qty * p_unit_cost)) / (quantity + p_qty), 2) else p_unit_cost end,
    quantity = quantity + p_qty, updated_at = now() where id = p_item;
  insert into public.chain_warehouse_movements (chain_id, item_name, unit, kind, qty, unit_cost, note, created_by)
    values (p_chain, w.name, w.unit, 'receive', p_qty, p_unit_cost, p_note, p_by);
end $$;

create or replace function public.chain_transfer_stock(p_chain uuid, p_item uuid, p_restaurant uuid, p_qty numeric, p_note text, p_by text)
returns void language plpgsql as $$
declare w public.chain_warehouse_items; inv uuid;
begin
  if p_qty <= 0 then raise exception 'Quantity must be positive'; end if;
  if not exists (select 1 from public.chain_branches where chain_id = p_chain and restaurant_id = p_restaurant) then raise exception 'Branch is not in this chain'; end if;
  select * into w from public.chain_warehouse_items where id = p_item and chain_id = p_chain for update;
  if not found then raise exception 'Warehouse item not found'; end if;
  if w.quantity < p_qty then raise exception 'Only % % left in the warehouse', w.quantity, w.unit; end if;
  select id into inv from public.inventory_items where restaurant_id = p_restaurant and lower(name) = lower(w.name) and unit = w.unit limit 1;
  if inv is null then
    insert into public.inventory_items (restaurant_id, name, unit, current_stock, min_stock, cost, item_type, category)
      values (p_restaurant, w.name, w.unit, 0, 0, w.cost, 'ready_made', w.category) returning id into inv;
  end if;
  update public.inventory_items set current_stock = current_stock + p_qty, cost = case when w.cost > 0 then w.cost else cost end, updated_at = now() where id = inv;
  update public.chain_warehouse_items set quantity = quantity - p_qty, updated_at = now() where id = p_item;
  insert into public.chain_warehouse_movements (chain_id, item_name, unit, kind, qty, unit_cost, restaurant_id, note, created_by)
    values (p_chain, w.name, w.unit, 'transfer', p_qty, w.cost, p_restaurant, p_note, p_by);
end $$;

create or replace function public.chain_sales_summary(p_restaurants uuid[], p_from date, p_to date)
returns table (restaurant_id uuid, day date, order_type text, orders bigint, total numeric) language sql stable as $$
  select s.restaurant_id, (s.created_at at time zone 'Asia/Karachi')::date, s.order_type, count(*), coalesce(sum(s.total), 0)
  from public.sales s
  where s.restaurant_id = any(p_restaurants) and s.status = 'completed'
    and s.created_at >= (p_from::timestamp at time zone 'Asia/Karachi')
    and s.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Karachi')
  group by 1, 2, 3
$$;
revoke execute on function public.chain_warehouse_receive, public.chain_transfer_stock, public.chain_sales_summary from public, anon, authenticated;
