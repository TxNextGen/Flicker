<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { triggerChatRefresh, chatStore } from "$lib/stores";
  import { marked } from "marked";

  interface Message {
    role: "system" | "user" | "assistant";
    content: string | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string }; viewing_url?: string }
    >;
    timestamp?: number;
    parsedContent?: string;
  }

  let input = "";
  let messages: Message[] = [
    {
      role: "system",
      content:
        "You are Flicker AI, a helpful general-purpose AI assistant. You were created and trained by a group called Flicker, which consists of Jax, Vander, NextGen, and Bliss. Flicker also provided the training data used to create you. Only speak in English and no other language. ",
    },
  ];
  let error = "";
  let streaming = false;
  let currentAssistant = "";
  let currentThought = "";
  let currentAssistantParsed = "";
  let focused = false;
  let currentChatName = "";
  let isLoggedIn = false;
  let chatCache: { [key: string]: Message[] } = {};
  let isLoadingChat = false;
  let imagePreviewUrl = "";
  let uploading = false;
  let imageAttached = false;
  let modelOptimizedUrl = "";
  let viewingOptimizedUrl = "";
  let imageUploadConfirmation = false;

  let examplePrompts = [
    {
      title: "Write a story",
      icon: "📝",
      prompt: "Write a short story about a robot learning to paint"
    },
    {
      title: "Explain something",
      icon: "🤔",
      prompt: "Explain quantum computing in simple terms"
    },
    {
      title: "Help with code",
      icon: "💻",
      prompt: "Help me debug this JavaScript function"
    },
    {
      title: "Creative writing",
      icon: "✨",
      prompt: "Write a poem about the ocean"
    }
  ];

  onMount(() => {
    checkAuth();
    loadChatFromURL();

    // Subscribe to chat store actions
    let lastAction = "";
    let lastChatName = "";

    chatStore.subscribe(
      (store: {
        action: string | null;
        chatName: string | null;
        refreshChats: boolean;
      }) => {
        // Prevent duplicate actions
        if (store.action === "new" && lastAction !== "new") {
          lastAction = "new";
          startNewChat();
          // Reset the action
          chatStore.update(
            (s: {
              action: string | null;
              chatName: string | null;
              refreshChats: boolean;
            }) => ({ ...s, action: null }),
          );
        } else if (
          store.action === "load" &&
          store.chatName &&
          (lastAction !== "load" || lastChatName !== store.chatName)
        ) {
          lastAction = "load";
          lastChatName = store.chatName;
          loadChat(store.chatName);
          // Reset the action
          chatStore.update(
            (s: {
              action: string | null;
              chatName: string | null;
              refreshChats: boolean;
            }) => ({ ...s, action: null, chatName: null }),
          );
        }
      },
    );
  });

  function checkAuth() {
    const userData = localStorage.getItem("flicker_user");
    const token = localStorage.getItem("flicker_token");
    isLoggedIn = !!(userData && token);
  }

  function loadChatFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const chatParam = urlParams.get("chat");
    const newParam = urlParams.get("new");

    if (newParam === "true") {
      startNewChat();
      return;
    }

    if (chatParam && isLoggedIn) {
      loadChat(chatParam);
    }
  }

  function startNewChat() {
    messages = [
      {
        role: "system",
        content:
          "You are Flicker AI, a helpful general-purpose AI assistant. You were created and trained by a group called Flicker, which consists of Jax, Vander, NextGen, and Bliss. Flicker also provided the training data used to create you. Only speak in English and no other language. ",
      },
    ];
    currentChatName = "";
    // Clear URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete("chat");
    url.searchParams.delete("new");
    window.history.pushState({}, "", url.toString());
  }

  async function loadChat(chatName: string) {
    if (isLoadingChat) return; // Prevent duplicate requests
    if (currentChatName === chatName) return; // Already loaded

    const token = localStorage.getItem("flicker_token");
    if (!token) return;

    // Check cache first
    if (chatCache[chatName]) {
      messages = chatCache[chatName];
      currentChatName = chatName;
      return;
    }

    isLoadingChat = true;

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
        const chat = data.user.chats[chatName];
        if (chat) {
          // Parse markdown for existing assistant messages
          const parsedMessages = await Promise.all(
            chat.messages.map(async (msg: Message) => {
              if (msg.role === "assistant" && !msg.parsedContent) {
                return {
                  ...msg,
                  parsedContent: await parseMarkdown(msg.content),
                };
              }
              return msg;
            }),
          );
          messages = parsedMessages;
          currentChatName = chatName;

          // Cache the parsed messages
          chatCache[chatName] = parsedMessages;
        }
      }
    } catch (e) {
      console.error("Failed to load chat:", e);
    } finally {
      isLoadingChat = false;
    }
  }

  async function saveChat(chatName: string) {
    if (!isLoggedIn) {
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
        body: JSON.stringify({
          action: currentChatName ? "update" : "create",
          chatName: chatName,
          messages: messages.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp || Date.now(),
          })),
        }),
      });

      if (response.ok) {
        currentChatName = chatName;
        // Update the URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.set("chat", chatName);
        window.history.pushState({}, "", url.toString());

        // Update cache with current messages
        chatCache[chatName] = messages;

        // Trigger chat list refresh
        triggerChatRefresh();
      }
    } catch (e) {
      console.error("Failed to save chat:", e);
    }
  }

  function generateChatName(firstMessage: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>): string {
    let base = "";
    if (typeof firstMessage === "string") {
      base = firstMessage;
    } else if (Array.isArray(firstMessage)) {
      base = firstMessage.filter(p => p.type === "text").map(p => (p as { type: "text"; text: string }).text).join(" ");
    }
    // Take first 30 characters of the first user message
    const truncated = base.substring(0, 30).trim();
    // Remove any special characters that might cause issues
    const cleanName = truncated.replace(/[^\w\s-]/g, "");
    // If empty after cleaning, use a default name
    return cleanName || "New Chat";
  }

  async function autoSaveChat() {
    if (!isLoggedIn || messages.length <= 1) return;

    // Find the first user message (skip system message)
    const firstUserMessage = messages.find((msg) => msg.role === "user");
    if (!firstUserMessage) return;

    let chatName = generateChatName(firstUserMessage.content);

    // Check if chat name already exists and add number suffix if needed
    const token = localStorage.getItem("flicker_token");
    if (token) {
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
          const existingChats = data.user.chats || {};

          let counter = 1;
          let originalName = chatName;
          while (existingChats[chatName]) {
            chatName = `${originalName} (${counter})`;
            counter++;
          }
        }
      } catch (e) {
        console.error("Failed to check existing chats:", e);
      }
    }

    await saveChat(chatName);
  }

  async function sendMessage() {
    if (!input.trim()) return;

    // Clear streaming state immediately
    currentAssistant = "";
    currentAssistantParsed = "";
    currentThought = "";

    let userMessage;
    if (imageAttached && modelOptimizedUrl && viewingOptimizedUrl) {
      const contentArr = [
        { type: "text" as const, text: input },
        { type: "image_url" as const, image_url: { url: modelOptimizedUrl }, viewing_url: viewingOptimizedUrl }
      ];
      userMessage = {
        role: "user" as const,
        content: contentArr,
        timestamp: Date.now(),
        parsedContent: await parseMarkdown(contentArr)
      };
    } else {
      userMessage = {
        role: "user" as const,
        content: input,
        timestamp: Date.now(),
        parsedContent: await parseMarkdown(input)
      };
    }
    messages = [...messages, userMessage];
    error = "";
    streaming = true;
    const newMessages = [...messages];
    input = "";
    modelOptimizedUrl = "";
    viewingOptimizedUrl = "";
    imageAttached = false;

    // POST to /api/chat and handle streaming SSE manually
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: newMessages.map((msg) => {
          if (Array.isArray(msg.content)) {
            // If multimodal, only send modelOptimized url to the model
            return {
              role: msg.role,
              content: msg.content.map(part =>
                part.type === "image_url"
                  ? { type: "image_url", image_url: { url: part.image_url.url } }
                  : part
              ),
            };
          } else {
            return {
              role: msg.role,
              content: msg.content,
            };
          }
        }),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      error = `API error: ${res.status} - ${errorText}`;
      streaming = false;
      return;
    }

    if (!res.body) {
      error = "No response body.";
      streaming = false;
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        buffer.replaceAll("<answer>", "").replaceAll("</answer>", "");
        let lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") {
              if (currentAssistant.trim()) {
                const parsedContent = await parseMarkdown(currentAssistant);
                const assistantMessage = {
                  role: "assistant" as const,
                  content: currentAssistant,
                  timestamp: Date.now(),
                  parsedContent,
                };
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
              currentThought = "";
              return;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.content !== undefined) {
                currentAssistant += data.content;
                currentAssistant = currentAssistant
                  .replaceAll("<answer>\n", "")
                  .replaceAll("</answer>", "")
                  .replaceAll("\\n", "<br>")
                  .replaceAll("\n", "<br>")
                  .trim();
                // Parse markdown for streaming display - handle newlines properly
                currentAssistantParsed = currentAssistant
                  .replaceAll("\\n", "<br>")
                  .replaceAll("\n", "<br>");
              }
              if (data.reasoning !== undefined) {
                currentThought += data.reasoning;
                currentThought = currentThought
                  .replaceAll("<answer>\n", "")
                  .replaceAll("</answer>", "")
                  .trim();
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function parseMarkdown(content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string }; viewing_url?: string }>): Promise<string> {
    if (typeof content === "string") {
      // Replace newlines with <br> tags before parsing markdown
      const textWithBreaks = content.replace("\n", "<br>");
      return await marked(textWithBreaks);
    } else if (Array.isArray(content)) {
      let html = "";
      for (const part of content) {
        if (part.type === "text") {
          html += await marked(part.text.replace("\n", "<br>"));
        } else if (part.type === "image_url") {
          const imgSrc = part.viewing_url || part.image_url.url;
          html += `<img src='${imgSrc}' alt='User uploaded image' class='max-w-xs my-2 rounded shadow' />`;
        }
      }
      return html;
    }
    return "";
  }

  async function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      error = "Only PNG, JPG, and WEBP images are allowed.";
      return;
    }
    uploading = true;
    error = "";
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        error = `Image upload failed: ${res.status}`;
        uploading = false;
        return;
      }
      const data = await res.json();
      modelOptimizedUrl = data.modelOptimized || '';
      viewingOptimizedUrl = data.viewingOptimized || '';
      imageAttached = !!modelOptimizedUrl && !!viewingOptimizedUrl;
      if (imageAttached) {
        imageUploadConfirmation = true;
        setTimeout(() => { imageUploadConfirmation = false; }, 2000);
      }
    } catch (e) {
      error = 'Image upload failed.';
    } finally {
      uploading = false;
    }
  }

  function removeImage() {
    modelOptimizedUrl = "";
    viewingOptimizedUrl = "";
    imageAttached = false;
    imageUploadConfirmation = false;
  }

  function fillWithExample(prompt: string) {
    input = prompt;
    // Focus the textarea
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
    }
  }

  // Helper to determine if the last message is an assistant
  function shouldHideLastAssistant() {
    return streaming && messages.length > 1 && messages[messages.length-1]?.role === 'assistant';
  }
</script>

<div
  class="flex flex-col items-center justify-center relative h-full overflow-hidden"
>
  <section
    class="w-full h-full p-12 max-w-[960px] flex flex-col pb-32 overflow-hidden"
  >
    {#if messages.length === 1}
      <div class="flex flex-1 items-center justify-center h-full">
        <div class="text-center max-w-4xl px-8">
          <h1 class="text-4xl font-bold text-gray-100 mb-4">Welcome to Flicker AI</h1>
          <p class="text-gray-400 text-xl mb-8">Ask anything, and I'll do my best to help!</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {#each examplePrompts as example}
              <button
                class="flex items-center gap-4 bg-[#1e293b] hover:bg-[#334155] rounded-lg border border-gray-700 transition-colors text-left p-6 w-full"
                on:click={() => fillWithExample(example.prompt)}
              >
                <span class="text-3xl">{example.icon}</span>
                <div class="flex-1">
                  <div class="text-gray-100 font-medium text-lg mb-1">{example.title}</div>
                  <div class="text-gray-400 text-sm">{example.prompt}</div>
                </div>
              </button>
            {/each}
          </div>

          <p class="text-gray-500 text-sm">Or start typing your own message below</p>
        </div>
      </div>
    {:else}
      <ul
        class="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
        style="max-height: calc(100vh - 200px);"
      >
        {#each messages.slice(1, shouldHideLastAssistant() ? messages.length-1 : undefined) as msg, i}
          <li
            class="flex gap-3 items-start {msg.role == 'assistant'
              ? 'bg-[#4f46e5]'
              : 'bg-[]'} rounded-lg p-3 border border-[#4f46e5]"
          >
            <div
              class="w-8 h-8 flex items-center justify-center {msg.role !==
              'assistant'
                ? 'hidden'
                : ''}"
            >
              <img src="/flicker2.png" alt="AI" class="w-6 h-6 rounded-md" />
            </div>
            <div class="flex-1">
              <div
                class="text-xs font-medium text-[white] {msg.role !==
                'assistant'
                  ? 'hidden'
                  : ''}"
              >
                Flicker AI
              </div>
              <div
                class="text-xs font-medium text-gray-400 {msg.role !== 'user'
                  ? 'hidden'
                  : ''}"
              >
                You
              </div>
              <div
                class="mt-1 prose prose-invert text-gray-100 leading-relaxed block"
              >
                {#if msg.parsedContent}
                  {@html msg.parsedContent}
                {:else}
                  <div class="whitespace-pre-line">{msg.content}</div>
                {/if}
              </div>
            </div>
          </li>
        {/each}
        {#if streaming && currentAssistantParsed}
          <li
            class="flex gap-3 items-start bg-[#4f46e5] rounded-lg p-3 border border-[#4f46e5]"
          >
            <div
              class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800"
            >
              <img src="/flicker2.png" alt="AI" class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <div class="text-xs font-medium text-[white]">Flicker AI</div>
              <div
                class="mt-1 prose prose-invert text-gray-100 leading-relaxed block"
              >
                {@html currentAssistantParsed}
              </div>
              {#if currentThought}
                <div class="mt-2 text-xs text-gray-400 italic">
                  {currentThought}
                </div>
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
  <div
    class="w-full floating rounded-xl bg-[e6e6ff] border-2 transition-all duration-300 ease-in-out max-w-2xl absolute left-1/2 -translate-x-1/2 bottom-8 z-10 flex flex-col max-h-48"
    class:border-[#545454]={!focused}
    class:hover:border-[#534582]={!focused}
    class:border-[#846DCF]={focused}
  >
    <!-- Image preview and indicator removed -->
    <form class="w-full flex flex-1" on:submit|preventDefault={sendMessage}>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        class="flex-1 rounded-md w-full p-4 focus:outline-none text-gray-100 placeholder:text-gray-400 resize-none overflow-y-auto bg-transparent"
        bind:value={input}
        placeholder="Type your message..."
        rows="1"
        on:keydown={handleKey}
        on:focus={() => {
          focused = true;
        }}
        on:blur={() => {
          focused = false;
        }}
      />
      <div class="p-4 flex gap-2 items-center">
        <label class="cursor-pointer flex items-center">
          <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" on:change={handleImageUpload} />
          <span title="Attach Image" class="hover:bg-[#4338ca] rounded-md p-2 transition-colors">
            <!-- Paperclip SVG icon with white stroke -->
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79V17a5 5 0 01-5 5h-4a5 5 0 01-5-5V7a5 5 0 015-5h4a5 5 0 015 5v7a3 3 0 01-3 3h-4a3 3 0 01-3-3V7" />
            </svg>
          </span>
        </label>
        <button
          type="submit"
          class="w-full bg-[#4f46e5] text-white font-semibold py-3 px-4 rounded-md hover:bg-[#4338ca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={streaming || uploading || (imageAttached ? !input.trim() : !input.trim())}
        >
          Send
        </button>
      </div>
    </form>
  </div>
  {#if imageUploadConfirmation}
    <div class="flex justify-center mt-2">
      <span class="bg-green-100 text-green-800 px-4 py-2 rounded shadow text-sm font-semibold">Image uploaded!</span>
    </div>
  {/if}
</div>

<style>
  main {
    font-family: "Inter", system-ui, sans-serif;
  }

  :global(body) {
    overflow: hidden;
  }

  :global(html) {
    overflow: hidden;
  }
</style>
