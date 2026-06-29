import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const POLL_INTERVAL = 20_000;

let globalCount = 0;
const listeners = new Set<(n: number) => void>();

function notify(n: number) {
  globalCount = n;
  listeners.forEach((fn) => fn(n));
}

/** Fetch badge count from server and broadcast to all hook instances. */
async function fetchBadge() {
  try {
    const res = await fetch(`${BASE}/api/chat/badge`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json() as { unread: number };
    notify(data.unread);
  } catch { /* ignore */ }
}

/** Mark all chat notifications as read on the server and reset badge. */
async function clearBadgeRemote() {
  try {
    await fetch(`${BASE}/api/chat/clear-badge`, {
      method: "POST",
      credentials: "include",
    });
    notify(0);
  } catch { /* ignore */ }
}

/**
 * App-wide chat badge hook. Every mounted instance shares the same count
 * via a simple module-level pub/sub (no context needed).
 *
 * - `chatBadge`  — current unread count (messages + missed calls)
 * - `clearBadge` — call on entering chat; marks server records read & resets count
 * - `refetch`    — manually re-poll the server
 */
export function useChatBadge() {
  const { user } = useAuth();
  const [chatBadge, setChatBadge] = useState(globalCount);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = (n: number) => setChatBadge(n);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchBadge();
    timerRef.current = setInterval(fetchBadge, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  const clearBadge = useCallback(() => {
    clearBadgeRemote();
  }, []);

  const refetch = useCallback(() => {
    fetchBadge();
  }, []);

  return { chatBadge, clearBadge, refetch };
}
