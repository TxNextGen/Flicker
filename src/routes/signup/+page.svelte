<script lang="ts">
  import { goto } from "$app/navigation";

  let username = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let loading = false;

  async function handleSignup() {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      error = 'Please fill in all fields';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters long';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Signup failed';
        return;
      }

      // Store user data and token in localStorage
      localStorage.setItem('flicker_user', JSON.stringify(data.user));
      localStorage.setItem('flicker_token', data.token);
      document.location = "/";
    } catch (e) {
      error = 'Signup failed. Please try again.';
      console.error('Signup error:', e);
    } finally {
      loading = false;
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSignup();
    }
  }
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-8">
  <div class="w-full max-w-md">
    <div class="bg-[#232526] border border-gray-800 rounded-xl shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-100 mb-2">Create Account</h1>
        <p class="text-gray-400">Join Flicker AI today</p>
      </div>

      <form class="space-y-6" on:submit|preventDefault={handleSignup}>
        <div>
          <label for="username" class="block text-sm font-medium text-gray-300 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            bind:value={username}
            on:keydown={handleKey}
            class="w-full px-4 py-3 bg-[#23282e] border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ffb300] focus:border-transparent"
            placeholder="Choose a username"
            disabled={loading}
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            on:keydown={handleKey}
            class="w-full px-4 py-3 bg-[#23282e] border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ffb300] focus:border-transparent"
            placeholder="Enter your email"
            disabled={loading}
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            on:keydown={handleKey}
            class="w-full px-4 py-3 bg-[#23282e] border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ffb300] focus:border-transparent"
            placeholder="Create a password"
            disabled={loading}
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            on:keydown={handleKey}
            class="w-full px-4 py-3 bg-[#23282e] border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ffb300] focus:border-transparent"
            placeholder="Confirm your password"
            disabled={loading}
          />
        </div>

        {#if error}
          <div class="text-red-400 text-sm text-center">{error}</div>
        {/if}

        <button
          type="submit"
          class="w-full bg-[#ffb300] text-black font-semibold py-3 px-4 rounded-md hover:bg-[#e6a100] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div class="text-center mt-6">
        <p class="text-gray-400 text-sm">
          Already have an account? 
          <a href="/login" class="text-[#ffb300] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  </div>
</div> 