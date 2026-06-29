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
    // AudioContext blocked (user hasn't interacted yet) — silent fallback
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const markReadMutation = useMarkNotificationRead();

  const [showPanel, setShowPanel] = useState(false);
  const [popup, setPopup] = useState<PopupNotif | null>(null);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track IDs we have already shown a popup for so we don't repeat
  const shownIds = useRef<Set<number>>(new Set());
  // Track highest ID seen on first load to avoid popups for old notifications
  const initialised = useRef(false);

  const { data } = useGetNotifications({
    query: {
      queryKey: getGetNotificationsQueryKey(),
      enabled: !!user,
      refetchInterval: 12_000,
    },
  });

  const notifications: NotifItem[] = (data as NotifItem[] | undefined) ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!notifications.length) return;

    if (!initialised.current) {
      // Seed shownIds with everything already in the list on first load
      notifications.forEach((n) => shownIds.current.add(n.id));
      initialised.current = true;
      return;
    }

    // Find new unread notifications not yet shown
    const fresh = notifications.filter(
      (n) => !n.isRead && !shownIds.current.has(n.id),
    );
    if (!fresh.length) return;

    // Mark all as seen
    fresh.forEach((n) => shownIds.current.add(n.id));

    // Show the most recent one as a popup
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
