-- ========================================================
-- PART 1: Core Tables (from Person 1)
-- ========================================================

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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ========================================================
-- PART 2: Assets & Allocations Tables (Person 2)
-- ========================================================

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  serial_number TEXT,
  acquisition_date DATE,
  acquisition_cost NUMERIC,
  condition TEXT DEFAULT 'good',
  location TEXT,
  is_bookable BOOLEAN DEFAULT false,
  status public.asset_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_assets ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY write_assets ON public.assets FOR ALL TO authenticated USING (true);

CREATE TABLE public.allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  allocated_date TIMESTAMPTZ DEFAULT now(),
  expected_return_date DATE,
  actual_return_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  condition_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX one_active_allocation_per_asset
  ON public.allocations (asset_id) WHERE status = 'active';

ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_allocations ON public.allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY write_allocations ON public.allocations FOR ALL TO authenticated USING (true);
