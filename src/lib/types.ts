export type UserRole = 'employee' | 'department_head' | 'asset_manager' | 'admin';
export type AssetStatus = 'available' | 'allocated' | 'reserved' | 'under_maintenance' | 'lost' | 'retired' | 'disposed';
export interface Department {
  id: string;
  name: string;
  code: string;
  head_id: string | null;
  parent_dept_id: string | null;
  employee_count: number;
  status: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
  role: UserRole;
  status: string;
}
export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
  custom_fields: Record<string, unknown>;
  status: string;
}
