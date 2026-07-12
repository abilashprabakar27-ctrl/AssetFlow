'use client';

import { createBrowserClient } from '@supabase/ssr';

class MockQueryBuilder {
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
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'insert', table: this.table, rows })
    });
    return res.json();
  }

  async update(values: any) {
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', table: this.table, filters: this.filters, values })
    });
    return res.json();
  }

  async delete() {
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', table: this.table, filters: this.filters })
    });
    return res.json();
  }

  // Thenable implementation to support direct await
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await fetch('/api/mock-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          table: this.table,
          filters: this.filters,
          orderCol: this.orderCol,
          orderDesc: this.orderDesc,
          limitVal: this.limitVal,
          single: this.isSingle
        })
      });
      const data = await res.json();
      if (onfulfilled) return onfulfilled(data);
      return data;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }
}

const mockAuth = {
  async signInWithPassword({ email, password }: any) {
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authAction: 'signin', email, password })
    });
    const result = await res.json();
    if (result.error) {
      return { data: { user: null }, error: result.error };
    }
    return { data: { user: result.data.user }, error: null };
  },

  async signUp({ email, password, options }: any) {
    const name = options?.data?.name || '';
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authAction: 'signup', email, password, name })
    });
    const result = await res.json();
    if (result.error) {
      return { data: { user: null }, error: result.error };
    }
    return { data: { user: result.data.user }, error: null };
  },

  async signOut() {
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authAction: 'signout' })
    });
    const result = await res.json();
    if (result.error) {
      return { error: result.error };
    }
    window.location.href = '/login';
    return { error: null };
  },

  async getUser() {
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authAction: 'getuser' })
    });
    const result = await res.json();
    if (result.error || !result.data?.user) {
      return { data: { user: null }, error: result.error || new Error('No user found') };
    }
    return { data: { user: result.data.user }, error: null };
  }
};

const createMockClient = () => {
  return {
    auth: mockAuth,
    from(table: string) {
      return new MockQueryBuilder(table);
    },
    async rpc(fn_name: string, args: any = {}) {
      if (fn_name === 'get_department_allocations_summary') {
        const res = await fetch('/api/mock-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'select', table: 'departments' })
        });
        const depts = await res.json();
        const allocsRes = await fetch('/api/mock-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'select', table: 'allocations' })
        });
        const allocs = await allocsRes.json();
        
        if (depts.data && allocs.data) {
          const summary = depts.data.map((d: any) => {
            const count = allocs.data.filter((a: any) => a.department_id === d.id && a.status === 'active').length;
            return { id: d.id, name: d.name, total_allocations: count };
          });
          return { data: summary, error: null };
        }
        return { data: null, error: { message: 'Failed to compute allocations summary' } };
      }
      return { data: null, error: { message: 'Function not found' } };
    }
  } as any;
};

export const createClient = () => {
  const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
  if (isMock) {
    return createMockClient();
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createBrowserClient(url, key);
};
