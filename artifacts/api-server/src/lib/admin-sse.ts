import type { Response } from "express";

const clients = new Set<Response>();

export function addAdminClient(res: Response): void {
  clients.add(res);
}

export function removeAdminClient(res: Response): void {
  clients.delete(res);
}

export function broadcastAdminEvent(event: Record<string, unknown>): void {
  const data = JSON.stringify(event);
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}
