import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MessageCircle, Wifi, WifiOff, X, ShieldOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useChat, type OnlineUser, type ChatMsg } from "../hooks/useChat";

function Avatar({ name, avatar, size = 40 }: { name: string; avatar?: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  const colors = ["bg-amber-400", "bg-blue-400", "bg-green-400", "bg-pink-400", "bg-purple-400"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
    >
      {initials}
    </div>
  );
}

function ChatDrawer({
  peer,
  myId,
  msgs,
  onClose,
  onSend,
}: {
  peer: OnlineUser;
  myId: number;
  msgs: ChatMsg[];
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function handleSend() {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const fullName = `${peer.firstName} ${peer.surname}`.trim();

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white shrink-0">
        <button onClick={onClose} className="p-1 -ml-1 rounded-full active:bg-white/20">
          <X className="w-5 h-5" />
        </button>
        <Avatar name={fullName} avatar={peer.avatar} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{fullName}</p>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-white/80">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-slate-50">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2 py-16">
            <MessageCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm">Say hello to {peer.firstName}!</p>
          </div>
        )}
        {msgs.map((m) => {
          const isMine = m.senderId === myId;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              {!isMine && (
                <Avatar name={fullName} avatar={peer.avatar} size={28} />
              )}
              <div
                className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-snug shadow-sm mx-1 ${
                  isMine
                    ? "bg-gradient-to-br from-[#C9973B] to-[#8B5E10] text-white rounded-br-sm"
                    : "bg-white text-slate-800 rounded-bl-sm"
                }`}
              >
                {m.message}
                <div className={`text-[10px] mt-0.5 ${isMine ? "text-white/60" : "text-slate-400"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 px-3 py-3 border-t bg-white shrink-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none bg-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 max-h-28"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9973B] to-[#8B5E10] flex items-center justify-center text-white shadow active:scale-95 transition-transform disabled:opacity-40 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { onlineUsers, messages, connected, banned, banError, sendMessage, loadHistory } = useChat();
  const [activePeer, setActivePeer] = useState<OnlineUser | null>(null);
  const myId = (user as any)?.id as number;

  async function openChat(peer: OnlineUser) {
    setActivePeer(peer);
    await loadHistory(peer.userId);
  }

  function handleSend(text: string) {
    if (!activePeer) return;
    sendMessage(activePeer.userId, text);
  }

  const activeMsgs = activePeer ? (messages[activePeer.userId] ?? []) : [];

  if (banned) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
        <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white">
          <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-full active:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-base">Chat Users</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">Chat Access Suspended</p>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              {banError ?? "You have been banned from the chat feature. Please contact support for assistance."}
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="mt-2 px-6 py-2.5 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-2xl text-sm font-semibold active:scale-95 transition-transform"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-full active:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-base leading-tight">Chat Users</h1>
          <p className="text-white/70 text-xs">
            {onlineUsers.length} online now
          </p>
        </div>
        {connected ? (
          <Wifi className="w-4 h-4 text-green-300" />
        ) : (
          <WifiOff className="w-4 h-4 text-white/40" />
        )}
      </div>

      <div className="flex-1 px-4 py-4">
        {!connected && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-xl mb-4">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Connecting to chat…</span>
          </div>
        )}

        {onlineUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center text-slate-400 gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 opacity-40" />
            </div>
            <p className="font-semibold text-slate-500">No users online</p>
            <p className="text-sm">Other users will appear here when they open the app.</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Online Users
            </p>
            {onlineUsers.map((u) => {
              const name = `${u.firstName} ${u.surname}`.trim();
              const unread = (messages[u.userId] ?? []).filter(
                (m) => m.senderId === u.userId,
              ).length;
              return (
                <motion.button
                  key={u.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => openChat(u)}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform text-left"
                >
                  <div className="relative">
                    <Avatar name={name} avatar={u.avatar} size={44} />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                    <p className="text-xs text-green-500 font-medium">● Online</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                    <MessageCircle className="w-4 h-4 text-slate-300" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activePeer && (
          <ChatDrawer
            peer={activePeer}
            myId={myId}
            msgs={activeMsgs}
            onClose={() => setActivePeer(null)}
            onSend={handleSend}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
