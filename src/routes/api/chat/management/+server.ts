import { json } from '@sveltejs/kit';
import { getDB, setDB } from '$lib';
import type { UserSchema } from '$lib';
import { verifyToken, extractTokenFromHeader } from '$lib/jwt';

export async function POST({ request }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return json({ error: 'Authorization token required' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { action, chatName, messages, newName } = await request.json();

    if (!action) {
      return json({ error: 'Action is required' }, { status: 400 });
    }

    const userData = await getDB(payload.username);
    if (!userData) {
      return json({ error: 'User not found' }, { status: 404 });
    }

    const user: UserSchema = await userData.json();
    const updatedUser = { ...user };

    switch (action) {
      case 'create':
        if (!chatName || !messages) {
          return json({ error: 'Chat name and messages are required' }, { status: 400 });
        }
        
        updatedUser.chats[chatName] = {
          messages,
          lastUpdated: Date.now()
        };
        break;

      case 'update':
        if (!chatName || !messages) {
          return json({ error: 'Chat name and messages are required' }, { status: 400 });
        }
        
        if (!updatedUser.chats[chatName]) {
          return json({ error: 'Chat not found' }, { status: 404 });
        }
        
        updatedUser.chats[chatName] = {
          messages,
          lastUpdated: Date.now()
        };
        break;

      case 'rename':
        if (!chatName || !newName) {
          return json({ error: 'Chat name and new name are required' }, { status: 400 });
        }
        
        if (!updatedUser.chats[chatName]) {
          return json({ error: 'Chat not found' }, { status: 404 });
        }
        
        if (updatedUser.chats[newName]) {
          return json({ error: 'Chat with new name already exists' }, { status: 409 });
        }
        
        updatedUser.chats[newName] = updatedUser.chats[chatName];
        delete updatedUser.chats[chatName];
        break;

      case 'delete':
        if (!chatName) {
          return json({ error: 'Chat name is required' }, { status: 400 });
        }
        
        if (!updatedUser.chats[chatName]) {
          return json({ error: 'Chat not found' }, { status: 404 });
        }
        
        delete updatedUser.chats[chatName];
        break;

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }

    // Save updated user data
    await setDB(payload.username, JSON.stringify(updatedUser));

    return json({ 
      success: true, 
      chats: updatedUser.chats 
    });
  } catch (error) {
    console.error('Chat management error:', error);
    return json({ error: 'Failed to manage chat' }, { status: 500 });
  }
} 