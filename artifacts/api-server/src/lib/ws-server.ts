import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { logger } from "./logger";
import { createAndPushNotification } from "./push";

interface OnlineUser {
  ws: WebSocket;
  userId: number;
  firstName: string;
  surname: string;
  avatar: string;
}

const onlineUsers = new Map<number, OnlineUser>();
export const chatTokens = new Map<string, number>();

function getOnlineList() {
  return Array.from(onlineUsers.values()).map(({ userId, firstName, surname, avatar }) => ({
    userId,
    firstName,
    surname,
    avatar,
  }));
}

function broadcastOnlineList() {
  const payload = JSON.stringify({ type: "online_list", users: getOnlineList() });
  for (const { ws } of onlineUsers.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function broadcastToAll(payload: object) {
  const data = JSON.stringify(payload);
  for (const { ws } of onlineUsers.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function sendToUser(userId: number, payload: object) {
  const target = onlineUsers.get(userId);
  if (target?.ws.readyState === WebSocket.OPEN) {
    target.ws.send(JSON.stringify(payload));
  }
}

const SIGNAL_TYPES = new Set(["call_offer", "call_answer", "call_reject", "call_hangup", "ice_candidate"]);

export function setupWsServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", async (ws, req) => {
    const rawUrl = req.url ?? "";
    let token: string | null = null;
    try {
      const url = new URL(rawUrl, "http://localhost");
      token = url.searchParams.get("token");
    } catch {
      ws.close(4001, "Bad request");
      return;
    }

    if (!token || !chatTokens.has(token)) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const userId = chatTokens.get(token)!;
    chatTokens.delete(token);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      ws.close(4001, "User not found");
      return;
    }

    onlineUsers.set(userId, {
      ws,
      userId,
      firstName: user.firstName,
      surname: user.surname,
      avatar: user.avatar,
    });

    ws.send(JSON.stringify({ type: "online_list", users: getOnlineList() }));
    broadcastOnlineList();

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          type: string;
          receiverId?: number;
          targetId?: number;
          message?: string;
          attachmentUrl?: string;
          attachmentName?: string;
          attachmentType?: string;
          sdp?: { type: string; sdp?: string };
          candidate?: object;
        };

        if (msg.type === "message" && msg.receiverId && (msg.message?.trim() || msg.attachmentUrl)) {
          const [fresh] = await db.select({ chatBanned: usersTable.chatBanned }).from(usersTable).where(eq(usersTable.id, userId));
          if (fresh?.chatBanned) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "error", message: "You have been banned from the chat feature." }));
            }
            return;
          }

          const [saved] = await db
            .insert(chatMessagesTable)
            .values({
              senderId: userId,
              receiverId: msg.receiverId,
              message: msg.message?.trim() ?? "",
              attachmentUrl: msg.attachmentUrl ?? null,
              attachmentName: msg.attachmentName ?? null,
              attachmentType: msg.attachmentType ?? null,
            })
            .returning();

          const outbound = JSON.stringify({
            type: "message",
            id: saved.id,
            senderId: saved.senderId,
            receiverId: saved.receiverId,
            message: saved.message,
            attachmentUrl: saved.attachmentUrl,
            attachmentName: saved.attachmentName,
            attachmentType: saved.attachmentType,
            createdAt: saved.createdAt,
            senderFirstName: user.firstName,
            senderSurname: user.surname,
            senderAvatar: user.avatar,
          });

          const receiver = onlineUsers.get(msg.receiverId);
          if (receiver?.ws.readyState === WebSocket.OPEN) {
            receiver.ws.send(outbound);
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(outbound);
          }

          // Create a DB notification + send Web Push (for background/minimized devices)
          const notifTitle = `${user.firstName} ${user.surname}`;
          const notifMessage = msg.message?.trim()
            ? msg.message.trim().slice(0, 120)
            : "Sent you an attachment";
          await createAndPushNotification(msg.receiverId, notifTitle, notifMessage, "/chat");
          sendToUser(msg.receiverId, {
            type: "notification",
            title: notifTitle,
            message: notifMessage,
          });
        }

        if (SIGNAL_TYPES.has(msg.type) && msg.targetId) {
          const target = onlineUsers.get(msg.targetId);
          if (target?.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({ ...msg, fromId: userId }));
          }
        }
      } catch (e) {
        logger.error({ err: e }, "WS message parse error");
      }
    });

    const cleanup = () => {
      onlineUsers.delete(userId);
      broadcastOnlineList();
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  return wss;
}
