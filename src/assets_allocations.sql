-- 1. Create assets table
create table assets (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null,
  name text not null,
  category_id uuid references asset_categories(id),
  department_id uuid references departments(id),
  serial_number text,
  acquisition_date date,
  acquisition_cost numeric,
  condition text default 'good',
  location text,
  is_bookable boolean default false,
  status text default 'available',
  created_at timestamptz default now()
);

-- Enable RLS on assets
alter table assets enable row level security;
create policy "Allow read access to authenticated users for assets" on assets
  for select to authenticated using (true);
create policy "Allow all access to authenticated users for assets" on assets
  for all to authenticated using (true);

-- 2. Create allocations table
create table allocations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references assets(id) not null,
  employee_id uuid references users(id),
  department_id uuid references departments(id),
  allocated_date timestamptz default now(),
  expected_return_date date,
  actual_return_date timestamptz,
  status text default 'active',
  condition_notes text,
  created_at timestamptz default now()
);

create unique index one_active_allocation_per_asset
  on allocations (asset_id) where status = 'active';

-- Enable RLS on allocations
alter table allocations enable row level security;
create policy "Allow read access to authenticated users for allocations" on allocations
  for select to authenticated using (true);
create policy "Allow all access to authenticated users for allocations" on allocations
  for all to authenticated using (true);
