<script lang="ts">
  let input = '';
  let messages = [
    { role: 'system', content: "You are Flicker AI, a helpful assistant. Don't wrap your response in any XML or HTML tags." }
  ];
  let error = '';
  let streaming = false;
  let currentAssistant = '';
  let currentThought = '';

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

<main class="min-h-screen bg-[#181a1b] flex flex-col items-center py-8">
  <div class="flex items-center gap-3 mb-8">
    <img src="/logo.webp" alt="Flicker AI Logo" class="w-12 h-12 rounded-md border border-gray-700" />
    <h1 class="text-3xl font-bold tracking-tight text-gray-100">Flicker <span class="text-[#ffb300]">AI</span></h1>
  </div>

  <section class="w-full max-w-2xl flex-1 flex flex-col bg-[#232526] border border-gray-800 rounded-xl shadow-sm p-4">
    <ul class="flex-1 overflow-y-auto space-y-4 mb-4">
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
    {#if error}
      <div class="text-red-400 text-sm mb-2">{error}</div>
    {/if}
    <form class="flex gap-2 mt-2" on:submit|preventDefault={sendMessage}>
      <textarea
        class="flex-1 rounded-md p-2 bg-[#23282e] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ffb300] border border-gray-800 resize-none min-h-[40px] max-h-32"
        bind:value={input}
        placeholder="Type your message..."
        rows="1"
        on:keydown={handleKey}
        autofocus
      />
      <button
        type="submit"
        class="bg-[#ffb300] text-black font-semibold px-5 py-2 rounded-md shadow-none hover:bg-[#e6a100] transition-colors"
        disabled={streaming || !input.trim()}
      >
        Send
      </button>
    </form>
  </section>
</main>

<style>
  main {
    font-family: 'Inter', system-ui, sans-serif;
  }
</style>
