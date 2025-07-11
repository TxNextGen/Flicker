<script lang="ts">
  import "../app.css";
  import { getDB, setDB } from "$lib";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  
  interface User {
    username: string;
    email: string;
  }

  let currentUser: User | null = null;
  let loading = true;

  // Check if user is logged in on page load
  async function checkAuth() {
    const userData = localStorage.getItem('flicker_user');
    if (userData) {
      try {
        currentUser = JSON.parse(userData);
      } catch (e) {
        localStorage.removeItem('flicker_user');
      }
    }
    loading = false;
  }

  async function logout() {
    localStorage.removeItem('flicker_user');
    localStorage.removeItem('flicker_token');
    currentUser = null;
    goto('/');
  }

  // Initialize auth check
  checkAuth();
</script>

<div class="flex min-h-screen bg-[#181a1b]">
  <!-- Sidebar -->
  <aside class="w-64 bg-[#1a1c1e] border-r border-gray-800 flex flex-col items-center py-10 pt-4 px-4">
    <div class="flex flex-row justify-center items-center mb-8">
      <img src="/logo.webp" alt="Flicker AI Logo" class="w-12 h-12 mr-4 rounded-md" />
      <h1 class="text-2xl font-bold tracking-tight text-gray-100 mb-2">Flicker <span class="text-[#ffb300]">AI</span></h1>
    </div>
    
    <!-- Future sidebar content goes here -->
    
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
