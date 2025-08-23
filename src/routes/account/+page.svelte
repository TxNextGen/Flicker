<script lang="ts">
  import { goto } from "$app/navigation";

  interface User {
    username: string;
    email: string;
    chats: {
      [id: string]: { messages: Array<{ role: string; content: string; timestamp?: number }>; lastUpdated?: number };
    };
  }

  let user: User | null = null;
  let loading = true;
  let error = "";

  async function loadUserData() {
    const userData = localStorage.getItem("flicker_user");
    const token = localStorage.getItem("flicker_token");

    if (!userData || !token) {
      goto("/login");
      return;
    }

    try {
      const response = await fetch("/api/auth/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem("flicker_user");
          localStorage.removeItem("flicker_token");
          goto("/login");
          return;
        }
        error = data.error || "Failed to load user data";
        return;
      }

      const data = await response.json();
      user = data.user;
      error = "";
    } catch (e) {
      error = "Failed to load user data";
      console.error("Load user error:", e);
    } finally {
      loading = false;
    }
  }

  async function deleteChat(chatId: string) {
    if (!user) return;

    const token = localStorage.getItem("flicker_token");
    if (!token) {
      goto("/login");
      return;
    }

    try {
      const response = await fetch("/api/auth/user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem("flicker_user");
          localStorage.removeItem("flicker_token");
          goto("/login");
          return;
        }
        error = data.error || "Failed to delete chat";
        return;
      }

      // Remove chat from local state
      const updatedUser = { ...user };
      delete updatedUser.chats[chatId];
      user = updatedUser;
      error = "";
    } catch (e) {
      error = "Failed to delete chat";
      console.error("Delete chat error:", e);
    }
  }

  function formatDate(timestamp: number | string | undefined) {
    if (timestamp === undefined || timestamp === null) return "Unknown date";
    // accept numeric timestamps or ISO strings
    const t = typeof timestamp === "number" ? timestamp : Number(timestamp);
    const d = new Date(Number.isFinite(t) ? t : timestamp);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString();
  }

  // Load user data on component mount
  loadUserData();
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-8">
  <div class="w-full max-w-4xl">
    <div class="bg-gradient-to-br from-gray-900 via-purple-950 to-violet-950 border border-purple-500/30 rounded-xl shadow-lg p-8">
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
        <div class="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-md border border-purple-500/20 rounded-lg p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-100 mb-4">
            Profile Information
          </h2>
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
        <div class="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-md border border-purple-500/20 rounded-lg p-6 shadow-xl">
          <h2 class="text-xl font-semibold text-gray-100 mb-4 bg-gradient-to-r from-white via-purple-200 to-violet-300 bg-clip-text text-transparent">Chat History</h2>
          {#if Object.keys(user.chats).length === 0}
            <p class="text-gray-300 text-center py-8">
              No saved chats yet. Start a conversation to see your history here.
            </p>
          {:else}
            <div class="space-y-3">
              {#each Object.entries(user.chats) as [chatId, chat]}
                <div class="group bg-gradient-to-br from-gray-800/30 to-purple-900/20 backdrop-blur-md border border-purple-500/30 hover:border-purple-500/50 rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-purple-500/10">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <h3 class="text-gray-100 font-medium">Chat {chatId}</h3>
                      <p class="text-gray-400 text-sm">
                        {chat.messages.length} messages • {formatDate(chat.lastUpdated)}
                      </p>
                      {#if chat.messages.length > 0}
                        <p class="text-gray-500 text-sm mt-1 truncate">
                          {chat.messages[0].content.substring(0, 20)}...
                        </p>
                      {/if}
                    </div>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        class="bg-gradient-to-br from-purple-500/20 to-violet-500/20 hover:from-purple-500/30 hover:to-violet-500/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 hover:scale-105"
                        on:click={() => goto(`/?chat=${chatId}`)}
                      >
                        Open
                      </button>
                      <button
                        class="bg-gradient-to-br from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 hover:scale-105"
                        on:click={() => deleteChat(chatId)}
                      >
                        Delete
                      </button>
                    </div>
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