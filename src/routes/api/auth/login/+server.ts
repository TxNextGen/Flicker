import { json } from '@sveltejs/kit';
import { getDB } from '$lib';
import type { UserSchema } from '$lib';
import { generateToken } from '$lib/jwt';

export async function POST({ request }) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Get user data from database
    const userData = await getDB(username);
    if (!userData) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    const user: UserSchema = await userData.json();

    if (user.password !== password) {
      return json({ error: 'Invalid password' }, { status: 401 });
    }

    // Generate JWT token
    const token = generateToken({
      username: user.username,
      email: user.email
    });

    // Return user data and token (without password)
    return json({
      user: {
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Login failed' }, { status: 500 });
  }
} 