import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, readDb, writeDb, MockDbState } from '@/lib/supabase/mockDb';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, table, authAction } = body;

    // Handle Authentication Actions
    if (authAction) {
      const db = readDb();
      const cookieStore = cookies();

      if (authAction === 'signin') {
        const { email, password } = body;
        const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) {
          return NextResponse.json({ error: { message: 'Invalid email or password' } }, { status: 400 });
        }
        
        // Set mock-session cookie as "id:role"
        cookieStore.set('mock-session', `${user.id}:${user.role}`, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        return NextResponse.json({ data: { user } });
      }

      if (authAction === 'signup') {
        const { email, password, name } = body;
        const exists = db.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          return NextResponse.json({ error: { message: 'User already exists' } }, { status: 400 });
        }

        const newUser = {
          id: 'u_' + Math.random().toString(36).substring(2, 11),
          name: name || '',
          email: email,
          password: password,
          role: 'employee' as const, // default role
          department_id: null,
          status: 'active',
        };

        db.users.push(newUser);
        writeDb(db);

        // Set mock-session cookie as "id:role"
        cookieStore.set('mock-session', `${newUser.id}:${newUser.role}`, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        // Insert into activity logs
        db.activity_logs.push({
          id: 'l_' + Math.random().toString(36).substring(2, 11),
          user_id: newUser.id,
          action: 'Signup',
          details: `User signed up: ${newUser.email}`,
          created_at: new Date().toISOString(),
        });
        writeDb(db);

        return NextResponse.json({ data: { user: newUser } });
      }

      if (authAction === 'signout') {
        cookieStore.set('mock-session', '', { path: '/', maxAge: 0 });
        return NextResponse.json({ data: { success: true } });
      }

      if (authAction === 'getuser') {
        const sessionVal = cookieStore.get('mock-session')?.value;
        if (!sessionVal) {
          return NextResponse.json({ data: { user: null } });
        }
        const [userId] = sessionVal.split(':');
        const user = db.users.find((u) => u.id === userId);
        if (!user) {
          return NextResponse.json({ data: { user: null } });
        }
        return NextResponse.json({ data: { user } });
      }

      return NextResponse.json({ error: { message: 'Invalid auth action' } }, { status: 400 });
    }

    // Handle standard queries
    const result = executeQuery(action, table as keyof MockDbState, body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in mock DB API:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal server error' } }, { status: 500 });
  }
}
