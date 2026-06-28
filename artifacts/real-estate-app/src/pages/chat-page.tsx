import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, MessageCircle, Wifi, WifiOff, X, ShieldOff,
  Phone, PhoneOff, Mic, MicOff, MessageSquareOff, Users, Paperclip,
  Volume2, AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useChat, type OnlineUser, type ChatMsg } from "../hooks/useChat";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

/**
 * Wait until the RTCPeerConnection has finished gathering all ICE candidates.
 * This implements "Vanilla ICE" — the SDP sent to the remote peer already
 * contains every candidate, so no separate ice_candidate signaling is needed.
 * Times out after 6 s and resolves with whatever was gathered so far.
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    const done = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", function handler() {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", handler);
        done();
      }
    });
  });
}

/**
 * Play a silent sound during the user-gesture to pre-unlock the browser's
 * autoplay policy. Without this, audio.play() called later (from ontrack,
 * which fires asynchronously) can be silently blocked on iOS / Android.
 */
async function unlockAudioContext() {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx() as AudioContext;
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    await ctx.resume();
    setTimeout(() => ctx.close(), 500);
  } catch { /* ignore */ }
}

interface AllUser {
  id: number;
  firstName: string;
  surname: string;
  avatar: string;
  chatBanned: boolean;
}

type CallState = "idle" | "ringing_out" | "ringing_in" | "active";

// ─── Helpers ────────────────────────────────────────────────────────────────

function Avatar({ name, avatar, size = 40 }: { name: string; avatar?: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (avatar && (avatar.startsWith("http") || avatar.startsWith("/"))) {
    return <img src={avatar} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  }
  const colors = ["bg-amber-400", "bg-blue-400", "bg-green-400", "bg-pink-400", "bg-purple-400"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`${color} rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none`}>
      {initials}
    </div>
  );
}

function CallTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return <span className="text-white/70 text-sm font-mono tabular-nums">{m}:{s}</span>;
}

// ─── Call UI components ──────────────────────────────────────────────────────

function IncomingCallOverlay({
  caller, onAccept, onReject,
}: { caller: AllUser | OnlineUser; onAccept: () => void; onReject: () => void }) {
  const name = `${caller.firstName} ${caller.surname}`.trim();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 24, stiffness: 300 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm px-6"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div className="w-full bg-gradient-to-b from-slate-800 to-slate-950 rounded-3xl p-8 flex flex-col items-center gap-7 shadow-2xl">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping scale-125" />
          <Avatar name={name} avatar={(caller as AllUser).avatar} size={96} />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-xl tracking-tight">{name}</p>
          <p className="text-white/50 text-sm mt-1 animate-pulse">Incoming voice call…</p>
        </div>
        <div className="flex gap-14 items-end">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg active:scale-90 transition-all"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <span className="text-white/50 text-xs">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg active:scale-90 transition-all ring-4 ring-green-400/40"
            >
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
  peer, startedAt, isMuted, micLabel, speakerLabel, micError, callStatus, onToggleMute, onHangUp,
}: {
  peer: AllUser | OnlineUser;
  startedAt: number;
  isMuted: boolean;
  micLabel: string;
  speakerLabel: string;
  micError: string | null;
  callStatus: "connecting" | "connected" | "failed";
  onToggleMute: () => void;
  onHangUp: () => void;
}) {
  const name = `${peer.firstName} ${peer.surname}`.trim();
  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 to-slate-950 py-16 px-8"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div className="flex flex-col items-center gap-5 w-full">
        <div className="relative">
          <Avatar name={name} avatar={(peer as AllUser).avatar} size={104} />
          <div className={`absolute inset-0 rounded-full border-2 animate-pulse ${callStatus === "connected" ? "border-green-400/60" : callStatus === "failed" ? "border-red-400/60" : "border-amber-400/60"}`} />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-2xl tracking-tight">{name}</p>
          <div className="mt-1">
            {callStatus === "connecting" && (
              <p className="text-amber-400/80 text-sm animate-pulse">Connecting audio…</p>
            )}
            {callStatus === "connected" && <CallTimer startedAt={startedAt} />}
            {callStatus === "failed" && (
              <p className="text-red-400 text-sm">Connection failed</p>
            )}
          </div>
        </div>

        {/* Device status */}
        <div className="w-full max-w-xs bg-white/5 rounded-2xl px-4 py-3 flex flex-col gap-2 mt-1">
          {micError ? (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{micError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <Mic className="w-3.5 h-3.5 shrink-0 text-green-400" />
              <span className="truncate">{micLabel || "Microphone ready"}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <Volume2 className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            <span className="truncate">{speakerLabel || "Speaker ready"}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-12 items-center">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`}
          >
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
          <span className="text-white/40 text-xs">{isMuted ? "Unmute" : "Mute"}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onHangUp}
            className="w-18 h-18 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl active:scale-90 transition-all p-5"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
          <span className="text-white/40 text-xs">End Call</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Chat drawer ─────────────────────────────────────────────────────────────

function AttachmentBubble({ url, name, type, isMine }: { url: string; name: string | null; type: string | null; isMine: boolean }) {
  const isImage = type?.startsWith("image/") ?? false;
  const displayName = name ?? url.split("/").pop() ?? "File";
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt={displayName} className="max-w-[200px] rounded-xl object-cover shadow" style={{ maxHeight: 180 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" download={displayName}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium max-w-[200px] ${isMine ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}>
      <Paperclip className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{displayName}</span>
    </a>
  );
}

function ChatDrawer({
  peer, myId, msgs, onClose, onSend, onCall, callingEnabled,
}: {
  peer: AllUser; myId: number; msgs: ChatMsg[];
  onClose: () => void;
  onSend: (text: string, attachment?: { url: string; name: string; type: string }) => void;
  onCall: () => void; callingEnabled: boolean;
}) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string; previewUrl?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE}/api/chat/upload`, { method: "POST", credentials: "include", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string; name: string; type: string };
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setPendingFile({ url: data.url, name: data.name, type: data.type, previewUrl });
    } catch {
      alert("File upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function clearPendingFile() {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
  }

  function handleSend() {
    const t = text.trim();
    if (!t && !pendingFile) return;
    onSend(t, pendingFile ?? undefined);
    setText("");
    clearPendingFile();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const fullName = `${peer.firstName} ${peer.surname}`.trim();
  const canSend = (text.trim().length > 0 || !!pendingFile) && !uploading;

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white shrink-0">
        <button onClick={onClose} className="p-1 -ml-1 rounded-full active:bg-white/20"><X className="w-5 h-5" /></button>
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2 py-16">
            <MessageCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm">Say hello to {peer.firstName}!</p>
          </div>
        )}
        {msgs.map((m) => {
          const isMine = m.senderId === myId;
          const hasText = m.message && m.message.trim().length > 0;
          const hasAttachment = !!m.attachmentUrl;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-1`}>
              {!isMine && <Avatar name={fullName} avatar={peer.avatar} size={26} />}
              <div className={`flex flex-col gap-1 max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                {hasAttachment && (
                  <div className={`px-2 py-1.5 rounded-2xl shadow-sm ${isMine ? "bg-gradient-to-br from-[#C9973B] to-[#8B5E10] rounded-br-sm" : "bg-white rounded-bl-sm"}`}>
                    <AttachmentBubble url={m.attachmentUrl!} name={m.attachmentName ?? null} type={m.attachmentType ?? null} isMine={isMine} />
                  </div>
                )}
                {hasText && (
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug shadow-sm ${isMine ? "bg-gradient-to-br from-[#C9973B] to-[#8B5E10] text-white rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm"}`}>
                    {m.message}
                  </div>
                )}
                <div className="text-[10px] px-1 text-slate-400">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {(pendingFile || uploading) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t bg-amber-50 px-4 py-2 flex items-center gap-3 shrink-0 overflow-hidden"
          >
            {uploading ? (
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Uploading…</span>
              </div>
            ) : pendingFile ? (
              <>
                {pendingFile.previewUrl
                  ? <img src={pendingFile.previewUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg border shrink-0" />
                  : <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><Paperclip className="w-5 h-5 text-amber-600" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{pendingFile.name}</p>
                  <p className="text-[10px] text-slate-400">Ready to send</p>
                </div>
                <button onClick={clearPendingFile} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X className="w-4 h-4" /></button>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2 px-3 py-3 border-t bg-white shrink-0">
        <input ref={fileInputRef} type="file" className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" onChange={handleFileChange} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 active:scale-95 transition-all disabled:opacity-40 shrink-0" title="Attach file">
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKey}
          placeholder="Type a message…" rows={1}
          className="flex-1 resize-none bg-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 max-h-28" />
        <button onClick={handleSend} disabled={!canSend}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9973B] to-[#8B5E10] flex items-center justify-center text-white shadow active:scale-95 transition-transform disabled:opacity-40 shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { onlineUsers, messages, connected, banned, banError, settings, onCallSignal, sendMessage, sendSignal, loadHistory } = useChat();

  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [activePeer, setActivePeer] = useState<AllUser | null>(null);
  const myId = (user as any)?.id as number;

  // ── Call state ──
  const [callState, setCallState] = useState<CallState>("idle");
  const [callPeer, setCallPeer] = useState<AllUser | OnlineUser | null>(null);
  const [callStartedAt, setCallStartedAt] = useState(0);
  const [callUnavailable, setCallUnavailable] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLabel, setMicLabel] = useState("");
  const [speakerLabel, setSpeakerLabel] = useState("");
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "failed">("connecting");

  // ── WebRTC refs — all mutable, no React state ──
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<{ sdp: RTCSessionDescriptionInit; fromId: number } | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callStateRef = useRef<CallState>("idle");     // mirror of callState for use inside callbacks
  const allUsersRef = useRef<AllUser[]>([]);          // mirror of allUsers for use inside callbacks
  // ICE servers fetched from server (includes TURN for cross-network calls)
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE);

  // Keep refs in sync with state
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);

  // ── Fetch ICE servers (STUN + TURN) from server on mount ──
  useEffect(() => {
    fetch(`${BASE}/api/chat/ice-servers`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { iceServers: RTCIceServer[] } | null) => {
        if (data?.iceServers?.length) {
          iceServersRef.current = data.iceServers;
        }
      })
      .catch(() => { /* keep FALLBACK_ICE */ });
  }, []);

  // ── Load users ──
  useEffect(() => {
    fetch(`${BASE}/api/chat/users`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data: AllUser[]) => setAllUsers(data))
      .catch(() => {});
  }, []);

  const onlineSet = new Set(onlineUsers.map((u) => u.userId));

  // ─── WebRTC helpers ──────────────────────────────────────────────────────

  // ── Proactively check mic permission on mount ──
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (result.state === "denied") {
          setMicError("Microphone access is blocked. Please allow it in your browser settings to make calls.");
        }
        result.onchange = () => {
          if (result.state === "denied") {
            setMicError("Microphone access is blocked. Please allow it in your browser settings to make calls.");
          } else {
            setMicError(null);
          }
        };
      })
      .catch(() => {}); // some browsers don't support this query
  }, []);

  function closePc() {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingIceRef.current = [];   // safe to reset here — call is fully over
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    setIsMuted(false);
    setMicLabel("");
    setSpeakerLabel("");
    setMicError(null);
    setCallStatus("connecting");
  }

  async function createPc(targetId: number): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceCandidatePoolSize: 10,
    });
    pcRef.current = pc;
    // ⚠️ Do NOT reset pendingIceRef here — for the callee, candidates may have
    // already arrived between receiving the offer and tapping Accept, and we
    // need those buffered candidates. pendingIceRef is only reset in closePc().

    // ── Auto-detect and acquire microphone ──────────────────────────────────
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("NotSupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Prefer the default communications device on Windows/Android
          // (falls back silently on platforms that don't support it)
          sampleRate: 48000,
        },
        video: false,
      });
      localStreamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Capture the human-readable mic label for the UI
      const micTrack = stream.getAudioTracks()[0];
      if (micTrack) {
        setMicLabel(micTrack.label || "Default microphone");
        setMicError(null);
      }
    } catch (err: unknown) {
      const name = (err as DOMException)?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError("Microphone permission denied. Tap your browser's address bar to allow mic access.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMicError("No microphone found. Connect a microphone and try again.");
      } else if (name === "NotSupported" || !navigator.mediaDevices) {
        setMicError("Your browser does not support voice calls. Please use Chrome or Safari.");
      } else {
        setMicError("Could not access your microphone. Check your device settings.");
      }
    }

    // ── ICE connection state → update call status indicator ─────────────────
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "connected" || s === "completed") {
        setCallStatus("connected");
        setCallStartedAt(Date.now());
      } else if (s === "failed") {
        setCallStatus("failed");
        setMicError("Audio connection failed. Check your internet connection and try again.");
      } else if (s === "disconnected") {
        // Transient — might recover; don't show error yet
        setCallStatus("connecting");
      }
    };

    // ── Receive remote audio → route to loudspeaker ──────────────────────────
    pc.ontrack = (ev) => {
      const audio = remoteAudioRef.current;
      if (!audio) return;
      const stream = ev.streams[0] ?? new MediaStream([ev.track]);
      audio.srcObject = stream;

      // Try to route to speaker on Chrome/Android (setSinkId not on iOS/Firefox)
      if (typeof (audio as any).setSinkId === "function") {
        navigator.mediaDevices.enumerateDevices()
          .then((devices) => {
            const speaker = devices.find(
              (d) => d.kind === "audiooutput" &&
                     /speaker|headphone|earphone|output|default/i.test(d.label)
            ) ?? devices.find((d) => d.kind === "audiooutput");
            return (audio as any).setSinkId(speaker?.deviceId ?? "").then(() => {
              setSpeakerLabel(speaker?.label || "Default speaker");
            });
          })
          .catch(() => { setSpeakerLabel("Default speaker"); });
      } else {
        setSpeakerLabel("System speaker");
      }

      // The AudioContext was unlocked during the user gesture (Accept/Start call),
      // so this play() call will succeed even though it's async.
      audio.play().catch(() => setTimeout(() => audio.play().catch(() => {}), 300));
    };

    return pc;
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }

  // ─── hangUp — defined with useCallback so it can be used in signal handler ─

  const hangUp = useCallback((targetId?: number) => {
    if (targetId !== undefined) sendSignal("call_hangup", targetId);
    closePc();
    pendingOfferRef.current = null;
    setCallState("idle");
    setCallPeer(null);
    setCallUnavailable(false);
  }, [sendSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Register call signal handler (direct callback — no React state batching) ─

  useEffect(() => {
    const unsub = onCallSignal((signal) => {
      switch (signal.type) {
        case "call_offer": {
          // Only accept if not already in a call
          if (callStateRef.current !== "idle") break;

          const caller = allUsersRef.current.find((u) => u.id === signal.fromId) ?? null;
          if (!caller) {
            // Unknown caller — auto-reject
            sendSignal("call_reject", signal.fromId);
            break;
          }

          // Store offer so answerCall can use it without race conditions
          pendingOfferRef.current = { sdp: signal.sdp!, fromId: signal.fromId };
          setCallPeer(caller);
          setCallState("ringing_in");
          break;
        }

        case "call_answer": {
          if (callStateRef.current !== "ringing_out") break;
          if (!pcRef.current || !signal.sdp) break;

          if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }

          // The answer SDP already contains all callee ICE candidates (Vanilla ICE),
          // so setRemoteDescription immediately triggers ICE connectivity checks.
          // No separate pendingIce flushing needed.
          pcRef.current
            .setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              setCallState("active");
              // callStartedAt / callStatus updated by oniceconnectionstatechange
            })
            .catch((e) => {
              console.warn("[WebRTC] setRemoteDescription (answer) failed:", e);
              hangUp();
            });
          break;
        }

        case "call_reject": {
          closePc();
          pendingOfferRef.current = null;
          setCallState("idle");
          setCallUnavailable(true);
          setCallPeer(null);
          break;
        }

        case "call_hangup": {
          closePc();
          pendingOfferRef.current = null;
          setCallState("idle");
          setCallPeer(null);
          break;
        }

        case "ice_candidate": {
          // Add directly to PC — no React state, no batching delay
          if (!signal.candidate) break;
          if (pcRef.current?.remoteDescription) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            pendingIceRef.current.push(signal.candidate);
          }
          break;
        }
      }
    });

    return unsub;
  }, [onCallSignal, sendSignal, hangUp]);

  // ─── Outgoing call ───────────────────────────────────────────────────────

  async function startCall(peer: AllUser) {
    if (callState !== "idle") return;

    // Unlock the browser's autoplay gate NOW, during this user gesture,
    // so audio.play() succeeds later when ontrack fires asynchronously.
    await unlockAudioContext();

    setCallUnavailable(false);
    setCallPeer(peer);
    setCallState("ringing_out");

    const pc = await createPc(peer.id);
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);

    // ── Vanilla ICE: wait until all candidates are gathered ──────────────────
    // The SDP we send will already contain every host, srflx, and relay
    // candidate. The callee doesn't need separate ice_candidate messages at all,
    // which eliminates the entire candidate-timing race condition.
    await waitForIceGathering(pc);

    sendSignal("call_offer", peer.id, { sdp: pc.localDescription });

    callTimeoutRef.current = setTimeout(() => {
      closePc();
      setCallState("idle");
      setCallPeer(null);
      setCallUnavailable(true);
    }, 30_000);
  }

  // ─── Answer incoming call ────────────────────────────────────────────────

  async function answerCall() {
    const pending = pendingOfferRef.current;
    if (!pending || !pending.sdp) return;

    // Unlock autoplay during this user gesture (Accept button tap).
    await unlockAudioContext();

    const callerId = pending.fromId;
    pendingOfferRef.current = null;   // consumed

    const pc = await createPc(callerId);

    try {
      // The offer already has all caller ICE candidates embedded (Vanilla ICE).
      await pc.setRemoteDescription(new RTCSessionDescription(pending.sdp));

      // Any trickle-ICE candidates that arrived before setRemoteDescription:
      for (const c of pendingIceRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      pendingIceRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // ── Vanilla ICE: wait until all our candidates are gathered ───────────
      await waitForIceGathering(pc);

      sendSignal("call_answer", callerId, { sdp: pc.localDescription });
      setCallState("active");
      // callStartedAt and callStatus are set by oniceconnectionstatechange
    } catch (e) {
      console.warn("[WebRTC] answerCall failed:", e);
      sendSignal("call_reject", callerId);
      closePc();
      setCallState("idle");
      setCallPeer(null);
    }
  }

  // ─── Reject incoming call ────────────────────────────────────────────────

  function rejectCall() {
    const pending = pendingOfferRef.current;
    if (pending) sendSignal("call_reject", pending.fromId);
    pendingOfferRef.current = null;
    closePc();
    setCallState("idle");
    setCallPeer(null);
  }

  // ─── Chat ────────────────────────────────────────────────────────────────

  async function openChat(peer: AllUser) {
    setActivePeer(peer);
    await loadHistory(peer.id);
  }

  function handleSend(text: string, attachment?: { url: string; name: string; type: string }) {
    if (!activePeer) return;
    sendMessage(activePeer.id, text, attachment);
  }

  const activeMsgs = activePeer ? (messages[activePeer.id] ?? []) : [];

  // ─── Banned screen ───────────────────────────────────────────────────────

  if (banned) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
        <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white">
          <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-full active:bg-white/20"><ArrowLeft className="w-5 h-5" /></button>
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

  // ─── Main UI ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>

      {/* Hidden <audio> receives the remote WebRTC track */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-full active:bg-white/20"><ArrowLeft className="w-5 h-5" /></button>
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
                <motion.div key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
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
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>
                    )}
                    {settings.callingEnabled && (
                      <button onClick={() => startCall(u)} disabled={callState !== "idle"}
                        title={isOnline ? "Voice call" : "User is offline — call may not connect"}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${isOnline ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-slate-100 text-slate-400"}`}>
                        <Phone className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openChat(u)} title="Open chat"
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 active:scale-90 transition-all">
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
            peer={activePeer} myId={myId} msgs={activeMsgs}
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
            micLabel={micLabel}
            speakerLabel={speakerLabel}
            micError={micError}
            callStatus={callStatus}
            onToggleMute={toggleMute}
            onHangUp={() => {
              const id = (callPeer as AllUser).id ?? (callPeer as OnlineUser).userId;
              hangUp(id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Outgoing ringing bar */}
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
              className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center active:scale-90 transition-transform"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
