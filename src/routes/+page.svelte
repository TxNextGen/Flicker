<script lang="ts">
  let input = '';
  let messages = [
    { role: 'system', content: "You are Flicker AI, a helpful general-purpose AI assistant. You were created and trained by a group called Flicker, which consists of Jax, Vander, NextGen, and Bliss. Only speak in English and no other language. " }
  ];
  let error = '';
  let streaming = false;
  let currentAssistant = '';
  let currentThought = '';
  let focused = false;
  async function sendMessage() {
    if (!input.trim()) return;
    messages = [...messages, { role: 'user', content: input }];
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
      body: JSON.stringify({ messages: newMessages })
    });
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
                messages = [...newMessages, { role: 'assistant', content: currentAssistant }];
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

<div class="flex min-h-screen bg-[#181a1b]">
  <!-- Sidebar -->
  <aside class="w-64 bg-[#1a1c1e] border-r border-gray-800 flex flex-col items-center py-10 pt-4 px-4">
    <div class="flex flex-row justify-center items-center">
      <img src="/logo.webp" alt="Flicker AI Logo" class="w-12 h-12 mr-4 rounded-md" />
      <h1 class="text-2xl font-bold tracking-tight text-gray-100 mb-2">Flicker <span class="text-[#ffb300]">AI</span></h1>
    </div>
    <!-- Future sidebar content goes here -->
  </aside>

  <!-- Main Chat Area -->
  <main class="flex-1 flex flex-col items-center justify-center relative">
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
                <div class="mt-1 text-base text-gray-100 leading-relaxed whitespace-pre-line">{msg.content}</div>
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
                <div class="mt-1 text-base text-gray-100 leading-relaxed whitespace-pre-line">{currentAssistant}</div>
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
          class="flex-1 rounded-md w-full p-3 focus:outline-none text-gray-100 placeholder:text-gray-500  min-h-[100%]"
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
  </main>
</div>

<style>
  main {
    font-family: 'Inter', system-ui, sans-serif;
  }
</style>
