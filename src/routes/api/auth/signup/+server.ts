import { json } from '@sveltejs/kit';
import { getDB, setDB } from '$lib';
import type { UserSchema } from '$lib';
import { generateToken } from '$lib/jwt';

export async function POST({ request }) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return json({ error: 'Username, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getDB(username);
    if (existingUser) {
      return json({ error: 'Username already exists' }, { status: 409 });
    }

    // Create new user
    const newUser: UserSchema = {
      username,
      email,
      password,
      chats: {}
    };

    // Save user to database
    await setDB(username, JSON.stringify(newUser));

    // Generate JWT token
    const token = generateToken({
      username: newUser.username,
      email: newUser.email
    });

    // Return user data and token (without password)
    return json({
      user: {
        username: newUser.username,
        email: newUser.email
      },
      token
    }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return json({ error: 'Signup failed' }, { status: 500 });
  }
} 