import fs from 'fs';
import path from 'path';

// Define DB file path
const DB_FILE = path.join(process.cwd(), 'src/lib/supabase/mock_db.json');

// Define initial data
const INITIAL_DEPARTMENTS = [
  { id: 'd1', name: 'Engineering', code: 'ENG', parent_dept_id: null, employee_count: 2, status: 'active', head_id: 'u3' },
  { id: 'd2', name: 'Marketing', code: 'MKT', parent_dept_id: null, employee_count: 1, status: 'active', head_id: null },
  { id: 'd3', name: 'Human Resources', code: 'HR', parent_dept_id: null, employee_count: 1, status: 'active', head_id: null },
];

const INITIAL_USERS = [
  { id: 'u1', name: 'System Admin', email: 'admin@assetflow.com', password: 'password123', role: 'admin', department_id: null, status: 'active' },
  { id: 'u2', name: 'Asset Manager', email: 'manager@assetflow.com', password: 'password123', role: 'asset_manager', department_id: null, status: 'active' },
  { id: 'u3', name: 'Priya Sharma (Head)', email: 'head@assetflow.com', password: 'password123', role: 'department_head', department_id: 'd1', status: 'active' },
  { id: 'u4', name: 'Raj Patel (Employee)', email: 'employee@assetflow.com', password: 'password123', role: 'employee', department_id: 'd1', status: 'active' },
];

const INITIAL_CATEGORIES = [
  { id: 'c1', name: 'Electronics', description: 'Computers, screens, peripherals', custom_fields: { warranty_months: 24, manufacturer: 'Apple' }, status: 'active' },
  { id: 'c2', name: 'Furniture', description: 'Desks, chairs, whiteboards', custom_fields: { material: 'Wood', dimensions: '120x80cm' }, status: 'active' },
  { id: 'c3', name: 'Vehicles', description: 'Company cars, vans', custom_fields: { next_service: '2026-12-01' }, status: 'active' },
];

const INITIAL_ASSETS = [
  { id: 'a1', tag: 'AF-0001', name: 'MacBook Pro 16"', serial: 'C02F234XMD6M', category_id: 'c1', department_id: 'd1', status: 'allocated', is_bookable: false, created_at: '2026-01-01T00:00:00Z', condition: 'Excellent', location: 'HQ - Floor 3', cost: 2499 },
  { id: 'a2', tag: 'AF-0002', name: 'Conference Room Projector', serial: 'PRJ998231', category_id: 'c1', department_id: 'd1', status: 'available', is_bookable: true, created_at: '2026-02-15T00:00:00Z', condition: 'Good', location: 'HQ - Meeting Room A', cost: 850 },
  { id: 'a3', tag: 'AF-0003', name: 'Tesla Model 3', serial: '5YJ3E1EA1KF', category_id: 'c3', department_id: null, status: 'available', is_bookable: true, created_at: '2026-03-10T00:00:00Z', condition: 'Excellent', location: 'HQ - Parking Lot B', cost: 38000 },
  { id: 'a4', tag: 'AF-0004', name: 'Ergonomic Office Chair', serial: 'CHR112233', category_id: 'c2', department_id: 'd2', status: 'allocated', is_bookable: false, created_at: '2026-04-01T00:00:00Z', condition: 'Fair', location: 'HQ - Floor 2', cost: 350 },
  { id: 'a5', tag: 'AF-0005', name: 'Dell UltraSharp 27"', serial: 'CN0837482', category_id: 'c1', department_id: 'd1', status: 'available', is_bookable: false, created_at: '2026-01-10T00:00:00Z', condition: 'Good', location: 'HQ - Floor 3', cost: 450 },
];

const INITIAL_ALLOCATIONS = [
  { id: 'al1', asset_id: 'a1', user_id: 'u4', department_id: 'd1', allocated_at: '2026-01-02T10:00:00Z', returned_at: null, status: 'active', expected_return_date: '2026-07-01T17:00:00Z' }, // Overdue
  { id: 'al2', asset_id: 'a4', user_id: 'u3', department_id: 'd2', allocated_at: '2026-04-02T09:00:00Z', returned_at: null, status: 'active', expected_return_date: null },
];

const INITIAL_BOOKINGS = [
  { id: 'b1', resource_id: 'a2', user_id: 'u4', start_time: '2026-07-12T09:00:00Z', end_time: '2026-07-12T10:00:00Z', status: 'active', created_at: '2026-07-11T12:00:00Z' },
  { id: 'b2', resource_id: 'a3', user_id: 'u3', start_time: '2026-07-13T10:00:00Z', end_time: '2026-07-13T12:00:00Z', status: 'active', created_at: '2026-07-11T14:00:00Z' },
];

const INITIAL_LOGS = [
  { id: 'l1', user_id: 'u1', action: 'Create User', details: 'Created user manager@assetflow.com', created_at: '2026-07-12T04:00:00Z' },
  { id: 'l2', user_id: 'u2', action: 'Register Asset', details: 'Registered new asset AF-0001: MacBook Pro 16"', created_at: '2026-07-12T04:15:00Z' },
];

const INITIAL_MAINTENANCE = [
  { id: 'm1', asset_id: 'a5', reporter_id: 'u4', description: 'Screen flickering occasionally', priority: 'medium', status: 'pending', technician_id: null, created_at: '2026-07-12T05:00:00Z', resolved_at: null },
];

const INITIAL_AUDITS = [
  { id: 'au1', name: 'Q3 Electronics Audit', scope_type: 'department', scope_id: 'd1', created_by: 'u1', created_at: '2026-07-11T09:00:00Z', status: 'active', due_date: '2026-08-01', auditors: ['u2'] },
];

const INITIAL_AUDIT_LOGS = [
  { id: 'aul1', audit_cycle_id: 'au1', asset_id: 'a1', status: 'verified', notes: 'Asset in hand, clean condition', audited_by: 'u2', audited_at: '2026-07-12T05:30:00Z' },
];

export interface MockDbState {
  departments: typeof INITIAL_DEPARTMENTS;
  users: typeof INITIAL_USERS;
  asset_categories: typeof INITIAL_CATEGORIES;
  assets: typeof INITIAL_ASSETS;
  allocations: typeof INITIAL_ALLOCATIONS;
  bookings: typeof INITIAL_BOOKINGS;
  activity_logs: typeof INITIAL_LOGS;
  maintenance_requests: typeof INITIAL_MAINTENANCE;
  audit_cycles: typeof INITIAL_AUDITS;
  audit_asset_logs: typeof INITIAL_AUDIT_LOGS;
}

export function readDb(): MockDbState {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      writeDb({
        departments: INITIAL_DEPARTMENTS,
        users: INITIAL_USERS,
        asset_categories: INITIAL_CATEGORIES,
        assets: INITIAL_ASSETS,
        allocations: INITIAL_ALLOCATIONS,
        bookings: INITIAL_BOOKINGS,
        activity_logs: INITIAL_LOGS,
        maintenance_requests: INITIAL_MAINTENANCE,
        audit_cycles: INITIAL_AUDITS,
        audit_asset_logs: INITIAL_AUDIT_LOGS,
      });
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading mock DB file, falling back to initial data:', error);
    return {
      departments: INITIAL_DEPARTMENTS,
      users: INITIAL_USERS,
      asset_categories: INITIAL_CATEGORIES,
      assets: INITIAL_ASSETS,
      allocations: INITIAL_ALLOCATIONS,
      bookings: INITIAL_BOOKINGS,
      activity_logs: INITIAL_LOGS,
      maintenance_requests: INITIAL_MAINTENANCE,
      audit_cycles: INITIAL_AUDITS,
      audit_asset_logs: INITIAL_AUDIT_LOGS,
    };
  }
}

export function writeDb(state: MockDbState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing mock DB file:', error);
  }
}

// Simple query simulator helper
export function executeQuery(action: string, table: keyof MockDbState, body: any) {
  const db = readDb();
  let data = db[table] as any[];

  if (action === 'select') {
    // Apply filters
    if (body.filters) {
      for (const filter of body.filters) {
        if (filter.type === 'eq') {
          data = data.filter((row) => row[filter.col] === filter.val);
        }
      }
    }

    // Apply sorting
    if (body.orderCol) {
      data = [...data].sort((a, b) => {
        const valA = a[body.orderCol];
        const valB = b[body.orderCol];
        if (valA < valB) return body.orderDesc ? 1 : -1;
        if (valA > valB) return body.orderDesc ? -1 : 1;
        return 0;
      });
    }

    // Apply limit
    if (body.limitVal) {
      data = data.slice(0, body.limitVal);
    }

    // If single row expected
    if (body.single) {
      return { data: data[0] || null, error: null };
    }

    // Handle nested expansions (joins) that are used in the dashboard or listings
    if (table === 'bookings') {
      data = data.map((b) => ({
        ...b,
        resource: db.assets.find((a) => a.id === b.resource_id) || null,
        user: db.users.find((u) => u.id === b.user_id) || null,
      }));
    } else if (table === 'assets') {
      data = data.map((asset) => ({
        ...asset,
        category: db.asset_categories.find((c) => c.id === asset.category_id) || null,
        department: db.departments.find((d) => d.id === asset.department_id) || null,
      }));
    } else if (table === 'allocations') {
      data = data.map((alloc) => ({
        ...alloc,
        asset: db.assets.find((a) => a.id === alloc.asset_id) || null,
        user: db.users.find((u) => u.id === alloc.user_id) || null,
        department: db.departments.find((d) => d.id === alloc.department_id) || null,
      }));
    } else if (table === 'activity_logs') {
      data = data.map((log) => ({
        ...log,
        user: db.users.find((u) => u.id === log.user_id) || null,
      }));
    } else if (table === 'maintenance_requests') {
      data = data.map((m) => ({
        ...m,
        asset: db.assets.find((a) => a.id === m.asset_id) || null,
        reporter: db.users.find((u) => u.id === m.reporter_id) || null,
        technician: m.technician_id ? db.users.find((u) => u.id === m.technician_id) || null : null,
      }));
    }

    return { data, error: null };
  }

  if (action === 'insert') {
    const rows = Array.isArray(body.rows) ? body.rows : [body.rows];
    const inserted: any[] = [];
    for (const row of rows) {
      const newRow = {
        id: row.id || Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString(),
        ...row,
      };
      data.push(newRow);
      inserted.push(newRow);
    }
    db[table] = data as any;
    writeDb(db);
    return { data: inserted, error: null };
  }

  if (action === 'update') {
    // Find rows matching filters
    let updatedCount = 0;
    const values = body.values;
    db[table] = data.map((row) => {
      let matches = true;
      if (body.filters) {
        for (const filter of body.filters) {
          if (filter.type === 'eq' && row[filter.col] !== filter.val) {
            matches = false;
          }
        }
      }
      if (matches) {
        updatedCount++;
        return { ...row, ...values };
      }
      return row;
    }) as any;
    writeDb(db);
    return { data: { count: updatedCount }, error: null };
  }

  if (action === 'delete') {
    let deletedCount = 0;
    db[table] = data.filter((row) => {
      let matches = true;
      if (body.filters) {
        for (const filter of body.filters) {
          if (filter.type === 'eq' && row[filter.col] !== filter.val) {
            matches = false;
          }
        }
      }
      if (matches) {
        deletedCount++;
        return false;
      }
      return true;
    }) as any;
    writeDb(db);
    return { data: { count: deletedCount }, error: null };
  }

  return { data: null, error: 'Unknown action' };
}
