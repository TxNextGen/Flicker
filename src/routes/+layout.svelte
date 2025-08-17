<script lang="ts">
  import "../app.css";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    chatStore,
    triggerChatRefresh,
    triggerChatAction,
  } from "$lib/stores";
  import { onMount } from "svelte";

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
  

  let showDeletePopup = false;
  let showRenamePopup = false;
  let chatToDelete = "";
  let chatToRename = "";
  let newChatName = "";


  onMount(() => {
    const savedState = localStorage.getItem("flicker_sidebar_collapsed");
    if (savedState) {
      sidebarCollapsed = JSON.parse(savedState);
    }
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem(
      "flicker_sidebar_collapsed",
      JSON.stringify(sidebarCollapsed),
    );
  }

  async function checkAuth() {
    const userData = localStorage.getItem("flicker_user");
    const token = localStorage.getItem("flicker_token");

    if (userData && token) {
      try {
        currentUser = JSON.parse(userData);
        await loadUserChats();
      } catch (e) {
        localStorage.removeItem("flicker_user");
        localStorage.removeItem("flicker_token");
      }
    }
    loading = false;
  }

  async function loadUserChats() {
    if (!currentUser) return;

    const token = localStorage.getItem("flicker_token");
    if (!token) return;

    try {
      const response = await fetch("/api/auth/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        userChats = data.user.chats || {};
      }
    } catch (e) {
      console.error("Failed to load user chats:", e);
    }
  }

  
  function getCurrentChatName(): string {
    if (typeof window !== 'undefined') {
      const urlParts = window.location.pathname.split('/');
      if (urlParts[1] === 'chat' && urlParts[2]) {
        return decodeURIComponent(urlParts[2]);
      }
    }
    return '';
  }


  function isCurrentlyInChat(): boolean {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/chat/');
    }
    return false;
  }


  function showDeleteConfirmation(chatName: string) {
    chatToDelete = chatName;
    showDeletePopup = true;
  }


  async function confirmDelete() {
    if (!currentUser || !chatToDelete) return;

    const token = localStorage.getItem("flicker_token");
    if (!token) return;

    try {
      const response = await fetch("/api/chat/management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete", chatName: chatToDelete }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Failed to delete chat:", e);
    }
    
    showDeletePopup = false;
    chatToDelete = "";
  }

 
  function cancelDelete() {
    showDeletePopup = false;
    chatToDelete = "";
  }


  function showRenameDialog(chatName: string) {
    chatToRename = chatName;
    newChatName = chatName;
    showRenamePopup = true;
  }


  async function confirmRename() {
    if (!currentUser || !chatToRename || !newChatName || newChatName === chatToRename) {
      cancelRename();
      return;
    }

    const token = localStorage.getItem("flicker_token");
    if (!token) return;

    try {
      const response = await fetch("/api/chat/management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "rename", chatName: chatToRename, newName: newChatName }),
      });

      if (response.ok) {
        const data = await response.json();
        userChats = data.chats;
      }
    } catch (e) {
      console.error("Failed to rename chat:", e);
    }
    
    cancelRename();
  }

  
  function cancelRename() {
    showRenamePopup = false;
    chatToRename = "";
    newChatName = "";
  }

  
  function handleNewChat() {
    triggerChatAction("new");
  }

  async function logout() {
    localStorage.removeItem("flicker_user");
    localStorage.removeItem("flicker_token");
    currentUser = null;
    document.location = "/";
  }


  chatStore.subscribe((store) => {
    if (store.refreshChats && currentUser) {
      loadUserChats();
    }
  });

  (async () => {
    await import(
      /* @vite-ignore */ `${window.location.protocol}//${window.location.host}/analytics.js?raw`
    );
  })();

  checkAuth();
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</svelte:head>

<div class="flex min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-violet-950">
  <!-- Delete Confirmation Modal -->
  {#if showDeletePopup}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div class="bg-gradient-to-br from-gray-800/90 to-purple-950/90 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-white text-xl font-semibold mb-4">Delete Chat</h3>
        <p class="text-gray-300 mb-6">Are you sure you want to delete <span class="text-purple-300 font-medium">"{chatToDelete}"</span>? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button
            class="px-6 py-2 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500/80 transition-all duration-200 backdrop-blur-sm"
            on:click={cancelDelete}
          >
            Cancel
          </button>
          <button
            class="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg"
            on:click={confirmDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Rename Modal -->
  {#if showRenamePopup}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-gradient-to-br from-gray-800/90 to-purple-950/90 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-white text-xl font-semibold mb-4">Rename Chat</h3>
        <input
          type="text"
          bind:value={newChatName}
          class="w-full px-4 py-3 bg-gray-900/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/60 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm mb-6"
          placeholder="Enter new chat name"
          on:keydown={(e) => e.key === 'Enter' && confirmRename()}
        />
        <div class="flex justify-end space-x-3">
          <button
            class="px-6 py-2 bg-gray-600/80 text-white rounded-lg hover:bg-gray-500/80 transition-all duration-200 backdrop-blur-sm"
            on:click={cancelRename}
          >
            Cancel
          </button>
          <button
            class="px-6 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-lg hover:from-purple-600 hover:to-violet-700 transition-all duration-200 shadow-lg"
            on:click={confirmRename}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Sidebar -->
  <aside
    class="bg-gradient-to-b from-gray-900/95 to-purple-950/95 backdrop-blur-md border-r border-purple-500/20 flex flex-col py-6 px-4 transition-all duration-300 ease-in-out shadow-2xl {sidebarCollapsed
      ? 'w-18'
      : 'w-80'}"
  >
    <!-- Header -->
    <div class="flex items-center justify-between w-full mb-8">
      <div class="flex items-center {sidebarCollapsed ? 'justify-center' : ''}">
        <h1
          class="text-2xl  font-bold bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent flex items-center {sidebarCollapsed
            ? 'hidden'
            : ''}"
          >
          Flicker
        </h1>
      </div>
      <button
        class="text-gray-400 hover:text-purple-300 transition-all duration-200 w-10 h-10 rounded-lg hover:bg-purple-500/20 flex items-center justify-center backdrop-blur-sm"
        on:click={toggleSidebar}
        title="{sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar"
      >
        <svg
          class="w-5 h-5 transition-transform duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {#if sidebarCollapsed}
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            ></path>
          {:else}
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            ></path>
          {/if}
        </svg>
      </button>
    </div>

    <!-- New Chat Button -->
    {#if currentUser && !loading}
      {#if !sidebarCollapsed}
        <button
          class="w-full bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 text-gray-200 font-medium py-3 px-4 rounded-xl hover:from-purple-500/30 hover:to-violet-500/30 hover:border-purple-400/50 transition-all duration-200 mb-6 flex items-center justify-center gap-2 backdrop-blur-sm shadow-lg"
          on:click={handleNewChat}
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          New Chat
        </button>
      {:else}
        <button
          class="w-full bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 text-gray-200 font-medium p-3 rounded-xl hover:from-purple-500/30 hover:to-violet-500/30 hover:border-purple-400/50 transition-all duration-200 mb-6 flex items-center justify-center backdrop-blur-sm shadow-lg"
          on:click={handleNewChat}
          title="New Chat"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
        </button>
      {/if}
    {/if}

    <!-- Chat List -->
    {#if !sidebarCollapsed}
      <div class="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
        {#if currentUser}
          {#if userChats && Object.keys(userChats).length > 0}
            <div class="space-y-2">
              {#each Object.entries(userChats) as [chatName, chat]}
                <div class="group relative">
                  <button
                    class="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all duration-200 truncate backdrop-blur-sm border border-transparent hover:border-purple-500/30"
                    on:click={() => triggerChatAction("load", chatName)}
                  >
                    {chatName}
                  </button>
                  <div
                    class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1"
                  >
                    <button
                      class="text-gray-400 hover:text-purple-300 p-2 rounded-md hover:bg-purple-500/20 transition-all duration-200"
                      on:click|stopPropagation={() => showRenameDialog(chatName)}
                      title="Rename"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      class="text-gray-400 hover:text-red-400 p-2 rounded-md hover:bg-red-500/20 transition-all duration-200"
                      on:click|stopPropagation={() => showDeleteConfirmation(chatName)}
                      title="Delete"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500 text-sm text-center py-8">No chats yet</p>
          {/if}
        {:else if !loading}
          <div class="text-center py-8">
            <p class="text-gray-400 text-sm mb-4">Sign in to save chats</p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- User Section -->
    {#if !sidebarCollapsed}
      <div class="mt-auto pt-6 border-t border-purple-500/20">
        {#if loading}
          <div class="text-gray-400 text-sm text-center py-4">
            <div class="animate-pulse">Loading...</div>
          </div>
        {:else if currentUser}
          <div class="text-gray-300 text-sm mb-4 px-2 font-medium">
            Welcome, <span class="text-purple-300">{currentUser.username}</span>
          </div>
          <div class="space-y-3">
            <button
              class="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white font-medium py-3 px-4 rounded-lg hover:from-purple-600 hover:to-violet-700 transition-all duration-200 text-sm shadow-lg"
              on:click={() => goto("/account")}
            >
              Account
            </button>
            <button
              class="w-full bg-transparent border border-purple-500/50 text-purple-300 font-medium py-3 px-4 rounded-lg hover:bg-purple-500/20 hover:border-purple-400/70 transition-all duration-200 text-sm backdrop-blur-sm"
              on:click={logout}
            >
              Logout
            </button>
          </div>
        {:else}
          <div class="space-y-3">
            <button
              class="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white font-medium py-3 px-4 rounded-lg hover:from-purple-600 hover:to-violet-700 transition-all duration-200 text-sm shadow-lg"
              on:click={() => goto("/login")}
            >
              Sign In
            </button>
            <button
              class="w-full bg-transparent border border-purple-500/50 text-purple-300 font-medium py-3 px-4 rounded-lg hover:bg-purple-500/20 hover:border-purple-400/70 transition-all duration-200 text-sm backdrop-blur-sm"
              on:click={() => goto("/signup")}
            >
              Sign Up
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Collapsed User Section -->
      <div
        class="mt-auto pt-4 border-t border-purple-500/20 flex flex-col items-center space-y-3"
      >
        {#if currentUser}
          <button
            class="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-full flex items-center justify-center hover:from-purple-600 hover:to-violet-700 transition-all duration-200 shadow-lg"
            on:click={() => goto("/account")}
            title="Account"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
          </button>
          <button
            class="w-12 h-12 bg-transparent border border-purple-500/50 text-purple-300 rounded-full flex items-center justify-center hover:bg-purple-500/20 hover:border-purple-400/70 transition-all duration-200 backdrop-blur-sm"
            on:click={logout}
            title="Logout"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              ></path>
            </svg>
          </button>
        {:else if !loading}
          <button
            class="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-full flex items-center justify-center hover:from-purple-600 hover:to-violet-700 transition-all duration-200 shadow-lg"
            on:click={() => goto("/login")}
            title="Sign In"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              ></path>
            </svg>
          </button>
        {/if}
      </div>
    {/if}
  </aside>

  <!-- Main Content -->
  <main class="flex-1 bg-gradient-to-br from-gray-900/50 via-purple-950/30 to-violet-950/50 backdrop-blur-sm">
    <slot />
  </main>
</div>

<style>
  main {
    font-family: "Inter", system-ui, sans-serif;
  }
  
  /* Custom scrollbar */
  .scrollbar-thin {
    scrollbar-width: thin;
  }
  
  .scrollbar-thumb-purple-500\/30::-webkit-scrollbar-thumb {
    background-color: rgba(168, 85, 247, 0.3);
    border-radius: 6px;
  }
  
  .scrollbar-track-transparent::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar {
    width: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background-color: rgba(168, 85, 247, 0.3);
    border-radius: 6px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(168, 85, 247, 0.5);
  }
</style>