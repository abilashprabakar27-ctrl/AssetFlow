import fs from 'fs';
import path from 'path';

// Define DB file path
const DB_FILE = path.join(process.cwd(), 'src/lib/supabase/mock_db.json');

// Define initial data
const INITIAL_DEPARTMENTS = [
  { id: 'd1', name: 'Engineering', code: 'ENG', parent_dept_id: null, employee_count: 12, status: 'active', head_id: 'u3' },
  { id: 'd2', name: 'Marketing', code: 'MKT', parent_dept_id: null, employee_count: 5, status: 'active', head_id: null },
  { id: 'd3', name: 'Human Resources', code: 'HR', parent_dept_id: null, employee_count: 3, status: 'active', head_id: null },
  { id: 'd4', name: 'Facilities & Ops', code: 'OPS', parent_dept_id: null, employee_count: 8, status: 'active', head_id: 'u2' },
  { id: 'd5', name: 'Design', code: 'DES', parent_dept_id: null, employee_count: 4, status: 'active', head_id: null },
];

const INITIAL_USERS = [
  { id: 'u1', name: 'System Admin', email: 'admin@assetflow.com', password: 'password123', role: 'admin', department_id: null, status: 'active' },
  { id: 'u2', name: 'Asset Manager', email: 'manager@assetflow.com', password: 'password123', role: 'asset_manager', department_id: 'd4', status: 'active' },
  { id: 'u3', name: 'Priya Sharma (Head)', email: 'head@assetflow.com', password: 'password123', role: 'department_head', department_id: 'd1', status: 'active' },
  { id: 'u4', name: 'Raj Patel (Employee)', email: 'employee@assetflow.com', password: 'password123', role: 'employee', department_id: 'd1', status: 'active' },
];

const INITIAL_CATEGORIES = [
  { id: 'c1', name: 'Computers & Laptops', description: 'MacBooks, Dell XPS, ThinkPads', custom_fields: { RAM: '16GB', Storage: '512GB SSD', OS: 'macOS' }, status: 'active' },
  { id: 'c2', name: 'Meeting Rooms', description: 'Conference and Huddle rooms', custom_fields: { Capacity: '8', Has_Video_Conferencing: 'Yes' }, status: 'active' },
  { id: 'c3', name: 'Company Vehicles', description: 'Cars, vans, and transport', custom_fields: { License_Plate: '', Next_Service: '2026-12-01' }, status: 'active' },
  { id: 'c4', name: 'Office Furniture', description: 'Standing desks, ergonomic chairs', custom_fields: { Material: 'Wood/Metal', Ergonomic: 'Yes' }, status: 'active' },
  { id: 'c5', name: 'A/V Equipment', description: 'Projectors, Cameras, Mics', custom_fields: { Resolution: '4K', Wireless: 'Yes' }, status: 'active' },
];

const INITIAL_ASSETS = [
  { id: 'a1', tag: 'AF-0001', name: 'MacBook Pro M3 Max 16"', serial: 'C02F234XMD6M', category_id: 'c1', department_id: 'd1', status: 'allocated', is_bookable: false, created_at: '2026-01-01T00:00:00Z', condition: 'Excellent', location: 'HQ - Floor 3', cost: 3499 },
  { id: 'a2', tag: 'AF-0002', name: 'Conference Room: "Apollo"', serial: 'RM-401', category_id: 'c2', department_id: 'd4', status: 'available', is_bookable: true, created_at: '2026-02-15T00:00:00Z', condition: 'Good', location: 'HQ - Floor 4', cost: 0 },
  { id: 'a3', tag: 'AF-0003', name: 'Tesla Model 3 Long Range', serial: '5YJ3E1EA1KF', category_id: 'c3', department_id: 'd4', status: 'available', is_bookable: true, created_at: '2026-03-10T00:00:00Z', condition: 'Excellent', location: 'HQ - Parking Lot B', cost: 48000 },
  { id: 'a4', tag: 'AF-0004', name: 'Herman Miller Aeron Chair', serial: 'CHR112233', category_id: 'c4', department_id: 'd1', status: 'allocated', is_bookable: false, created_at: '2026-04-01T00:00:00Z', condition: 'Fair', location: 'HQ - Floor 3', cost: 1250 },
  { id: 'a5', tag: 'AF-0005', name: 'Sony A7S III Camera', serial: 'SNY0837482', category_id: 'c5', department_id: 'd2', status: 'available', is_bookable: true, created_at: '2026-01-10T00:00:00Z', condition: 'Excellent', location: 'HQ - Media Room', cost: 3498 },
  { id: 'a6', tag: 'AF-0006', name: 'Dell XPS 15', serial: 'DL9928374', category_id: 'c1', department_id: 'd1', status: 'available', is_bookable: false, created_at: '2026-05-12T00:00:00Z', condition: 'Good', location: 'HQ - IT Storage', cost: 1899 },
  { id: 'a7', tag: 'AF-0007', name: 'Huddle Room: "Gemini"', serial: 'RM-305', category_id: 'c2', department_id: 'd4', status: 'available', is_bookable: true, created_at: '2026-06-20T00:00:00Z', condition: 'Excellent', location: 'HQ - Floor 3', cost: 0 },
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

const INITIAL_TRANSFER_REQUESTS = [
  { id: 'tr1', asset_id: 'a1', requester_id: 'u3', from_user_id: 'u4', status: 'pending', created_at: '2026-07-12T08:00:00Z', notes: 'Need this for project X' }
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
  transfer_requests: typeof INITIAL_TRANSFER_REQUESTS;
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
        transfer_requests: INITIAL_TRANSFER_REQUESTS,
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
      transfer_requests: INITIAL_TRANSFER_REQUESTS,
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
        } else if (filter.type === 'in') {
          data = data.filter((row) => filter.val.includes(row[filter.col]));
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
    } else if (table === 'transfer_requests') {
      data = data.map((tr) => ({
        ...tr,
        asset: db.assets.find((a) => a.id === tr.asset_id) || null,
        requester: db.users.find((u) => u.id === tr.requester_id) || null,
        from_user: db.users.find((u) => u.id === tr.from_user_id) || null,
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
