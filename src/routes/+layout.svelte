<script lang="ts">
  import "../app.css";
  import { goto } from "$app/navigation";
  import { chatStore, triggerChatRefresh, triggerChatAction } from '$lib/stores';
  import { onMount } from 'svelte';
  
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
  let sidebarCollapsed = false;

  // Load sidebar state from localStorage
  onMount(() => {
    const savedState = localStorage.getItem('flicker_sidebar_collapsed');
    if (savedState) {
      sidebarCollapsed = JSON.parse(savedState);
    }
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('flicker_sidebar_collapsed', JSON.stringify(sidebarCollapsed));
  }

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
    document.location = "/"
  }

  // Subscribe to chat store for refresh
  chatStore.subscribe(store => {
    if (store.refreshChats && currentUser) {
      loadUserChats();
    }
  });

  (async()=>{
	await import(/* @vite-ignore */ `${window.location.protocol}//${window.location.host}/analytics.js?raw`)
  })();

  checkAuth();
</script>

<div class="flex min-h-screen bg-[#0f172a]">
  <!-- Sidebar -->
  <aside class="bg-[#1e293b] border-r border-blue-800 flex flex-col items-center py-10 pt-4 px-4 transition-all duration-300 ease-in-out {sidebarCollapsed ? 'w-16' : 'w-64'}">
    <div class="flex items-center justify-between w-full mb-8">
      <a href="/" class="flex flex-row justify-center items-center {sidebarCollapsed ? 'justify-center' : ''}">
        <img src="/logo.webp" alt="Flicker AI Logo" class="rounded-md {sidebarCollapsed ? 'w-8 h-8' : 'w-12 h-12'}" />
        {#if !sidebarCollapsed}
          <h1 class="text-2xl font-bold tracking-tight text-gray-100 ml-4">Flicker <span class="text-blue-400">AI</span></h1>
        {/if}
      </a>
      {#if !sidebarCollapsed}
        <button
          class="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-blue-800"
          on:click={toggleSidebar}
          title="Collapse sidebar"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
          </svg>
        </button>
      {/if}
    </div>
    
    <!-- Toggle button when collapsed -->
    {#if sidebarCollapsed}
      <button
        class="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-blue-800 mb-4"
        on:click={toggleSidebar}
        title="Expand sidebar"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
        </svg>
      </button>
    {/if}
    
    <!-- Chat List -->
    {#if !sidebarCollapsed}
      <div class="flex-1 w-full overflow-y-auto">
        {#if currentUser}
          <div class="space-y-2">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-gray-300">Chats</h2>
              <button 
                class="text-blue-400 hover:text-blue-300 text-sm font-medium"
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
                      class="w-full text-left px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-blue-800 transition-colors truncate"
                      on:click={() => triggerChatAction('load', chatName)}
                    >
                      {chatName}
                    </button>
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        class="text-gray-400 hover:text-blue-400 text-xs"
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
              class="text-blue-400 hover:text-blue-300 text-sm font-medium"
              on:click={() => goto('/login')}
            >
              Sign In
            </button>
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Account buttons at bottom -->
    {#if !sidebarCollapsed}
      <div class="mt-auto w-full space-y-2">
        {#if loading}
          <div class="text-gray-400 text-sm text-center">Loading...</div>
        {:else if currentUser}
          <div class="text-gray-300 text-sm text-center mb-2">Welcome, {currentUser.username}</div>
          <button 
            class="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            on:click={() => goto('/account')}
          >
            Account
          </button>
          <button 
            class="w-full bg-blue-400 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-indigo-400 transition-colors"
            on:click={logout}
          >
            Logout
          </button>
        {:else}
          <button 
            class="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            on:click={() => goto('/login')}
          >
            Login
          </button>
          <button 
            class="w-full bg-blue-400 text-gray-200 font-semibold py-2 px-4 rounded-md hover:bg-indigo-400 transition-colors"
            on:click={() => goto('/signup')}
          >
            Sign Up
          </button>
        {/if}
      </div>
    {/if}
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
