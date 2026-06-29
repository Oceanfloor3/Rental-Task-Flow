import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useGetNotifications, useMarkNotificationRead, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

export interface NotifItem {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  isBroadcast: boolean;
  createdAt: string;
  imageUrl?: string;
}

interface PopupNotif {
  id: number;
  title: string;
  message: string;
}

interface NotificationCtx {
  unreadCount: number;
  notifications: NotifItem[];
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
  markRead: (id: number) => void;
  popup: PopupNotif | null;
}

const Ctx = createContext<NotificationCtx>({
  unreadCount: 0,
  notifications: [],
  showPanel: false,
  setShowPanel: () => {},
  markRead: () => {},
  popup: null,
});

// VAPID public key — safe to expose to the client
const VAPID_PUBLIC_KEY =
  "BNn43EPwqt4cIGBxlN3bD5QhVUib5_f3JLYM-r4v6B5Ah8WF7nlCiaAy_TEmP-3T6YbWkdZelW-0pmBvZ0yVbAU";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    // Register subscription with our API
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
      credentials: "include",
    });
  } catch {
    // Permission denied or push not supported — silent
  }
}

function playChime() {
  try {
    const ac = new AudioContext();
    const notes = [880, 1100, 1320];
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ac.destination);
      const t = ac.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch {
    // AudioContext not available
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const markReadMutation = useMarkNotificationRead();

  const [showPanel, setShowPanel] = useState(false);
  const [popup, setPopup] = useState<PopupNotif | null>(null);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownIds = useRef<Set<number>>(new Set());
  const initialised = useRef(false);
  const pushSubscribed = useRef(false);

  const { data } = useGetNotifications({
    query: {
      queryKey: getGetNotificationsQueryKey(),
      enabled: !!user,
      refetchInterval: 12_000,
    },
  });

  const notifications: NotifItem[] = (data as NotifItem[] | undefined) ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Subscribe to Web Push once user is logged in
  useEffect(() => {
    if (!user || pushSubscribed.current) return;
    pushSubscribed.current = true;
    subscribeToPush();
  }, [user]);

  useEffect(() => {
    if (!notifications.length) return;

    if (!initialised.current) {
      notifications.forEach((n) => shownIds.current.add(n.id));
      initialised.current = true;
      return;
    }

    const fresh = notifications.filter(
      (n) => !n.isRead && !shownIds.current.has(n.id),
    );
    if (!fresh.length) return;

    fresh.forEach((n) => shownIds.current.add(n.id));

    const latest = fresh[fresh.length - 1]!;
    playChime();
    setPopup({ id: latest.id, title: latest.title, message: latest.message });
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => setPopup(null), 5000);
  }, [notifications]);

  const markRead = useCallback(
    (id: number) => {
      markReadMutation.mutate(
        { id },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
          },
        },
      );
    },
    [markReadMutation, qc],
  );

  return (
    <Ctx.Provider value={{ unreadCount, notifications, showPanel, setShowPanel, markRead, popup }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  return useContext(Ctx);
}
