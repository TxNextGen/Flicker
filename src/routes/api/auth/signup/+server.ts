import { json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { getDB, setDB } from "$lib";
import type { UserSchema } from "$lib";
import { generateToken } from "$lib/jwt";
import crypto from "crypto";

function validatePassword(password: string) {
  if (!password || typeof password !== "string") return false;
  const length = password.length >= 8;
  const upper = /[A-Z]/.test(password);
  const lower = /[a-z]/.test(password);
  const number = /\d/.test(password);
  const special = /[^A-Za-z0-9]/.test(password);
  return length && upper && lower && number && special;
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}$${hash}`;
}

export async function POST({ request }: RequestEvent) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return json({ error: "Username, email, and password are required" }, { status: 400 });
    }

    // Basic email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return json(
        {
          error:
            "Password must be at least 8 characters and include upper and lower case letters, a number, and a special character",
        },
        { status: 400 },
      );
    }

    // Check if user already exists by username
    const existingUserByUsername = await getDB(username);
    if (existingUserByUsername) {
      return json({ error: "Username already exists" }, { status: 409 });
    }

    // Optionally check by email (if DB supports email lookup) -- here try username-based store only

    // Hash password before storing
    const hashed = hashPassword(password);

    // Create new user
    const newUser: UserSchema = {
      username,
      email,
      password: hashed,
      chats: {},
    };

    // Save user to database
    await setDB(username, JSON.stringify(newUser));

    // Generate JWT token
    const token = generateToken({ username: newUser.username, email: newUser.email });

    // Return user data and token (without password)
    return json(
      {
        user: {
          username: newUser.username,
          email: newUser.email,
        },
        token,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return json({ error: "Signup failed" }, { status: 500 });
  }
}
