<script lang="ts">
  import "../app.css";
  import { goto } from "$app/navigation";
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

  // Load sidebar state from localStorage
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

  async function deleteChat(chatName: string) {
    if (!currentUser) return;

    const token = localStorage.getItem("flicker_token");
    if (!token) return;

    try {
      const response = await fetch("/api/chat/management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "delete", chatName }),
      });

      if (response.ok) {
        const data = await response.json();
        userChats = data.chats;
        triggerChatRefresh();
      }
    } catch (e) {
      console.error("Failed to delete chat:", e);
    }
  }

  function editChatName(chatName: string) {
    const newName = prompt("Enter new chat name:", chatName);
    if (newName && newName !== chatName) {
      renameChat(chatName, newName);
    }
  }

  async function renameChat(oldName: string, newName: string) {
    if (!currentUser) return;

    const token = localStorage.getItem("flicker_token");
    if (!token) return;

    try {
      const response = await fetch("/api/chat/management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "rename", chatName: oldName, newName }),
      });

      if (response.ok) {
        const data = await response.json();
        userChats = data.chats;
      }
    } catch (e) {
      console.error("Failed to rename chat:", e);
    }
  }

  async function logout() {
    localStorage.removeItem("flicker_user");
    localStorage.removeItem("flicker_token");
    currentUser = null;
    document.location = "/";
  }

  // Subscribe to chat store for refresh
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

<div class="flex min-h-screen bg-[#0f0f23]">
  <!-- Sidebar -->
  <aside
    class="bg-[#0f0f23] border-r border-[#1e1e3a] flex flex-col py-4 px-3 transition-all duration-300 ease-in-out {sidebarCollapsed
      ? 'w-16'
      : 'w-80'}"
  >
    <div class="flex items-center justify-between w-full mb-6">
      <div class="flex items-center {sidebarCollapsed ? 'justify-center' : ''}">
        <h1
          class="text-xl font-semibold text-white {sidebarCollapsed
            ? 'hidden'
            : ''}"
        >
          Flicker
        </h1>
      </div>
      <button
        class="text-gray-400 hover:text-white transition-colors w-10 h-10 rounded-md hover:bg-[#1e1e3a] flex items-center justify-center"
        on:click={toggleSidebar}
        title="{sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar"
      >
        <svg
          class="w-5 h-5"
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

    <!-- New Chat Button - Only show when user is logged in -->
    {#if currentUser && !loading}
      {#if !sidebarCollapsed}
        <button
          class="w-full bg-transparent border border-[#4a5568] text-gray-200 font-medium py-3 px-4 rounded-lg hover:bg-[#1e1e3a] transition-colors mb-6 flex items-center justify-center gap-2"
          on:click={() => triggerChatAction("new")}
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
          class="w-full bg-transparent border border-[#4a5568] text-gray-200 font-medium p-3 rounded-lg hover:bg-[#1e1e3a] transition-colors mb-6 flex items-center justify-center"
          on:click={() => triggerChatAction("new")}
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
      <div class="flex-1 overflow-y-auto">
        {#if currentUser}
          {#if userChats && Object.keys(userChats).length > 0}
            <div class="space-y-1">
              {#each Object.entries(userChats) as [chatName, chat]}
                <div class="group relative">
                  <button
                    class="w-full text-left px-3 py-4 rounded-md text-sm text-gray-300 hover:bg-[#1e1e3a] transition-colors truncate"
                    on:click={() => triggerChatAction("load", chatName)}
                  >
                    {chatName}
                  </button>
                  <div
                    class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                  >
                    <button
                      class="text-gray-400 hover:text-blue-400 text-xs p-2"
                      on:click|stopPropagation={() => editChatName(chatName)}
                      title="Rename"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      class="text-gray-400 hover:text-red-400 text-xs p-2"
                      on:click|stopPropagation={() => deleteChat(chatName)}
                      title="Delete"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-gray-500 text-sm text-center py-4">No chats yet</p>
          {/if}
        {:else if !loading}
          <div class="text-center py-8">
            <p class="text-gray-500 text-sm mb-4">Sign in to save chats</p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Account buttons at bottom -->
    {#if !sidebarCollapsed}
      <div class="mt-auto pt-4 border-t border-[#1e1e3a]">
        {#if loading}
          <div class="text-gray-400 text-sm text-center py-2">Loading...</div>
        {:else if currentUser}
          <div class="text-gray-300 text-sm mb-3 px-2">
            Welcome, {currentUser.username}
          </div>
          <div class="space-y-2">
            <button
              class="w-full bg-[#4f46e5] text-white font-medium py-2 px-3 rounded-md hover:bg-[#4338ca] transition-colors text-sm"
              on:click={() => goto("/account")}
            >
              Account
            </button>
            <button
              class="w-full bg-transparent border border-[#4f46e5] text-[#4f46e5] font-medium py-2 px-3 rounded-md hover:bg-[#4f46e5] hover:text-white transition-colors text-sm"
              on:click={logout}
            >
              Logout
            </button>
          </div>
        {:else}
          <div class="space-y-2">
            <button
              class="w-full bg-[#4f46e5] text-white font-medium py-2 px-3 rounded-md hover:bg-[#4338ca] transition-colors text-sm"
              on:click={() => goto("/login")}
            >
              Sign In
            </button>
            <button
              class="w-full bg-transparent border border-[#4f46e5] text-[#4f46e5] font-medium py-2 px-3 rounded-md hover:bg-[#4f46e5] hover:text-white transition-colors text-sm"
              on:click={() => goto("/signup")}
            >
              Sign Up
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Collapsed sidebar account section -->
      <div
        class="mt-auto pt-4 border-t border-[#1e1e3a] flex flex-col items-center space-y-2"
      >
        {#if currentUser}
          <button
            class="w-10 h-10 bg-[#4f46e5] text-white rounded-full flex items-center justify-center hover:bg-[#4338ca] transition-colors"
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
            class="w-10 h-10 bg-transparent border border-[#4f46e5] text-[#4f46e5] rounded-full flex items-center justify-center hover:bg-[#4f46e5] hover:text-white transition-colors"
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
            class="w-10 h-10 bg-[#4f46e5] text-white rounded-full flex items-center justify-center hover:bg-[#4338ca] transition-colors"
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

  <!-- Main Content Area -->
  <main class="flex-1 bg-[#0f0f23]">
    <slot />
  </main>
</div>

<style>
  main {
    font-family: "Inter", system-ui, sans-serif;
  }
</style>