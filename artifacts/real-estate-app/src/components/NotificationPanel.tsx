import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, BellOff, Check, ImageIcon, Trash2 } from "lucide-react";
import { useNotifications, type NotifItem } from "@/contexts/NotificationContext";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ImageModal({ notif, onClose }: { notif: NotifItem; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
          className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image */}
          <img
            src={notif.imageUrl}
            alt={notif.title}
            className="w-full object-contain max-h-72"
          />

          {/* Content */}
          <div className="px-5 py-4">
            <p className="font-bold text-slate-800 text-base leading-tight">{notif.title}</p>
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">{notif.message}</p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function NotifRow({
  notif,
  onRead,
  onDelete,
  onViewImage,
}: {
  notif: NotifItem;
  onRead: (id: number) => void;
  onDelete: (id: number, isBroadcast: boolean) => void;
  onViewImage: (n: NotifItem) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 px-4 py-3 border-b border-amber-100/60 transition-colors ${
        notif.isRead ? "opacity-60" : "bg-amber-50/60"
      }`}
    >
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? "bg-transparent" : "bg-amber-500"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${notif.isRead ? "font-medium text-slate-600" : "font-bold text-slate-800"}`}>
          {notif.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>

        {/* Image thumbnail — tap to view */}
        {notif.imageUrl && (
          <button
            onClick={() => onViewImage(notif)}
            className="mt-2 flex items-center gap-1.5 group"
          >
            <img
              src={notif.imageUrl}
              alt=""
              className="w-16 h-12 object-cover rounded-lg border border-amber-200 group-active:scale-95 transition-transform"
            />
            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
              <ImageIcon className="w-3 h-3" />
              View image
            </span>
          </button>
        )}

        <p className="text-[10px] text-amber-600 mt-1">{timeAgo(notif.createdAt)}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!notif.isRead && (
          <button
            onClick={() => onRead(notif.id)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id, notif.isBroadcast)}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
          title="Delete notification"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function NotificationPanel() {
  const { showPanel, setShowPanel, notifications, markRead, deleteNotif } = useNotifications();
  const [viewingImage, setViewingImage] = useState<NotifItem | null>(null);

  return (
    <>
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300]"
              onClick={() => setShowPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed top-0 left-0 right-0 z-[301] mx-auto bg-white rounded-b-3xl shadow-2xl border-b border-amber-100 overflow-hidden"
              style={{ maxWidth: 430 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-white">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-slate-800 text-base">Notifications</span>
                  {notifications.filter((n) => !n.isRead).length > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {notifications.filter((n) => !n.isRead).length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <BellOff className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No notifications yet</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {notifications.map((n) => (
                      <NotifRow
                        key={n.id}
                        notif={n}
                        onRead={markRead}
                        onDelete={deleteNotif}
                        onViewImage={(notif) => {
                          setViewingImage(notif);
                          setShowPanel(false);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full image viewer modal */}
      {viewingImage && (
        <ImageModal notif={viewingImage} onClose={() => setViewingImage(null)} />
      )}
    </>
  );
}
