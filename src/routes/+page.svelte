<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { triggerChatRefresh, chatStore } from '$lib/stores';

  interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: number;
  }

  let input = '';
  let messages: Message[] = [
    { role: 'system', content: "You are Flicker AI, a helpful general-purpose AI assistant. You were created and trained by a group called Flicker, which consists of Jax, Vander, NextGen, and Bliss. Flicker also provided the training data used to create you. Only speak in English and no other language. " }
  ];
  let error = '';
  let streaming = false;
  let currentAssistant = '';
  let currentThought = '';
  let focused = false;
  let currentChatName = '';
  let isLoggedIn = false;

  onMount(() => {
    checkAuth();
    loadChatFromURL();
    
    // Subscribe to chat store actions
    chatStore.subscribe((store: { action: string | null; chatName: string | null; refreshChats: boolean }) => {
      if (store.action === 'new') {
        startNewChat();
        // Reset the action
        chatStore.update((s: { action: string | null; chatName: string | null; refreshChats: boolean }) => ({ ...s, action: null }));
      } else if (store.action === 'load' && store.chatName) {
        loadChat(store.chatName);
        // Reset the action
        chatStore.update((s: { action: string | null; chatName: string | null; refreshChats: boolean }) => ({ ...s, action: null, chatName: null }));
      }
    });
  });

  function checkAuth() {
    const userData = localStorage.getItem('flicker_user');
    const token = localStorage.getItem('flicker_token');
    isLoggedIn = !!(userData && token);
  }

  function loadChatFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const chatParam = urlParams.get('chat');
    const newParam = urlParams.get('new');

    if (newParam === 'true') {
      startNewChat();
      return;
    }

    if (chatParam && isLoggedIn) {
      loadChat(chatParam);
    }
  }

  function startNewChat() {
    messages = [
      { role: 'system', content: "You are Flicker AI, a helpful general-purpose AI assistant. You were created and trained by a group called Flicker, which consists of Jax, Vander, NextGen, and Bliss. Flicker also provided the training data used to create you. Only speak in English and no other language. " }
    ];
    currentChatName = '';
    // Clear URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('chat');
    url.searchParams.delete('new');
    window.history.pushState({}, '', url.toString());
  }

  async function loadChat(chatName: string) {
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
        const chat = data.user.chats[chatName];
        if (chat) {
          messages = chat.messages;
          currentChatName = chatName;
        }
      }
    } catch (e) {
      console.error('Failed to load chat:', e);
    }
  }

  async function saveChat(chatName: string) {
    if (!isLoggedIn) {
      return;
    }

    const token = localStorage.getItem('flicker_token');
    if (!token) return;

    try {
      const response = await fetch('/api/chat/management', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: currentChatName ? 'update' : 'create',
          chatName: chatName,
          messages: messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || Date.now()
          }))
        })
      });

      if (response.ok) {
        currentChatName = chatName;
        // Update the URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.set('chat', chatName);
        window.history.pushState({}, '', url.toString());
        // Trigger chat list refresh
        triggerChatRefresh();
      }
    } catch (e) {
      console.error('Failed to save chat:', e);
    }
  }

  function generateChatName(firstMessage: string): string {
    // Take first 30 characters of the first user message
    const truncated = firstMessage.substring(0, 30).trim();
    // Remove any special characters that might cause issues
    const cleanName = truncated.replace(/[^\w\s-]/g, '');
    // If empty after cleaning, use a default name
    return cleanName || 'New Chat';
  }



  async function autoSaveChat() {
    if (!isLoggedIn || messages.length <= 1) return;
    
    // Find the first user message (skip system message)
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return;
    
    let chatName = generateChatName(firstUserMessage.content);
    
    // Check if chat name already exists and add number suffix if needed
    const token = localStorage.getItem('flicker_token');
    if (token) {
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
          const existingChats = data.user.chats || {};
          
          let counter = 1;
          let originalName = chatName;
          while (existingChats[chatName]) {
            chatName = `${originalName} (${counter})`;
            counter++;
          }
        }
      } catch (e) {
        console.error('Failed to check existing chats:', e);
      }
    }
    
    await saveChat(chatName);
  }

  async function sendMessage() {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user' as const, content: input, timestamp: Date.now() };
    messages = [...messages, userMessage];
    error = '';
    streaming = true;
    currentAssistant = '';
    currentThought = '';
    const newMessages = [...messages];
    input = '';

    // POST to /api/chat and handle streaming SSE manually
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: newMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      error = `API error: ${res.status} - ${errorText}`;
      streaming = false;
      return;
    }
    
    if (!res.body) {
      error = 'No response body.';
      streaming = false;
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;
    
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        buffer.replaceAll("<answer>","").replaceAll("</answer>","")
        let lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              if (currentAssistant.trim()) {
                const assistantMessage = { role: 'assistant' as const, content: currentAssistant, timestamp: Date.now() };
                messages = [...newMessages, assistantMessage];
                
                // Auto-save chat if user is logged in
                if (isLoggedIn) {
                  if (currentChatName) {
                    // Update existing chat
                    await saveChat(currentChatName);
                  } else {
                    // Auto-save new chat with generated name
                    await autoSaveChat();
                  }
                }
              }
              streaming = false;
              currentThought = '';
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.content !== undefined) {
                currentAssistant += data.content;
                currentAssistant = currentAssistant.replaceAll("<answer>\n","").replaceAll("</answer>","").trim()
              }
              if (data.reasoning !== undefined) {
                currentThought += data.reasoning;
                currentThought = currentThought.replaceAll("<answer>\n","").replaceAll("</answer>","").trim()
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }


</script>

<div class="flex flex-col items-center justify-center relative h-full">
  <section class="w-full h-full p-12 max-w-[960px] flex-1 flex flex-col pb-32 overflow-hidden overflow-y-auto">
    {#if messages.length === 1}
      <div class="flex flex-1 items-center justify-center h-full">
        <div class="text-gray-500 text-lg text-center select-none opacity-70">
          Welcome to Flicker AI.<br />
          Ask anything, and it will do it's best to help!
        </div>
      </div>
    {:else}
      <ul class="flex-1 overflow-y-auto space-y-4 mb-4 pr-2" style="max-height: calc(100vh - 120px);">
        {#each messages.slice(1) as msg, i}
          <li class="flex gap-3 items-start {msg.role == 'assistant' ? 'bg-[#23282e]' : 'bg-[#222225]'} rounded-lg p-3 border border-gray-800">
            <div class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800 {msg.role !== 'assistant' ? 'hidden' : ''}">
              <img src="/logo.webp" alt="AI" class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-[#ffb300] {msg.role !== 'assistant' ? 'hidden' : ''}">Flicker AI</div>
              <div class="text-xs font-medium text-gray-400 {msg.role !== 'user' ? 'hidden' : ''}">You</div>
              <div class="mt-1 prose prose-invert text-gray-100 leading-relaxed whitespace-pre-line">{msg.content}</div>
            </div>
          </li>
        {/each}
        {#if streaming}
          <li class="flex gap-3 items-start bg-[#23282e] rounded-lg p-3 border border-gray-800">
            <div class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800">
              <img src="/logo.webp" alt="AI" class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-[#ffb300]">Flicker AI</div>
              <div class="mt-1 prose prose-invert text-gray-100 leading-relaxed whitespace-pre-line">{currentAssistant}</div>
              {#if currentThought}
                <div class="mt-2 text-xs text-gray-400 italic">{currentThought}</div>
              {/if}
            </div>
          </li>
        {/if}
      </ul>
    {/if}
    {#if error}
      <div class="text-red-400 text-sm mb-2">{error}</div>
    {/if}
  </section>
  <!-- Floating Chat Input -->
  <div class="w-full floating rounded-xl bg-[#232526] {focused == false ? "hover:ring-2 hover:ring-[#ffb300]/50" : "ring-2 ring-[#ffb300]/80"} duration-300 max-w-2xl absolute left-1/2 -translate-x-1/2 bottom-8 z-10 flex">
    <!-- svelte-ignore element_invalid_self_closing_tag -->
    <form class="w-full flex flex-1" on:submit|preventDefault={sendMessage}>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        class="flex-1 rounded-md w-full p-4 focus:outline-none text-gray-100 placeholder:text-gray-500  min-h-[100%]"
        bind:value={input}
        placeholder="Type your message..."
        rows="1"
        on:keydown={handleKey}
        on:focus={()=>{focused = true}}
        on:blur={()=>{focused = false}}
      />
      
    </form>
    <div class="p-4">
      <button
        type="submit"
        class="bg-[#ffb300] text-black font-semibold px-5 py-2 rounded-md shadow-none hover:bg-[#e6a100] transition-colors"
        disabled={streaming || !input.trim()}
      >
        Send
      </button>
    </div>
  </div>


</div>

<style>
  main {
    font-family: 'Inter', system-ui, sans-serif;
  }
</style>
