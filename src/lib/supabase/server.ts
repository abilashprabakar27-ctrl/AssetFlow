import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { executeQuery, readDb, MockDbState } from '@/lib/supabase/mockDb';

class ServerMockQueryBuilder {
  table: string;
  filters: any[] = [];
  orderCol?: string;
  orderDesc?: boolean;
  limitVal?: number;
  isSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  order(col: string, { ascending = true } = {}) {
    this.orderCol = col;
    this.orderDesc = !ascending;
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async insert(rows: any | any[]) {
    return executeQuery('insert', this.table as keyof MockDbState, { rows });
  }

  async update(values: any) {
    return executeQuery('update', this.table as keyof MockDbState, { filters: this.filters, values });
  }

  async delete() {
    return executeQuery('delete', this.table as keyof MockDbState, { filters: this.filters });
  }

  // Thenable implementation to support direct await
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const data = executeQuery('select', this.table as keyof MockDbState, {
        filters: this.filters,
        orderCol: this.orderCol,
        orderDesc: this.orderDesc,
        limitVal: this.limitVal,
        single: this.isSingle
      });
      if (onfulfilled) return onfulfilled(data);
      return data;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }
}

const serverMockAuth = () => {
  return {
    async getUser() {
      try {
        const cookieStore = cookies();
        const sessionVal = cookieStore.get('mock-session')?.value;
        if (!sessionVal) {
          return { data: { user: null }, error: null };
        }
        const db = readDb();
        const user = db.users.find((u) => u.id === sessionVal);
        if (!user) {
          return { data: { user: null }, error: null };
        }
        return { data: { user }, error: null };
      } catch {
        return { data: { user: null }, error: null };
      }
    }
  };
};

const createMockServerClient = () => {
  return {
    auth: serverMockAuth(),
    from(table: string) {
      return new ServerMockQueryBuilder(table);
    },
    async rpc(fn_name: string, args: any = {}) {
      if (fn_name === 'get_department_allocations_summary') {
        const db = readDb();
        const depts = db.departments;
        const allocs = db.allocations;
        const summary = depts.map((d: any) => {
          const count = allocs.filter((a: any) => a.department_id === d.id && a.status === 'active').length;
          return { id: d.id, name: d.name, total_allocations: count };
        });
        return { data: summary, error: null };
      }
      return { data: null, error: { message: 'Function not found' } };
    }
  } as any;
};

export const createClient = () => {
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isMock) {
    return createMockServerClient();
  }

  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      },
    },
  });
};
