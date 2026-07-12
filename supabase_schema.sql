CREATE TYPE public.user_role AS ENUM ('employee', 'department_head', 'asset_manager', 'admin');
CREATE TYPE public.asset_status AS ENUM ('available', 'allocated', 'reserved', 'under_maintenance', 'lost', 'retired', 'disposed');
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    parent_dept_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    employee_count INT DEFAULT 0,
    status TEXT DEFAULT 'active'
);
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    role public.user_role NOT NULL DEFAULT 'employee',
    status TEXT DEFAULT 'active'
);
ALTER TABLE public.departments ADD COLUMN head_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE TABLE public.asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active'
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_departments ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY write_departments ON public.departments FOR ALL TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY select_users ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY write_users ON public.users FOR ALL TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY select_asset_categories ON public.asset_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY write_asset_categories ON public.asset_categories FOR ALL TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    new.email,
    'employee',
    'active'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable btree_gist extension for overlap exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create public.assets table if not already created (owned by Person 2 but needed by Person 3)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    serial TEXT UNIQUE,
    category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    status public.asset_status NOT NULL DEFAULT 'available',
    is_bookable BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create public.allocations table (owned by Person 2 but referenced by Person 1 & 3 reports)
CREATE TABLE IF NOT EXISTS public.allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    allocated_at TIMESTAMPTZ DEFAULT now(),
    returned_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active'
);

-- Create public.bookings table (owned by Person 3)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(start_time, end_time, '[]') WITH &&
    ) WHERE (status = 'active'),
    CONSTRAINT bookings_start_before_end CHECK (start_time < end_time)
);

-- Create public.activity_logs table (owned by Person 3)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Simple Policies for demo purposes
CREATE POLICY select_assets ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY write_assets ON public.assets FOR ALL TO authenticated USING (true);

CREATE POLICY select_allocations ON public.allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY write_allocations ON public.allocations FOR ALL TO authenticated USING (true);

CREATE POLICY select_bookings ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY write_bookings ON public.bookings FOR ALL TO authenticated USING (true);

CREATE POLICY select_activity_logs ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY write_activity_logs ON public.activity_logs FOR ALL TO authenticated USING (true);

-- RPC for Handshake 3 (Reports Query)
CREATE OR REPLACE FUNCTION public.get_department_allocations_summary()
RETURNS TABLE (id UUID, name TEXT, total_allocations BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.name, COUNT(a.id) AS total_allocations
  FROM public.departments d
  LEFT JOIN public.allocations a ON d.id = a.department_id
  GROUP BY d.id, d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


