import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

export interface OnlineUser {
  userId: number;
  firstName: string;
  surname: string;
  avatar: string;
}

export interface ChatMsg {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  createdAt: string;
  senderFirstName: string;
  senderSurname: string;
  senderAvatar: string;
}

type WsMessage =
  | { type: "online_list"; users: OnlineUser[] }
  | ({ type: "message" } & ChatMsg);

interface UseChatReturn {
  onlineUsers: OnlineUser[];
  messages: Record<number, ChatMsg[]>;
  connected: boolean;
  sendMessage: (receiverId: number, text: string) => void;
  loadHistory: (userId: number) => Promise<void>;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export function useChat(): UseChatReturn {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [messages, setMessages] = useState<Record<number, ChatMsg[]>>({});

  const addMessage = useCallback((msg: ChatMsg) => {
    const peerId = msg.senderId === (user as any)?.id ? msg.receiverId : msg.senderId;
    setMessages((prev) => ({
      ...prev,
      [peerId]: [...(prev[peerId] ?? []), msg],
    }));
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let ws: WebSocket | null = null;
    let dead = false;

    async function connect() {
      try {
        const res = await fetch(`${BASE}/api/chat/token`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return;
        const { token } = await res.json() as { token: string };

        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${proto}//${window.location.host}${BASE}/api/ws?token=${token}`;

        ws = new WebSocket(url);
        wsRef.current = ws;

        ws.addEventListener("open", () => {
          if (!dead) setConnected(true);
        });

        ws.addEventListener("message", (ev) => {
          try {
            const data = JSON.parse(ev.data as string) as WsMessage;
            if (data.type === "online_list") {
              setOnlineUsers(data.users.filter((u) => u.userId !== (user as any)?.id));
            } else if (data.type === "message") {
              addMessage(data);
            }
          } catch { /* ignore */ }
        });

        ws.addEventListener("close", () => {
          setConnected(false);
          if (!dead) {
            setTimeout(connect, 3000);
          }
        });

        ws.addEventListener("error", () => {
          ws?.close();
        });
      } catch { /* ignore */ }
    }

    connect();

    return () => {
      dead = true;
      ws?.close();
      wsRef.current = null;
      setConnected(false);
      setOnlineUsers([]);
    };
  }, [user, addMessage]);

  const sendMessage = useCallback((receiverId: number, text: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "message", receiverId, message: text }));
    }
  }, []);

  const loadHistory = useCallback(async (userId: number) => {
    try {
      const res = await fetch(`${BASE}/api/chat/history/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const history = await res.json() as ChatMsg[];
      setMessages((prev) => ({ ...prev, [userId]: history }));
    } catch { /* ignore */ }
  }, []);

  return { onlineUsers, messages, connected, sendMessage, loadHistory };
}
