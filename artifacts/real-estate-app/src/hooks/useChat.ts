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

export interface CallSignal {
  type: "call_offer" | "call_answer" | "call_reject" | "call_hangup" | "ice_candidate";
  fromId: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

type WsMessage =
  | { type: "online_list"; users: OnlineUser[] }
  | ({ type: "message" } & ChatMsg)
  | { type: "error"; message: string }
  | { type: "settings_update"; chatEnabled: boolean; callingEnabled: boolean }
  | (CallSignal);

export interface ChatSettings {
  chatEnabled: boolean;
  callingEnabled: boolean;
}

interface UseChatReturn {
  onlineUsers: OnlineUser[];
  messages: Record<number, ChatMsg[]>;
  connected: boolean;
  banned: boolean;
  banError: string | null;
  settings: ChatSettings;
  callSignal: CallSignal | null;
  clearCallSignal: () => void;
  sendMessage: (receiverId: number, text: string) => void;
  sendSignal: (type: string, targetId: number, payload?: object) => void;
  loadHistory: (userId: number) => Promise<void>;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export function useChat(): UseChatReturn {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [banned, setBanned] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [messages, setMessages] = useState<Record<number, ChatMsg[]>>({});
  const [settings, setSettings] = useState<ChatSettings>({ chatEnabled: true, callingEnabled: true });
  const [callSignal, setCallSignal] = useState<CallSignal | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/chat/settings`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSettings(data); })
      .catch(() => {});
  }, []);

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
        if (!res.ok) {
          if (res.status === 403) {
            const body = await res.json().catch(() => ({})) as { error?: string };
            setBanned(true);
            setBanError(body.error ?? "You have been banned from the chat feature.");
          }
          return;
        }
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
            } else if (data.type === "error") {
              setBanError(data.message);
            } else if (data.type === "settings_update") {
              setSettings({ chatEnabled: data.chatEnabled, callingEnabled: data.callingEnabled });
            } else if (
              data.type === "call_offer" ||
              data.type === "call_answer" ||
              data.type === "call_reject" ||
              data.type === "call_hangup" ||
              data.type === "ice_candidate"
            ) {
              setCallSignal(data as CallSignal);
            }
          } catch { /* ignore */ }
        });

        ws.addEventListener("close", () => {
          setConnected(false);
          if (!dead && !banned) {
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

  const sendSignal = useCallback((type: string, targetId: number, payload?: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, targetId, ...payload }));
    }
  }, []);

  const clearCallSignal = useCallback(() => setCallSignal(null), []);

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

  return { onlineUsers, messages, connected, banned, banError, settings, callSignal, clearCallSignal, sendMessage, sendSignal, loadHistory };
}
