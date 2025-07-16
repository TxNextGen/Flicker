import { json } from "@sveltejs/kit";
import { getDB, setDB } from "$lib";
import type { UserSchema } from "$lib";
import { verifyToken, extractTokenFromHeader } from "$lib/jwt";

export async function POST({ request }) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return json({ error: "Authorization token required" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userData = await getDB(payload.username);
    if (!userData) {
      return json({ error: "User not found" }, { status: 404 });
    }

    const user: UserSchema = await userData.json();

    // Return user data (without password)
    return json({
      user: {
        username: user.username,
        email: user.email,
        chats: user.chats,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return json({ error: "Failed to get user data" }, { status: 500 });
  }
}

export async function DELETE({ request }) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return json({ error: "Authorization token required" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { chatId } = await request.json();

    if (!chatId) {
      return json({ error: "Chat ID is required" }, { status: 400 });
    }

    const userData = await getDB(payload.username);
    if (!userData) {
      return json({ error: "User not found" }, { status: 404 });
    }

    const user: UserSchema = await userData.json();

    // Delete the chat
    const updatedUser = { ...user };
    delete updatedUser.chats[chatId];

    // Save updated user data
    await setDB(payload.username, JSON.stringify(updatedUser));

    return json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return json({ error: "Failed to delete chat" }, { status: 500 });
  }
}
