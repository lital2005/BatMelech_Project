export const CHAT_MESSAGE_MAX = 2000;

/** Enter = שורה חדשה; Ctrl/Cmd+Enter = שליחה */
export function handleComposerKeyDown(e, onSend) {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    onSend();
  }
}

export function resizeComposerTextarea(el, maxPx = 280) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
}
