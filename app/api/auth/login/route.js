import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/mysql';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const rows = await query(
      'SELECT User_ID, Username, Password_Hash, Role, Patient_ID, Doctor_ID FROM App_User WHERE Username = ?',
      [username]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.Password_Hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({
      userId: user.User_ID,
      username: user.Username,
      role: user.Role,
      patientId: user.Patient_ID,
      doctorId: user.Doctor_ID,
    });

    const res = NextResponse.json({ ok: true, role: user.Role });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
