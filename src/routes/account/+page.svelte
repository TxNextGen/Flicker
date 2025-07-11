<script lang="ts">
  import { goto } from "$app/navigation";

  interface User {
    username: string;
    email: string;
    chats: { [id: string]: { messages: Array<{ role: string; content: string }> } };
  }

  let user: User | null = null;
  let loading = true;
  let error = '';

  async function loadUserData() {
    const userData = localStorage.getItem('flicker_user');
    const token = localStorage.getItem('flicker_token');
    
    if (!userData || !token) {
      goto('/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('flicker_user');
          localStorage.removeItem('flicker_token');
          goto('/login');
          return;
        }
        error = data.error || 'Failed to load user data';
        return;
      }

      const data = await response.json();
      user = data.user;
      error = '';
    } catch (e) {
      error = 'Failed to load user data';
      console.error('Load user error:', e);
    } finally {
      loading = false;
    }
  }

  async function deleteChat(chatId: string) {
    if (!user) return;

    const token = localStorage.getItem('flicker_token');
    if (!token) {
      goto('/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/user', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chatId })
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('flicker_user');
          localStorage.removeItem('flicker_token');
          goto('/login');
          return;
        }
        error = data.error || 'Failed to delete chat';
        return;
      }

      // Remove chat from local state
      const updatedUser = { ...user };
      delete updatedUser.chats[chatId];
      user = updatedUser;
      error = '';
    } catch (e) {
      error = 'Failed to delete chat';
      console.error('Delete chat error:', e);
    }
  }

  function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleDateString();
  }

  // Load user data on component mount
  loadUserData();
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-8">
  <div class="w-full max-w-4xl">
    <div class="bg-[#232526] border border-gray-800 rounded-xl shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-100 mb-2">Account Settings</h1>
        <p class="text-gray-400">Manage your Flicker AI account</p>
      </div>

      {#if loading}
        <div class="text-center text-gray-400">Loading...</div>
      {:else if error}
        <div class="text-red-400 text-center mb-4">{error}</div>
      {:else if user}
        <!-- User Information -->
        <div class="bg-[#23282e] rounded-lg p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-100 mb-4">Profile Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Username</label>
              <p class="text-gray-100">{user.username}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <p class="text-gray-100">{user.email}</p>
            </div>
          </div>
        </div>

        <!-- Chat History -->
        <div class="bg-[#23282e] rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-100 mb-4">Chat History</h2>
          {#if Object.keys(user.chats).length === 0}
            <p class="text-gray-400 text-center py-8">No saved chats yet. Start a conversation to see your history here.</p>
          {:else}
            <div class="space-y-3">
              {#each Object.entries(user.chats) as [chatId, chat]}
                <div class="flex items-center justify-between bg-[#1a1c1e] rounded-lg p-4">
                  <div class="flex-1">
                    <h3 class="text-gray-100 font-medium">Chat {chatId}</h3>
                    <p class="text-gray-400 text-sm">
                      {chat.messages.length} messages • {formatDate(chatId)}
                    </p>
                    {#if chat.messages.length > 0}
                      <p class="text-gray-500 text-sm mt-1 truncate">
                        {chat.messages[0].content.substring(0, 20)}...
                      </p>
                    {/if}
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="bg-[#ffb300] text-black font-semibold px-3 py-1 rounded text-sm hover:bg-[#e6a100] transition-colors"
                      on:click={() => goto(`/?chat=${chatId}`)}
                    >
                      Open
                    </button>
                    <button
                      class="bg-red-600 text-white font-semibold px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      on:click={() => deleteChat(chatId)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div> 