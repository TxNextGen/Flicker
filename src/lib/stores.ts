import { writable } from 'svelte/store';

export const chatStore = writable({
  refreshChats: false,
  action: null as string | null,
  chatName: null as string | null
});

export function triggerChatRefresh() {
  chatStore.update(store => ({ ...store, refreshChats: !store.refreshChats }));
}

export function triggerChatAction(action: string, chatName?: string) {
  chatStore.update(store => ({ 
    ...store, 
    action, 
    chatName: chatName || null 
  }));
} 