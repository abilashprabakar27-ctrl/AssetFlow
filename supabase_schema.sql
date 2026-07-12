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
