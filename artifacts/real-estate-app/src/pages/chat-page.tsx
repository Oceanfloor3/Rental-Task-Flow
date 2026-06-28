import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, MessageCircle, Wifi, WifiOff, X, ShieldOff,
  Phone, PhoneOff, Mic, MicOff, MessageSquareOff, Users,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useChat, type OnlineUser, type ChatMsg } from "../hooks/useChat";

const STUN: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface AllUser {
  id: number;
  firstName: string;
  surname: string;
  avatar: string;
  chatBanned: boolean;
}

type CallState = "idle" | "ringing_out" | "ringing_in" | "active";

function Avatar({ name, avatar, size = 40 }: { name: string; avatar?: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (avatar && (avatar.startsWith("http") || avatar.startsWith("/"))) {
    return <img src={avatar} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  }
  const colors = ["bg-amber-400", "bg-blue-400", "bg-green-400", "bg-pink-400", "bg-purple-400"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function CallTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return <span className="text-white/70 text-sm font-mono tabular-nums">{m}:{s}</span>;
}

function IncomingCallOverlay({
  caller, onAccept, onReject,
}: { caller: AllUser | OnlineUser; onAccept: () => void; onReject: () => void }) {
  const name = `${caller.firstName} ${caller.surname}`.trim();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div className="w-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl">
        <div className="relative">
          <Avatar name={name} avatar={(caller as AllUser).avatar} size={96} />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500" />
          </span>
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-xl">{name}</p>
          <p className="text-white/50 text-sm mt-1 animate-pulse">Incoming voice call…</p>
        </div>
        <div className="flex gap-12">
          <div className="flex flex-col items-center gap-2">
            <button onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <span className="text-white/50 text-xs">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <Phone className="w-7 h-7 text-white" />
            </button>
            <span className="text-white/50 text-xs">Accept</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActiveCallScreen({
  peer, startedAt, isMuted, onToggleMute, onHangUp,
}: {
  peer: AllUser | OnlineUser;
  startedAt: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
}) {
  const name = `${peer.firstName} ${peer.surname}`.trim();
  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 to-slate-950 py-20 px-8"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div className="flex flex-col items-center gap-5">
        <Avatar name={name} avatar={(peer as AllUser).avatar} size={104} />
        <div className="text-center">
          <p className="text-white font-bold text-2xl tracking-tight">{name}</p>
          <div className="mt-1.5"><CallTimer startedAt={startedAt} /></div>
        </div>
      </div>
      <div className="flex gap-12 items-center">
        <div className="flex flex-col items-center gap-2">
          <button onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${isMuted ? "bg-red-500/90 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`}>
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
          <span className="text-white/40 text-xs">{isMuted ? "Unmute" : "Mute"}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={onHangUp}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl active:scale-95 transition-transform">
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
          <span className="text-white/40 text-xs">End Call</span>
        </div>
      </div>
    </motion.div>
  );
}

function ChatDrawer({
  peer, myId, msgs, onClose, onSend, onCall, callingEnabled,
}: {
  peer: AllUser; myId: number; msgs: ChatMsg[];
  onClose: () => void; onSend: (text: string) => void;
  onCall: () => void; callingEnabled: boolean;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function handleSend() {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const fullName = `${peer.firstName} ${peer.surname}`.trim();

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
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
        </div>
        {callingEnabled && (
          <button onClick={onCall} className="p-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors" title="Voice call">
            <Phone className="w-5 h-5" />
          </button>
        )}
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
              {!isMine && <Avatar name={fullName} avatar={peer.avatar} size={28} />}
              <div className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-snug shadow-sm mx-1 ${isMine ? "bg-gradient-to-br from-[#C9973B] to-[#8B5E10] text-white rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm"}`}>
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
          value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKey}
          placeholder="Type a message…" rows={1}
          className="flex-1 resize-none bg-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 max-h-28"
        />
        <button
          onClick={handleSend} disabled={!text.trim()}
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
  const {
    onlineUsers, messages, connected, banned, banError,
    settings, callSignal, clearCallSignal,
    sendMessage, sendSignal, loadHistory,
  } = useChat();

  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [activePeer, setActivePeer] = useState<AllUser | null>(null);
  const myId = (user as any)?.id as number;

  const [callState, setCallState] = useState<CallState>("idle");
  const [callPeer, setCallPeer] = useState<AllUser | OnlineUser | null>(null);
  const [callStartedAt, setCallStartedAt] = useState(0);
  const [callUnavailable, setCallUnavailable] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // These refs are owned by ChatPage — shared across the call lifecycle
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/chat/users`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: AllUser[]) => setAllUsers(data))
      .catch(() => {});
  }, []);

  const onlineSet = new Set(onlineUsers.map((u) => u.userId));

  // ─── WebRTC helpers ────────────────────────────────────────────────────────

  function closePc() {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    setIsMuted(false);
  }

  async function createPc(targetId: number): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(STUN);
    pcRef.current = pc;
    pendingIceRef.current = [];

    // Get microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    } catch (err) {
      console.warn("Mic access denied:", err);
    }

    // Send ICE candidates to the remote peer
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sendSignal("ice_candidate", targetId, { candidate: candidate.toJSON() });
      }
    };

    // Play remote audio through the hidden <audio> element in DOM
    pc.ontrack = (ev) => {
      const audio = remoteAudioRef.current;
      if (audio) {
        audio.srcObject = ev.streams[0];
        audio.play().catch(() => {});
      }
    };

    return pc;
  }

  function toggleMute() {
    // Toggle tracks on the peer connection's actual stream
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }

  const hangUp = useCallback((targetId?: number) => {
    if (targetId !== undefined) {
      sendSignal("call_hangup", targetId);
    }
    closePc();
    setCallState("idle");
    setCallPeer(null);
    setCallUnavailable(false);
    clearCallSignal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal, clearCallSignal]);

  // ─── Start outgoing call ───────────────────────────────────────────────────

  async function startCall(peer: AllUser) {
    if (callState !== "idle") return;
    setCallUnavailable(false);
    setCallPeer(peer);
    setCallState("ringing_out");

    const pc = await createPc(peer.id);

    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    sendSignal("call_offer", peer.id, { sdp: pc.localDescription });

    // 30-second ring timeout
    callTimeoutRef.current = setTimeout(() => {
      setCallUnavailable(true);
      closePc();
      setCallState("idle");
      setCallPeer(null);
    }, 30_000);
  }

  // ─── Answer incoming call ──────────────────────────────────────────────────

  async function answerCall() {
    const signal = callSignal;
    if (!signal || signal.type !== "call_offer" || !signal.sdp) return;

    const callerId = signal.fromId;
    clearCallSignal();

    const pc = await createPc(callerId); // ICE candidates go back to caller

    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

    // Flush buffered ICE candidates that arrived before the offer was processed
    for (const c of pendingIceRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    pendingIceRef.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal("call_answer", callerId, { sdp: pc.localDescription });

    setCallStartedAt(Date.now());
    setCallState("active");
  }

  // ─── Reject incoming call ──────────────────────────────────────────────────

  function rejectCall() {
    const fromId = callSignal?.fromId;
    clearCallSignal();
    if (fromId !== undefined) sendSignal("call_reject", fromId);
    closePc();
    setCallState("idle");
    setCallPeer(null);
  }

  // ─── Handle signals from the other side ───────────────────────────────────

  useEffect(() => {
    if (!callSignal) return;

    switch (callSignal.type) {
      case "call_offer": {
        if (callState === "idle") {
          const caller =
            allUsers.find((u) => u.id === callSignal.fromId) ??
            onlineUsers.find((u) => u.userId === callSignal.fromId) ??
            null;
          if (caller) {
            setCallPeer(caller);
            setCallState("ringing_in");
          } else {
            // Unknown caller — auto-reject
            sendSignal("call_reject", callSignal.fromId);
            clearCallSignal();
          }
        }
        break;
      }
      case "call_answer": {
        if (callState === "ringing_out" && pcRef.current && callSignal.sdp) {
          if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
          pcRef.current
            .setRemoteDescription(new RTCSessionDescription(callSignal.sdp))
            .then(async () => {
              // Flush buffered ICE candidates
              for (const c of pendingIceRef.current) {
                await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
              pendingIceRef.current = [];
              setCallStartedAt(Date.now());
              setCallState("active");
              clearCallSignal();
            })
            .catch(() => { hangUp(); });
        }
        break;
      }
      case "call_reject":
      case "call_hangup": {
        hangUp();
        break;
      }
      case "ice_candidate": {
        if (callSignal.candidate) {
          if (pcRef.current?.remoteDescription) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(callSignal.candidate)).catch(() => {});
          } else {
            pendingIceRef.current.push(callSignal.candidate);
          }
        }
        clearCallSignal();
        break;
      }
    }
  }, [callSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Chat ──────────────────────────────────────────────────────────────────

  async function openChat(peer: AllUser) {
    setActivePeer(peer);
    await loadHistory(peer.id);
  }

  function handleSend(text: string) {
    if (!activePeer) return;
    sendMessage(activePeer.id, text);
  }

  const activeMsgs = activePeer ? (messages[activePeer.id] ?? []) : [];

  // ─── Banned screen ─────────────────────────────────────────────────────────

  if (banned) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
        <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white">
          <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-full active:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-base">Chat</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">Chat Access Suspended</p>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">{banError ?? "You have been banned from the chat feature."}</p>
          </div>
          <button onClick={() => navigate("/")} className="mt-2 px-6 py-2.5 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-2xl text-sm font-semibold active:scale-95 transition-transform">
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  // ─── Main UI ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      {/* Hidden audio element — receives remote track and plays automatically */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-full active:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-base leading-tight">Chat & Calls</h1>
          <p className="text-white/70 text-xs">{onlineUsers.length > 0 ? `${onlineUsers.length} online` : "No one online yet"}</p>
        </div>
        {connected ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-white/40" />}
      </div>

      <div className="flex-1 px-4 py-4">
        {!connected && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-xl mb-4">
            <WifiOff className="w-3.5 h-3.5 shrink-0" /><span>Connecting to chat server…</span>
          </div>
        )}

        {callUnavailable && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl mb-4">
            <PhoneOff className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">User is unavailable right now. Try again later.</span>
            <button onClick={() => setCallUnavailable(false)}><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}

        {!settings.chatEnabled ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <MessageSquareOff className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600">Chat Unavailable</p>
            <p className="text-sm text-slate-400">The chat feature is temporarily disabled.</p>
          </div>
        ) : allUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400 gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Users className="w-8 h-8 opacity-40" />
            </div>
            <p className="font-semibold text-slate-500">No other users yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Members</p>
            {allUsers.map((u) => {
              const name = `${u.firstName} ${u.surname}`.trim();
              const isOnline = onlineSet.has(u.id);
              const unreadCount = (messages[u.id] ?? []).filter((m) => m.senderId === u.id).length;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100"
                >
                  {/* Tap anywhere on the left to open chat */}
                  <button className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98] transition-transform" onClick={() => openChat(u)}>
                    <div className="relative shrink-0">
                      <Avatar name={name} avatar={u.avatar} size={44} />
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-green-400" : "bg-slate-300"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                      <p className={`text-xs font-medium ${isOnline ? "text-green-500" : "text-slate-400"}`}>
                        {isOnline ? "● Online" : "○ Offline"}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                    {settings.callingEnabled && (
                      <button
                        onClick={() => startCall(u)}
                        disabled={callState !== "idle"}
                        title={isOnline ? "Voice call" : "User is offline"}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isOnline ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-slate-100 text-slate-400"}`}
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openChat(u)}
                      title="Open chat"
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 active:scale-95 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat drawer */}
      <AnimatePresence>
        {activePeer && callState === "idle" && (
          <ChatDrawer
            peer={activePeer}
            myId={myId}
            msgs={activeMsgs}
            onClose={() => setActivePeer(null)}
            onSend={handleSend}
            onCall={() => startCall(activePeer)}
            callingEnabled={settings.callingEnabled}
          />
        )}
      </AnimatePresence>

      {/* Incoming call overlay */}
      <AnimatePresence>
        {callState === "ringing_in" && callPeer && (
          <IncomingCallOverlay caller={callPeer} onAccept={answerCall} onReject={rejectCall} />
        )}
      </AnimatePresence>

      {/* Active call screen */}
      <AnimatePresence>
        {callState === "active" && callPeer && (
          <ActiveCallScreen
            peer={callPeer}
            startedAt={callStartedAt}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onHangUp={() => {
              const id = (callPeer as AllUser).id ?? (callPeer as OnlineUser).userId;
              hangUp(id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Outgoing call ringing bar */}
      <AnimatePresence>
        {callState === "ringing_out" && callPeer && (
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[90] mx-auto bg-slate-900 border-t border-slate-700 px-5 py-4 flex items-center gap-4"
            style={{ maxWidth: 430 }}
          >
            <div className="relative shrink-0">
              <Avatar name={`${callPeer.firstName} ${callPeer.surname}`} avatar={(callPeer as AllUser).avatar} size={44} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{callPeer.firstName} {callPeer.surname}</p>
              <p className="text-white/50 text-xs animate-pulse">Ringing…</p>
            </div>
            <button
              onClick={() => {
                const id = (callPeer as AllUser).id ?? (callPeer as OnlineUser).userId;
                hangUp(id);
              }}
              className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center active:scale-95 transition-transform"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
