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
      title: "Creative Writing",
      subtitle: "Stories, poems, and creative content",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>`,
      prompt: "Write a short story about a robot learning to paint",
      gradient: "from-purple-500/20 to-violet-500/20",
      hoverGradient: "hover:from-purple-500/30 hover:to-violet-500/30",
      borderColor: "border-purple-500/30",
      hoverBorderColor: "hover:border-purple-500/50"
    },
    {
      title: "Code Assistant",
      subtitle: "Debug, explain, and write code",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>`,
      prompt: "Help me debug this JavaScript function",
       gradient: "from-purple-500/20 to-violet-500/20",
      hoverGradient: "hover:from-purple-500/30 hover:to-violet-500/30",
      borderColor: "border-purple-500/30",
      hoverBorderColor: "hover:border-purple-500/50"
    },
    {
      title: "Explain Concepts",
      subtitle: "Learn about complex topics simply",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <path d="m12 17 .01 0"/>
      </svg>`,
      prompt: "Explain quantum computing in simple terms",
      gradient: "from-purple-500/20 to-violet-500/20",
      hoverGradient: "hover:from-purple-500/30 hover:to-violet-500/30",
      borderColor: "border-purple-500/30",
      hoverBorderColor: "hover:border-purple-500/50"
    },
    {
      title: "Analysis & Research",
      subtitle: "Deep insights and comprehensive analysis",
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>`,
      prompt: "Analyze the impact of AI on modern society",
      gradient: "from-purple-500/20 to-violet-500/20",
      hoverGradient: "hover:from-purple-500/30 hover:to-violet-500/30",
      borderColor: "border-purple-500/30",
      hoverBorderColor: "hover:border-purple-500/50"
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

  // Auto-resize textarea
  function autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="flex flex-col items-center justify-center relative h-full overflow-hidden bg-gradient-to-br from-gray-900 via-purple-950 to-violet-950">
  <section class="w-full h-full p-4 max-w-4xl flex flex-col pb-32 overflow-hidden">
    {#if messages.length === 1}
      <!-- Welcome Screen -->
      <div class="flex flex-1 items-center justify-center h-full">
        <div class="text-center max-w-4xl px-4 animate-fade-in">
          <!-- Hero Section -->
          <div class="mb-8">
            <h1 class="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-violet-300 bg-clip-text text-transparent flex items-center justify-center gap-3">
              Welcome to 
              <img src="/logo.webp" alt="Flicker Logo" class="h-10 w-10 -mt-1 drop-shadow-2xl" />
              <span class="-ml-3">licker AI</span>
            </h1>
            <p class="text-base text-gray-300 mb-3 font-light">Your intelligent AI assistant for any task</p>
            <p class="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
              Get help with writing, coding, analysis, creative projects, and more. 
              Just ask, and I'll provide thoughtful responses tailored to your needs.
            </p>
          </div>

          <!-- Example Prompts Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {#each examplePrompts as example}
              <button
                class="group relative bg-gradient-to-br {example.gradient} backdrop-blur-md border {example.borderColor} {example.hoverBorderColor} {example.hoverGradient} rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20"
                on:click={() => fillWithExample(example.prompt)}
              >
                <!-- Background glow effect -->
                <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <!-- Content -->
                <div class="relative flex items-start gap-3">
                  <div class="p-2 rounded-lg bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 group-hover:scale-110 transition-transform duration-300">
                    <div class="text-purple-300 group-hover:text-purple-200 transition-colors duration-300">
                      {@html example.icon}
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-base font-semibold text-white mb-1 group-hover:text-gray-100 transition-colors duration-300">
                      {example.title}
                    </h3>
                    <p class="text-xs text-gray-400 mb-2 group-hover:text-gray-300 transition-colors duration-300">
                      {example.subtitle}
                    </p>
                    <p class="text-xs text-gray-300 group-hover:text-gray-200 transition-colors duration-300 line-clamp-2">
                      "{example.prompt}"
                    </p>
                  </div>
                  <div class="text-purple-400 group-hover:text-purple-300 transition-all duration-300 transform group-hover:translate-x-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor" class="w-3 h-3">
                      <path d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
                    </svg>
                  </div>
                </div>
              </button>
            {/each}
          </div>

          <!-- Call to action -->
          <div class="text-center">
            <p class="text-gray-300 text-base mb-1">Ready to get started?</p>
            <p class="text-gray-400 text-sm">Type your message in the chat box below</p>
          </div>
        </div>
      </div>
    {:else}
      <!-- Chat Messages -->
      <ul class="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scroll-smooth" style="max-height: calc(100vh - 200px);">
        {#each messages.slice(1, shouldHideLastAssistant() ? messages.length-1 : undefined) as msg, i}
          <li class="flex gap-3 items-start animate-message-in">
            {#if msg.role === "assistant"}
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                <img src="/flicker2.png" alt="AI" class="w-5 h-5 rounded-full" />
              </div>
              <div class="flex-1 bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-md border border-purple-500/20 rounded-xl p-3 max-w-3xl">
                <div class="text-xs font-medium text-purple-300 mb-2">Flicker AI</div>
                <div class="prose prose-sm prose-invert text-gray-100 leading-relaxed max-w-none">
                  {#if msg.parsedContent}
                    {@html msg.parsedContent}
                  {:else}
                    <div class="whitespace-pre-line text-sm">{msg.content}</div>
                  {/if}
                </div>
              </div>
            {:else}
              <div class="flex-1 flex justify-end">
                <div class="max-w-3xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 backdrop-blur-md border border-purple-500/30 rounded-xl p-3">
                  <div class="text-xs font-medium text-purple-300 mb-2 text-right">You</div>
                  <div class="prose prose-sm prose-invert text-gray-100 leading-relaxed max-w-none">
                    {#if msg.parsedContent}
                      {@html msg.parsedContent}
                    {:else}
                      <div class="whitespace-pre-line text-sm">{msg.content}</div>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            {/if}
          </li>
        {/each}
        
        <!-- Streaming Message -->
        {#if streaming && currentAssistantParsed}
          <li class="flex gap-3 items-start animate-message-in">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg animate-pulse">
              <img src="/flicker2.png" alt="AI" class="w-5 h-5 rounded-full" />
            </div>
            <div class="flex-1 bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-md border border-purple-500/20 rounded-xl p-3 max-w-3xl">
              <div class="text-xs font-medium text-purple-300 mb-2 flex items-center gap-2">
                Flicker AI
                <div class="flex space-x-1">
                  <div class="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
                  <div class="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
              </div>
              <div class="prose prose-sm prose-invert text-gray-100 leading-relaxed max-w-none">
                {@html currentAssistantParsed}
                <span class="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1"></span>
              </div>
              {#if currentThought}
                <div class="mt-2 text-xs text-gray-400 italic border-l-2 border-gray-600 pl-2">
                  💭 {currentThought}
                </div>
              {/if}
            </div>
          </li>
        {/if}
      </ul>
    {/if}

    <!-- Error Display -->
    {#if error}
      <div class="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-md">
        <div class="flex items-center gap-2 text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span class="text-sm font-medium">{error}</span>
        </div>
      </div>
    {/if}
  </section>

  <!-- Enhanced Floating Chat Input -->
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
    <div class="relative">
      <!-- Image attachment preview -->
      {#if imageAttached}
        <div class="mb-2 flex items-center gap-2 bg-gradient-to-r from-gray-800/90 to-purple-900/90 backdrop-blur-md border border-purple-500/30 rounded-lg p-2">
          <div class="flex-shrink-0">
            <img src={viewingOptimizedUrl} alt="Attached image" class="w-8 h-8 rounded object-cover shadow-lg" />
          </div>
          <div class="flex-1 text-xs text-gray-300">
            <div class="font-medium">Image attached</div>
            <div class="text-xs text-gray-400">Ready to send</div>
          </div>
          <button
            class="flex-shrink-0 p-1 hover:bg-red-500/20 rounded transition-colors duration-200"
            on:click={removeImage}
            title="Remove image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      {/if}

      <!-- Main input container -->
      <form
        class="bg-gradient-to-r from-gray-800/90 to-purple-900/90 backdrop-blur-md border transition-all duration-300 ease-in-out rounded-xl shadow-xl flex flex-col overflow-hidden {focused ? 'border-purple-400/60 shadow-purple-500/20' : 'border-purple-500/30 hover:border-purple-500/50'}"
        on:submit|preventDefault={sendMessage}
      >
        <div class="flex items-end gap-2 p-3">
          <!-- File upload button -->
          <label class="flex-shrink-0 cursor-pointer group">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              on:change={handleImageUpload}
              disabled={uploading}
            />
            <div class="p-2 rounded-lg bg-gray-700/50 hover:bg-purple-500/30 transition-all duration-200 group-hover:scale-110 {uploading ? 'animate-pulse' : ''}" title="Attach Image">
              {#if uploading}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-300 animate-spin">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300 group-hover:text-purple-300 transition-colors duration-200">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              {/if}
            </div>
          </label>

          <!-- Text input -->
          <textarea
            class="flex-1 bg-transparent text-gray-100 placeholder-gray-400 resize-none border-none outline-none py-2 px-2 max-h-24 min-h-[20px] leading-5 text-sm"
            bind:value={input}
            placeholder={streaming ? "Please wait for the current response to finish..." : "Type your message..."}
            rows="1"
            disabled={streaming}
            on:keydown={handleKey}
            on:input={autoResize}
            on:focus={() => { focused = true; }}
            on:blur={() => { focused = false; }}
          />

          <!-- Send button -->
          <button
            type="submit"
            class="flex-shrink-0 p-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed group transform hover:scale-105 disabled:hover:scale-100"
            disabled={streaming || uploading || (!input.trim() && !imageAttached)}
          >
            {#if streaming}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse">
                <rect width="3" height="11" x="2" y="9" rx="1"/>
                <rect width="3" height="7" x="8" y="13" rx="1"/>
                <rect width="3" height="16" x="14" y="4" rx="1"/>
                <rect width="3" height="13" x="20" y="7" rx="1"/>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
                <path d="m5 12 7-7 7 7"/>
                <path d="M12 19V5"/>
              </svg>
            {/if}
          </button>
        </div>

        <!-- Helper text -->
        {#if !streaming}
          <div class="px-3 pb-2 text-xs text-gray-400 flex items-center justify-between">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {#if input.length > 0}
              <span class="text-purple-400">{input.length} chars</span>
            {/if}
          </div>
        {/if}
      </form>
    </div>
  </div>

  <!-- Success notification -->
  {#if imageUploadConfirmation}
    <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div class="bg-gradient-to-r from-emerald-500/90 to-green-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-xl border border-emerald-400/30">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <span class="font-medium text-sm">Image uploaded successfully!</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  * {
    font-family: "Inter", system-ui, sans-serif;
  }

  :global(body) {
    font-family: "Inter", system-ui, sans-serif;
    overflow: hidden;
  }

  :global(html) {
    font-family: "Inter", system-ui, sans-serif;
    overflow: hidden;
  }

  /* Custom scrollbar */
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

  /* Animations */
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes message-in {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.8s ease-out;
  }

  .animate-message-in {
    animation: message-in 0.4s ease-out;
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  /* Line clamp utility */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Prose styling improvements */
  :global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) {
    color: #e5e7eb;
    font-weight: 600;
  }

  :global(.prose p) {
    color: #d1d5db;
    line-height: 1.7;
  }

  :global(.prose code) {
    background-color: rgba(99, 102, 241, 0.1);
    color: #c4b5fd;
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
    font-size: 0.875em;
  }

  :global(.prose pre) {
    background-color: rgba(17, 24, 39, 0.8);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 0.75rem;
  }

  :global(.prose pre code) {
    background: none;
    padding: 0;
    color: #e5e7eb;
  }

  :global(.prose blockquote) {
    border-left-color: rgba(168, 85, 247, 0.5);
    color: #d1d5db;
    background-color: rgba(168, 85, 247, 0.05);
    padding: 1rem;
    border-radius: 0.5rem;
  }

  :global(.prose ul, .prose ol) {
    color: #d1d5db;
  }

  :global(.prose li) {
    color: #d1d5db;
  }
</style>