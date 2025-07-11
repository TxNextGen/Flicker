<script lang="ts">
  import "../app.css";
  import { goto } from "$app/navigation";
  import { chatStore, triggerChatRefresh, triggerChatAction } from '$lib/stores';
  interface User {
    username: string;
    email: string;
  }

  interface Chat {
    messages: Array<{ role: string; content: string; timestamp: number }>;
    lastUpdated: number;
  }

  let currentUser: User | null = null;
  let userChats: { [key: string]: Chat } = {};
  let loading = true;

  async function checkAuth() {
    const userData = localStorage.getItem('flicker_user');
    const token = localStorage.getItem('flicker_token');
    
    if (userData && token) {
      try {
        currentUser = JSON.parse(userData);
        await loadUserChats();
      } catch (e) {
        localStorage.removeItem('flicker_user');
        localStorage.removeItem('flicker_token');
      }
    }
    loading = false;
  }

  async function loadUserChats() {
    if (!currentUser) return;
    
    const token = localStorage.getItem('flicker_token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        userChats = data.user.chats || {};
      }
    } catch (e) {
      console.error('Failed to load user chats:', e);
    }
  }

  async function deleteChat(chatName: string) {
    if (!currentUser) return;
    
    const token = localStorage.getItem('flicker_token');
    if (!token) return;

    try {
      const response = await fetch('/api/chat/management', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', chatName })
      });

      if (response.ok) {
        const data = await response.json();
        userChats = data.chats;
        triggerChatRefresh();
      }
    } catch (e) {
      console.error('Failed to delete chat:', e);
    }
  }

  function editChatName(chatName: string) {
    const newName = prompt('Enter new chat name:', chatName);
    if (newName && newName !== chatName) {
      renameChat(chatName, newName);
    }
  }

  async function renameChat(oldName: string, newName: string) {
    if (!currentUser) return;
    
    const token = localStorage.getItem('flicker_token');
    if (!token) return;

    try {
      const response = await fetch('/api/chat/management', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'rename', chatName: oldName, newName })
      });

      if (response.ok) {
        const data = await response.json();
        userChats = data.chats;
      }
    } catch (e) {
      console.error('Failed to rename chat:', e);
    }
  }

  async function logout() {
    localStorage.removeItem('flicker_user');
    localStorage.removeItem('flicker_token');
    currentUser = null;
    goto('/');
  }

  // Subscribe to chat store for refresh
  chatStore.subscribe(store => {
    if (store.refreshChats && currentUser) {
      loadUserChats();
    }
  });

  // Initialize auth check
  checkAuth();
</script>

<div class="flex min-h-screen bg-[#181a1b]">
  <!-- Sidebar -->
  <aside class="w-64 bg-[#1a1c1e] border-r border-gray-800 flex flex-col items-center py-10 pt-4 px-4">
    <a href="/" class="flex flex-row justify-center items-center mb-8">
      <img src="/logo.webp" alt="Flicker AI Logo" class="w-12 h-12 mr-4 rounded-md" />
      <h1 class="text-2xl font-bold tracking-tight text-gray-100 mb-2">Flicker <span class="text-[#ffb300]">AI</span></h1>
	</a>
    
    <!-- Chat List -->
    <div class="flex-1 w-full overflow-y-auto">
      {#if currentUser}
        <div class="space-y-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-300">Chats</h2>
            <button 
              class="text-[#ffb300] hover:text-[#e6a100] text-sm font-medium"
              on:click={() => triggerChatAction('new')}
            >
              + New
            </button>
          </div>
          
          {#if userChats && Object.keys(userChats).length > 0}
            <div class="space-y-1">
              {#each Object.entries(userChats) as [chatName, chat]}
                <div class="group relative">
                  <button
                    class="w-full text-left px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 transition-colors truncate"
                    on:click={() => triggerChatAction('load', chatName)}
                  >
                    {chatName}
                  </button>
                  <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      class="text-gray-400 hover:text-[#ffb300] text-xs"
                      on:click|stopPropagation={() => editChatName(chatName)}
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      class="text-gray-400 hover:text-red-400 text-xs"
                      on:click|stopPropagation={() => deleteChat(chatName)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500 text-sm text-center py-4">No chats yet</p>
          {/if}
        </div>
      {:else}
        <div class="text-center py-8">
          <p class="text-gray-500 text-sm mb-2">Sign in to save chats</p>
          <button 
            class="text-[#ffb300] hover:text-[#e6a100] text-sm font-medium"
            on:click={() => goto('/login')}
          >
            Sign In
          </button>
        </div>
      {/if}
    </div>
    
    <!-- Account buttons at bottom -->
    <div class="mt-auto w-full space-y-2">
      {#if loading}
        <div class="text-gray-400 text-sm text-center">Loading...</div>
      {:else if currentUser}
        <div class="text-gray-300 text-sm text-center mb-2">Welcome, {currentUser.username}</div>
        <button 
          class="w-full bg-[#ffb300] text-black font-semibold py-2 px-4 rounded-md hover:bg-[#e6a100] transition-colors"
          on:click={() => goto('/account')}
        >
          Account
        </button>
        <button 
          class="w-full bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
          on:click={logout}
        >
          Logout
        </button>
      {:else}
        <button 
          class="w-full bg-[#ffb300] text-black font-semibold py-2 px-4 rounded-md hover:bg-[#e6a100] transition-colors"
          on:click={() => goto('/login')}
        >
          Login
        </button>
        <button 
          class="w-full bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
          on:click={() => goto('/signup')}
        >
          Sign Up
        </button>
      {/if}
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="flex-1">
    <slot />
  </main>
</div>

<style>
  main {
    font-family: 'Inter', system-ui, sans-serif;
  }
</style>
