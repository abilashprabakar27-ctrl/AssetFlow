-- Create transfer_requests table
create table public.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.assets(id) on delete cascade not null,
  requesting_employee_id uuid references public.users(id) on delete set null,
  target_department_id uuid references public.departments(id) on delete set null,
  status text default 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.transfer_requests enable row level security;
create policy "Allow all access to authenticated users for transfer_requests" on public.transfer_requests
  for all to authenticated using (true);
