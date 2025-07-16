<script lang="ts">
  import { goto } from "$app/navigation";

  let username = "";
  let password = "";
  let error = "";
  let loading = false;

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      error = "Please fill in all fields";
      return;
    }

    loading = true;
    error = "";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || "Login failed";
        return;
      }

      // Store user data and token in localStorage
      localStorage.setItem("flicker_user", JSON.stringify(data.user));
      localStorage.setItem("flicker_token", data.token);
      document.location = "/";
    } catch (e) {
      error = "Login failed. Please try again.";
      console.error("Login error:", e);
    } finally {
      loading = false;
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleLogin();
    }
  }
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-8">
  <div class="w-full max-w-md">
    <div class="bg-[e6e6ff] border border-[#846DCF] rounded-xl shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-100 mb-2">Welcome Back</h1>
        <p class="text-gray-400">Sign in to your Flicker AI account</p>
      </div>

      <form class="space-y-6" on:submit|preventDefault={handleLogin}>
        <div>
          <label
            for="username"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Username or Email
          </label>
          <input
            id="username"
            type="text"
            bind:value={username}
            on:keydown={handleKey}
            class="w-full px-4 py-3 bg-[e6e6ff] border border-[#846DCF] rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a693e0] focus:border-transparent"
            placeholder="Enter your username or email"
            disabled={loading}
          />
        </div>

        <div>
          <label
            for="password"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            on:keydown={handleKey}
            class="w-full px-4 py-3 bg-[e6e6ff] border border-[#846DCF] rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a693e0] focus:border-transparent"
            placeholder="Enter your password"
            disabled={loading}
          />
        </div>

        {#if error}
          <div class="text-red-400 text-sm text-center">{error}</div>
        {/if}

        <button
          type="submit"
          class="w-full bg-[#4f46e5] text-white font-semibold py-3 px-4 rounded-md hover:bg-[#4338ca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div class="text-center mt-6">
        <p class="text-gray-400 text-sm">
          Don't have an account?
          <a href="/signup" class="text-[#846DCF] hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  </div>
</div>
